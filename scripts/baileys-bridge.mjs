import http from "node:http";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "..");
const authDir = process.env.BAILEYS_AUTH_DIR
  ? path.resolve(process.cwd(), process.env.BAILEYS_AUTH_DIR)
  : path.join(workspaceRoot, ".baileys-auth");
const host = process.env.BAILEYS_BRIDGE_HOST || "127.0.0.1";
const port = Number.parseInt(process.env.BAILEYS_BRIDGE_PORT || "8788", 10);
const bridgeToken = process.env.BAILEYS_BRIDGE_TOKEN || "";
const log = pino({ name: "baileys-bridge", level: process.env.BAILEYS_LOG_LEVEL || "info" });

let socket;
let ready = false;
let lastQr = "";
let lastError = "";

function normalizeIndianDigits(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 11 || digits.length > 15) {
    throw new Error("Recipient mobile number must contain 10 to 15 digits including country code.");
  }
  return digits;
}

function jidFromNumber(value) {
  return `${normalizeIndianDigits(value)}@s.whatsapp.net`;
}

function messageFromTemplate(template, data) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => String(data[key] ?? ""));
}

function registrationMessage(data) {
  const template = process.env.BAILEYS_REGISTRATION_TEMPLATE
    || "Hi {{name}}, thank you for registering with One Life Circle. Your Member ID is {{memberId}} and your selected plan is {{plan}}. Our team will guide you on the next steps shortly.";
  return messageFromTemplate(template, data).trim();
}

async function connectToWhatsApp() {
  await mkdir(authDir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  socket = makeWASocket({
    auth: state,
    logger: pino({ level: process.env.BAILEYS_SOCKET_LOG_LEVEL || "silent" }),
    markOnlineOnConnect: false,
    browser: ["One Life Circle", "Chrome", "1.0.0"],
  });

  socket.ev.on("creds.update", saveCreds);
  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      lastQr = qr;
      log.info("Scan the QR below in WhatsApp Linked Devices.");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") {
      ready = true;
      lastQr = "";
      lastError = "";
      log.info("WhatsApp bridge connected.");
    }
    if (connection === "close") {
      ready = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      lastError = String(lastDisconnect?.error?.message || "Connection closed.");
      log.warn({ statusCode, shouldReconnect }, "WhatsApp bridge disconnected.");
      if (shouldReconnect) {
        await connectToWhatsApp();
      } else {
        log.error("WhatsApp session logged out. Delete .baileys-auth and run the bridge again to re-link.");
      }
    }
  });
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

function writeJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function authorized(req) {
  if (!bridgeToken) return true;
  const header = req.headers.authorization || "";
  return header === `Bearer ${bridgeToken}`;
}

async function handleSendRegistration(req, res) {
  if (!authorized(req)) return writeJson(res, 401, { ok: false, error: "Unauthorized." });
  if (!ready || !socket) return writeJson(res, 503, { ok: false, error: "WhatsApp bridge is not connected yet." });

  try {
    const payload = await readJson(req);
    const to = normalizeIndianDigits(payload.to);
    const message = registrationMessage({
      name: payload.name || "Member",
      memberId: payload.memberId || "Pending",
      plan: payload.plan || "membership",
    });
    const result = await socket.sendMessage(jidFromNumber(to), { text: message });
    return writeJson(res, 200, { ok: true, id: result?.key?.id || "" });
  } catch (error) {
    return writeJson(res, 400, { ok: false, error: String(error?.message || error) });
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return writeJson(res, 404, { ok: false, error: "Not found." });
  if (req.method === "GET" && req.url === "/health") {
    return writeJson(res, 200, {
      ok: true,
      ready,
      qrPending: Boolean(lastQr),
      authDir,
      lastError,
    });
  }
  if (req.method === "POST" && req.url === "/send-registration") {
    return handleSendRegistration(req, res);
  }
  return writeJson(res, 404, { ok: false, error: "Not found." });
});

await connectToWhatsApp();
server.listen(port, host, () => {
  log.info(`Baileys bridge listening on http://${host}:${port}`);
});
