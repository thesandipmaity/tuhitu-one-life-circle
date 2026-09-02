import { MongoClient } from "mongodb";
import {
  ApiError,
  buildMemberId,
  cleanText,
  clearSessionCookie,
  derivePassword,
  json,
  memberRandomToken,
  normalizeEmail,
  normalizeMobile,
  parseCookies,
  publicMember,
  randomHex,
  readJson,
  sessionCookie,
  timingSafeEqual,
  validEmail,
  validMobile,
  validatePassword,
} from "../worker/security.js";

let clientPromise;

function apiErrorResponse(error) {
  const status = error instanceof ApiError ? error.status : 500;
  const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
  const message = error instanceof ApiError ? error.message : "The request could not be completed.";
  return json({ ok: false, error: { code, message, details: error.details } }, status);
}

async function database(env) {
  if (!env.MONGODB_URI) throw new ApiError(503, "DATABASE_NOT_CONFIGURED", "MongoDB is not configured. Add MONGODB_URI to .env.local.");
  clientPromise ||= new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 8_000 }).connect();
  const client = await clientPromise;
  const db = client.db(env.MONGODB_DB_NAME || "one_life_circle");
  await Promise.all([
    db.collection("members").createIndex({ email_normalized: 1 }, { unique: true }),
    db.collection("members").createIndex({ member_id: 1 }, { unique: true }),
    db.collection("members").createIndex({ mobile_normalized: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ token: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }),
  ]);
  return db;
}

function memberIdParts(fullName) {
  return cleanText(fullName, 120).split(" ").filter(Boolean).slice(0, 3).map((part) => part[0]).join("").toUpperCase().padEnd(3, "X");
}

function validateRegistration(payload) {
  const fullName = cleanText(payload.fullName, 120);
  const email = normalizeEmail(payload.email);
  const mobile = cleanText(payload.mobile, 24);
  const mobileNormalized = normalizeMobile(mobile);
  const city = cleanText(payload.city, 80);
  const planId = cleanText(payload.planId || "community", 20).toLowerCase();
  const password = String(payload.password || "");
  const details = {};
  if (fullName.length < 2) details.fullName = "Enter your full name.";
  if (!validEmail(email)) details.email = "Enter a valid email address.";
  if (!validMobile(mobileNormalized)) details.mobile = "Enter a valid mobile number.";
  if (city.length < 2) details.city = "Enter your city.";
  if (!new Set(["community", "classic", "premium"]).has(planId)) details.planId = "Select a membership plan.";
  const passwordError = validatePassword(password);
  if (passwordError) details.password = passwordError;
  if (!payload.consent) details.consent = "Consent is required to register.";
  if (Object.keys(details).length) throw new ApiError(400, "VALIDATION_FAILED", "Please correct the highlighted fields.", details);
  return { fullName, email, mobile, mobileNormalized, city, locality: cleanText(payload.locality || payload.area, 120), planId, password };
}

async function sessionMember(db, request, required = false) {
  const token = parseCookies(request).olc_session;
  if (!token) {
    if (required) throw new ApiError(401, "AUTH_REQUIRED", "Please log in to continue.");
    return null;
  }
  const session = await db.collection("sessions").findOne({ token, expires_at: { $gt: new Date() } });
  if (!session) {
    if (required) throw new ApiError(401, "AUTH_REQUIRED", "Please log in to continue.");
    return null;
  }
  const member = await db.collection("members").findOne({ _id: session.member_id });
  if (!member && required) throw new ApiError(401, "AUTH_REQUIRED", "Please log in to continue.");
  return member;
}

async function createSession(db, member, request, remember) {
  const token = `ses_${randomHex(32)}`;
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  await db.collection("sessions").insertOne({ token, member_id: member._id, expires_at: new Date(Date.now() + maxAge * 1000), created_at: new Date() });
  return { cookie: sessionCookie(token, maxAge, request.url) };
}

