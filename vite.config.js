import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { handleApi } from "./worker/api.js";
import { handleMongoApi } from "./server/mongo-api.js";

function envForBackend(raw) {
  return {
    MONGODB_URI: raw.MONGODB_URI,
    MONGODB_DB_NAME: raw.MONGODB_DB_NAME,
    AUTH_AUTO_CONFIRM: raw.AUTH_AUTO_CONFIRM,
    handleApi: raw.handleApi,
    SUPABASE_URL: raw.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: raw.SUPABASE_SERVICE_ROLE_KEY,
    RAZORPAY_KEY_ID: raw.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: raw.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: raw.RAZORPAY_WEBHOOK_SECRET,
    BAILEYS_BRIDGE_URL: raw.BAILEYS_BRIDGE_URL,
    BAILEYS_BRIDGE_TOKEN: raw.BAILEYS_BRIDGE_TOKEN,
    WHATSAPP_ACCESS_TOKEN: raw.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: raw.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_ALERT_TO: raw.WHATSAPP_ALERT_TO,
    WHATSAPP_TEMPLATE_NAME: raw.WHATSAPP_TEMPLATE_NAME,
    WHATSAPP_TEMPLATE_LANGUAGE: raw.WHATSAPP_TEMPLATE_LANGUAGE,
    WHATSAPP_API_VERSION: raw.WHATSAPP_API_VERSION,
    RESEND_API_KEY: raw.RESEND_API_KEY,
    SMS_PROVIDER_API_KEY: raw.SMS_PROVIDER_API_KEY,
  };
}

function requestHeaders(headers) {
  const normalized = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) normalized.append(key, item);
    } else if (value !== undefined) {
      normalized.set(key, String(value));
    }
  }
  return normalized;
}

async function requestBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  return await new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      resolve(body.length ? body : undefined);
    });
    req.on("error", reject);
  });
}

async function handleApiRequest(req, res, env) {
  if (!req.url?.startsWith("/api/")) return false;
  const origin = `http://${req.headers.host || "localhost:5173"}`;
  const body = await requestBody(req);
  const request = new Request(new URL(req.url, origin), {
    method: req.method || "GET",
    headers: requestHeaders(req.headers),
    body,
  });
  const mongoPaths = new Set(["/api/health", "/api/auth/register", "/api/auth/login", "/api/auth/logout", "/api/auth/session", "/api/account"]);
  const handler = env.MONGODB_URI && mongoPaths.has(new URL(request.url).pathname) ? handleMongoApi : (env.handleApi || handleApi);
  const response = await handler(request, env);
  res.statusCode = response.status;
  res.statusMessage = response.statusText;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (req.method === "HEAD") {
    res.end();
    return true;
  }
  res.end(Buffer.from(await response.arrayBuffer()));
  return true;
}

function localApiPlugin(rawEnv) {
  const env = envForBackend(rawEnv);
  const middleware = async (req, res, next) => {
    try {
      if (!await handleApiRequest(req, res, env)) next();
    } catch (error) {
      next(error);
    }
  };
  return {
    name: "local-api-middleware",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    define: { __OLC_USE_MONGO_AUTH__: JSON.stringify(Boolean(env.MONGODB_URI)) },
    plugins: [react(), localApiPlugin({ ...env, handleApi: env.MONGODB_URI ? handleMongoApi : handleApi })],
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
    },
    preview: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true,
    },
  };
});
