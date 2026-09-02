import http from "node:http";
import { handleMongoApi } from "./mongo-api.js";

const port = Number(process.env.PORT || 3000);
const env = process.env;

function requestHeaders(headers) {
  const normalized = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) value.forEach((item) => normalized.append(key, item));
    else if (value !== undefined) normalized.set(key, String(value));
  }
  return normalized;
}

async function bodyFrom(req) {
  if (["GET", "HEAD"].includes(req.method || "GET")) return undefined;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

function corsHeaders(origin) {
  if (!origin || origin !== env.FRONTEND_ORIGIN) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    vary: "Origin",
  };
}

http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const cors = corsHeaders(origin);
  if (req.method === "OPTIONS") {
    res.writeHead(origin && !cors["access-control-allow-origin"] ? 403 : 204, cors);
    res.end();
    return;
  }
  try {
    const request = new Request(`https://${req.headers.host}${req.url}`, { method: req.method, headers: requestHeaders(req.headers), body: await bodyFrom(req) });
    const response = await handleMongoApi(request, { ...env, FRONTEND_ORIGIN: env.FRONTEND_ORIGIN });
    res.writeHead(response.status, { ...Object.fromEntries(response.headers), ...cors });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500, { "content-type": "application/json", ...cors });
    res.end(JSON.stringify({ ok: false, error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } }));
  }
}).listen(port, "0.0.0.0");