async function register(env, request) {
  const db = await database(env);
  const input = validateRegistration(await readJson(request));
  const existing = await db.collection("members").findOne({ $or: [{ email_normalized: input.email }, { mobile_normalized: input.mobileNormalized }] });
  if (existing) throw new ApiError(409, "ACCOUNT_EXISTS", "This registration already exists. Please log in or recover access.");
  const counter = await db.collection("counters").findOneAndUpdate({ _id: "member_sequence" }, { $inc: { value: 1 } }, { upsert: true, returnDocument: "after" });
  // MongoDB driver v6 returns the document directly, while older versions wrap it in `value`.
  const sequence = Number(counter?.value?.value ?? counter?.value ?? 1);
  const salt = randomHex(16);
  const password_hash = await derivePassword(input.password, salt);
  const now = new Date();
  const member = {
    member_id: buildMemberId(memberIdParts(input.fullName) || memberRandomToken(), sequence),
    full_name: input.fullName,
    email: input.email,
    email_normalized: input.email,
    mobile: input.mobile,
    mobile_normalized: input.mobileNormalized,
    city: input.city,
    locality: input.locality,
    plan_id: input.planId,
    status: "pending_payment",
    password_hash,
    password_salt: salt,
    password_iterations: 210000,
    email_verified: env.AUTH_AUTO_CONFIRM === "true",
    verification_token: `vfy_${randomHex(24)}`,
    issued_at: now.toISOString(),
    created_at: now,
    updated_at: now,
  };
  await db.collection("members").insertOne(member);
  const session = await createSession(db, member, request, true);
  return json({ ok: true, member: publicMember(member), paymentRequired: true, message: "Registration created. Save your Member ID and complete payment to activate Store access." }, 201, { "set-cookie": session.cookie });
}

async function login(env, request) {
  const db = await database(env);
  const payload = await readJson(request);
  const identifier = cleanText(payload.identifier, 254);
  const password = String(payload.password || "");
  if (!identifier || !password) throw new ApiError(400, "MISSING_CREDENTIALS", "Enter your Member ID, email or mobile number and password.");
  const query = identifier.includes("@") ? { email_normalized: normalizeEmail(identifier) } : /^OLC-/i.test(identifier) ? { member_id: identifier.toUpperCase() } : { mobile_normalized: normalizeMobile(identifier) };
  const member = await db.collection("members").findOne(query);
  if (!member || !timingSafeEqual(await derivePassword(password, member.password_salt, member.password_iterations), member.password_hash)) throw new ApiError(401, "INVALID_CREDENTIALS", "The login details did not match an account.");
  if (!member.email_verified) throw new ApiError(403, "EMAIL_NOT_CONFIRMED", "Email not confirmed.");
  if (["suspended", "cancelled"].includes(member.status)) throw new ApiError(403, "ACCOUNT_INACTIVE", "This account is not active. Please contact member support.");
  const session = await createSession(db, member, request, Boolean(payload.remember));
  return json({ ok: true, member: publicMember(member) }, 200, { "set-cookie": session.cookie });
}

export async function handleMongoApi(request, env) {
  try {
    const path = new URL(request.url).pathname;
    const method = request.method.toUpperCase();
    const origin = request.headers.get("origin");
    if (method !== "GET" && origin && origin !== new URL(request.url).origin && origin !== env.FRONTEND_ORIGIN) {
      throw new ApiError(403, "INVALID_ORIGIN", "This request could not be verified.");
    }
    if (path === "/api/health") {
      const db = await database(env);
      await db.command({ ping: 1 });
      return json({ ok: true, service: "One Life Circle", database: "mongodb" });
    }
    if (path === "/api/auth/register" && method === "POST") return register(env, request);
    if (path === "/api/auth/login" && method === "POST") return login(env, request);
    if (path === "/api/auth/logout" && method === "POST") {
      const db = await database(env); const token = parseCookies(request).olc_session; if (token) await db.collection("sessions").deleteOne({ token });
      return json({ ok: true }, 200, { "set-cookie": clearSessionCookie(request.url) });
    }
    if (path === "/api/auth/session" && method === "GET") { const member = await sessionMember(await database(env), request); return json({ ok: true, member: member ? publicMember(member) : null, paymentConfigured: false }); }
    if (path === "/api/account" && method === "GET") { const member = await sessionMember(await database(env), request, true); return json({ ok: true, member: publicMember(member), orders: [], bookings: [] }); }
    throw new ApiError(404, "API_NOT_FOUND", "The requested service was not found.");
  } catch (error) {
    console.error("[One Life Circle Mongo API]", error);
    return apiErrorResponse(error);
  }
}
