const API_BASE = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export class ApiRequestError extends Error {
  constructor(message, { code = "REQUEST_FAILED", details, status = 0 } = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set("content-type", "application/json");
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers,
    body: options.body && !(options.body instanceof FormData) && typeof options.body !== "string"
      ? JSON.stringify(options.body)
      : options.body,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok === false) {
    const error = payload?.error || {};
    throw new ApiRequestError(error.message || "The request could not be completed.", {
      code: error.code,
      details: error.details,
      status: response.status,
    });
  }
  return payload;
}

export function formDataObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function readableApiError(error, fallback = "Something went wrong. Please try again.") {
  if (error instanceof ApiRequestError) return error.message;
  return fallback;
}
