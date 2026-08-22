const encoder = new TextEncoder();

export class ApiError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export function cleanText(value, maxLength = 200) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function normalizeEmail(value) {
  return cleanText(value, 254).toLowerCase();
}

export function normalizeMobile(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validMobile(value) {
  return /^\d{10,15}$/.test(value);
}

export function validatePassword(value) {
  const password = String(value ?? "");
  if (password.length < 10) return "Use at least 10 characters.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "Include an uppercase letter, a lowercase letter and a number.";
  }
  return "";
}

const MEMBER_TOKEN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function memberRandomToken(length = 3) {
  let token = "";

  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * MEMBER_TOKEN_ALPHABET.length);
    token += MEMBER_TOKEN_ALPHABET[randomIndex];
  }

  return token;
}

export function buildMemberId(token, numericId, date = new Date()) {
  const year = String(date.getUTCFullYear()).slice(-2);
  return `OLC-${String(token).toUpperCase()}-${year}-${String(numericId).padStart(6, "0")}`;
}

export function randomHex(bytes = 32) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return [...data].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(String(value)));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function derivePassword(password, saltHex, iterations = 210000) {
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map((part) => Number.parseInt(part, 16)));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  );
  return [...new Uint8Array(bits)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqual(left, right) {
  const a = String(left);
  const b = String(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

export async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function parseCookies(request) {
  return Object.fromEntries(
    (request.headers.get("cookie") || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index < 0 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function sessionCookieName(requestUrl) {
  if (!requestUrl) return "__Host-olc_session";
  const url = typeof requestUrl === "string" ? new URL(requestUrl) : requestUrl;
  return url.protocol === "https:" ? "__Host-olc_session" : "olc_session";
}

export function sessionCookie(token, maxAge = 60 * 60 * 24 * 7, requestUrl = undefined) {
  const url = requestUrl ? (typeof requestUrl === "string" ? new URL(requestUrl) : requestUrl) : null;
  const secure = !url || url.protocol === "https:";
  const secureFlag = secure ? "; Secure" : "";
  return `${sessionCookieName(url)}=${encodeURIComponent(token)}; Path=/; HttpOnly${secureFlag}; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(requestUrl = undefined) {
  const url = requestUrl ? (typeof requestUrl === "string" ? new URL(requestUrl) : requestUrl) : null;
  const secure = !url || url.protocol === "https:";
  const secureFlag = secure ? "; Secure" : "";
  const primary = `${sessionCookieName(url)}=; Path=/; HttpOnly${secureFlag}; SameSite=Lax; Max-Age=0`;
  if (url && url.protocol !== "https:") {
    return `${primary}, __Host-olc_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  }
  return primary;
}

export function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (new URL(origin).origin !== new URL(request.url).origin) {
    throw new ApiError(403, "INVALID_ORIGIN", "This request could not be verified.");
  }
}

export async function readJson(request, maxBytes = 64_000) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxBytes) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "The submitted form is too large.");
  const text = await request.text();
  if (text.length > maxBytes) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "The submitted form is too large.");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The request could not be read.");
  }
}

export function publicMember(member) {
  const planName = member.plan_id ? `${member.plan_id[0].toUpperCase()}${member.plan_id.slice(1)}` : "Member";
  const statusLabel = member.status === "active" ? "Active" : member.status === "pending_payment" ? "Payment pending" : "Inactive";
  const initials = cleanText(member.full_name, 120)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "OL";
  return {
    memberId: member.member_id,
    name: member.full_name,
    initials,
    email: member.email,
    mobile: member.mobile,
    city: member.city,
    locality: member.locality,
    primaryInterest: member.primary_interest || "",
    planId: member.plan_id,
    plan: `${planName} Member`,
    status: member.status,
    statusLabel,
    issuedAt: member.issued_at,
    validUntil: member.valid_until,
    verificationToken: member.verification_token,
    canAccessStore: member.status === "active",
  };
}

export function formatDateLabel(value) {
  if (!value) return "Activates after payment";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(value));
}
