import { handleApi } from "./api.js";

function secure(response, request) {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(self)");
  headers.set("x-frame-options", "SAMEORIGIN");
  if (headers.get("content-type")?.includes("text/html")) {
    headers.set("cache-control", "no-cache, no-store, must-revalidate");
  }
  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env);

    // Serve the SPA shell directly for client-side routes. The asset binding can
    // otherwise redirect extensionless paths (for example /store) to `/`, which
    // makes a refresh or shared deep link lose its destination.
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    const isSpaNavigation =
      (request.method === "GET" || request.method === "HEAD") &&
      acceptsHtml &&
      !url.pathname.split("/").at(-1)?.includes(".");

    if (isSpaNavigation && url.pathname !== "/") {
      const rootRequest = new Request(new URL("/", request.url), request);
      const rootResponse = await env.ASSETS.fetch(rootRequest);
      if (rootResponse.status !== 404) return secure(rootResponse, request);

      // Keep a compatibility fallback for asset adapters that expose index.html
      // directly instead of resolving the root path.
      const indexRequest = new Request(new URL("/index.html", request.url), request);
      return secure(await env.ASSETS.fetch(indexRequest), request);
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return secure(response, request);

    if (!acceptsHtml) return secure(response, request);

    const indexRequest = new Request(new URL("/index.html", request.url), request);
    return secure(await env.ASSETS.fetch(indexRequest), request);
  },
};

export default worker;
