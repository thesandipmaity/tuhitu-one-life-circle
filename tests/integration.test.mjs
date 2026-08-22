import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { hmacSha256Hex, sha256Hex } from "../worker/security.js";

class D1StatementAdapter {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }
  bind(...values) {
    this.values = values;
    return this;
  }
  async first() {
    return this.database.prepare(this.sql).get(...this.values) || null;
  }
  async all() {
    return { success: true, results: this.database.prepare(this.sql).all(...this.values) };
  }
  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid || 0) } };
  }
}

class D1Adapter {
  constructor(database) {
    this.database = database;
  }
  prepare(sql) {
    return new D1StatementAdapter(this.database, sql);
  }
  async batch(statements) {
    return Promise.all(statements.map((statement) => statement.run()));
  }
}

async function createEnvironment() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  const migration = await readFile("drizzle/0000_peaceful_clea.sql", "utf8");
  for (const statement of migration.split("--> statement-breakpoint").map((value) => value.trim()).filter(Boolean)) sqlite.exec(statement);
  return { sqlite, env: { DB: new D1Adapter(sqlite) } };
}

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("integration", `${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

function apiRequest(path, body, cookie = "") {
  return new Request(`https://onelifecircle.example${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json", origin: "https://onelifecircle.example" }),
      ...(cookie ? { cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("registration, secure login, account activation, verification and form capture work end to end", async () => {
  const worker = await loadWorker();
  const { sqlite, env } = await createEnvironment();
  const registrationPayload = {
    fullName: "Lalit Singh",
    email: "lalit@example.com",
    mobile: "9876543210",
    city: "Noida",
    locality: "Sector 62",
    ageGroup: "18-29",
    interest: "Better everyday choices",
    planId: "community",
    password: "SecureMember2026",
    consent: true,
  };
  const registrationResponse = await worker.fetch(apiRequest("/api/auth/register", registrationPayload), env);
  assert.equal(registrationResponse.status, 201);
  const registration = await registrationResponse.json();
  assert.match(registration.member.memberId, /^OLC-[A-Z0-9]{3}-26-000001$/);
  assert.equal(registration.member.name, "Lalit Singh");
  assert.equal(registration.member.canAccessStore, false);
  assert.equal(registration.member.status, "pending_payment");
  const cookie = registrationResponse.headers.get("set-cookie").split(";")[0];

  const stored = sqlite.prepare("SELECT password_hash, password_salt, status, primary_interest FROM members WHERE id = 1").get();
  assert.notEqual(stored.password_hash, "SecureMember2026");
  assert.equal(stored.password_salt.length, 32);
  assert.equal(stored.status, "pending_payment");
  assert.equal(stored.primary_interest, "Better everyday choices");

  const duplicate = await worker.fetch(apiRequest("/api/auth/register", registrationPayload), env);
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).error.code, "ACCOUNT_EXISTS");

  const sessionResponse = await worker.fetch(apiRequest("/api/auth/session", undefined, cookie), env);
  assert.equal((await sessionResponse.json()).member.memberId, registration.member.memberId);

  const wrongLogin = await worker.fetch(apiRequest("/api/auth/login", { identifier: "lalit@example.com", password: "WrongPassword1" }), env);
  assert.equal(wrongLogin.status, 401);
  const unknownLogin = await worker.fetch(apiRequest("/api/auth/login", { identifier: "nobody@example.com", password: "SecureMember2026" }), env);
  assert.equal(unknownLogin.status, 401);
  const emailLogin = await worker.fetch(apiRequest("/api/auth/login", { identifier: "lalit@example.com", password: "SecureMember2026" }), env);
  assert.equal(emailLogin.status, 200);
  const mobileLogin = await worker.fetch(apiRequest("/api/auth/login", { identifier: "9876543210", password: "SecureMember2026" }), env);
  assert.equal(mobileLogin.status, 200);
  const correctLogin = await worker.fetch(apiRequest("/api/auth/login", { identifier: registration.member.memberId, password: "SecureMember2026", remember: true }), env);
  assert.equal(correctLogin.status, 200);

  const blockedStore = await worker.fetch(apiRequest("/api/payments/order", {
    purpose: "store",
    items: [{ slug: "daily-multivitamin-gummies", quantity: 1 }],
    shipping: { name: "Lalit Singh", mobile: "9876543210", address: "Sector 62", city: "Noida", pincode: "201301" },
  }, cookie), { ...env, RAZORPAY_KEY_ID: "rzp_test_key", RAZORPAY_KEY_SECRET: "rzp_test_secret" });
  assert.equal(blockedStore.status, 403);
  assert.equal((await blockedStore.json()).error.code, "MEMBERSHIP_REQUIRED");

  sqlite.prepare(`INSERT INTO payment_orders (id, member_row_id, purpose, reference_id, amount_paise, currency, status, gateway_order_id, metadata_json)
    VALUES (?, 1, 'membership', 'community', 600000, 'INR', 'gateway_pending', ?, '{}')`).run("OLC-PAY-TEST", "order_test_001");
  const secret = "rzp_test_secret";
  const signature = await hmacSha256Hex(secret, "order_test_001|pay_test_001");
  const originalStatusFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => String(input) === "https://api.razorpay.com/v1/payments/pay_test_001"
    ? new Response(JSON.stringify({ id: "pay_test_001", order_id: "order_test_001", amount: 600000, currency: "INR", status: "captured" }), { status: 200, headers: { "content-type": "application/json" } })
    : originalStatusFetch(input, init);
  let verificationResponse;
  try {
    verificationResponse = await worker.fetch(apiRequest("/api/payments/verify", {
      razorpay_order_id: "order_test_001",
      razorpay_payment_id: "pay_test_001",
      razorpay_signature: signature,
    }, cookie), { ...env, RAZORPAY_KEY_ID: "rzp_test_key", RAZORPAY_KEY_SECRET: secret });
  } finally {
    globalThis.fetch = originalStatusFetch;
  }
  assert.equal(verificationResponse.status, 200);
  const verifiedPayment = await verificationResponse.json();
  assert.equal(verifiedPayment.member.canAccessStore, true);
  assert.equal(sqlite.prepare("SELECT status FROM members WHERE id = 1").get().status, "active");

  const publicVerification = await worker.fetch(apiRequest(`/api/members/verify/${registration.member.verificationToken}`), env);
  assert.equal(publicVerification.status, 200);
  const verifiedMember = await publicVerification.json();
  assert.equal(verifiedMember.membership.name, "Lalit Singh");
  assert.equal(verifiedMember.membership.status, "active");
  assert.equal("email" in verifiedMember.membership, false);
  assert.equal("mobile" in verifiedMember.membership, false);

  const freeBooking = await worker.fetch(apiRequest("/api/payments/order", {
    purpose: "booking",
    sourceType: "event",
    referenceId: "morning-mobility-circle",
    attendeeCount: 1,
  }, cookie), { ...env, RAZORPAY_KEY_ID: "rzp_test_key", RAZORPAY_KEY_SECRET: "rzp_test_secret" });
  assert.equal(freeBooking.status, 201);
  assert.equal((await freeBooking.json()).paymentRequired, false);
  assert.equal(sqlite.prepare("SELECT status FROM bookings").get().status, "confirmed");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => String(input).startsWith("https://api.razorpay.com/")
    ? new Response(JSON.stringify({ error: { description: "Test gateway unavailable" } }), { status: 503, headers: { "content-type": "application/json" } })
    : originalFetch(input, init);
  try {
    const failedPaidBooking = await worker.fetch(apiRequest("/api/payments/order", {
      purpose: "booking",
      sourceType: "event",
      referenceId: "panchakarma-discovery-session",
      attendeeCount: 1,
    }, cookie), { ...env, RAZORPAY_KEY_ID: "rzp_test_key", RAZORPAY_KEY_SECRET: "rzp_test_secret" });
    assert.equal(failedPaidBooking.status, 502);
    const failedRecord = sqlite.prepare("SELECT status FROM bookings WHERE source_slug = 'panchakarma-discovery-session'").get();
    assert.equal(failedRecord.status, "payment_failed");
  } finally {
    globalThis.fetch = originalFetch;
  }

  const formResponse = await worker.fetch(apiRequest("/api/forms/support", {
    name: "Lalit Singh",
    contact: "lalit@example.com",
    intent: "Membership support",
    message: "Please help me understand my digital card.",
    consent: true,
  }, cookie), env);
  assert.equal(formResponse.status, 201);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM form_submissions").get().count, 1);

  const accountResponse = await worker.fetch(apiRequest("/api/account", undefined, cookie), env);
  assert.equal(accountResponse.status, 200);
  const account = await accountResponse.json();
  assert.equal(account.member.memberId, registration.member.memberId);
  assert.deepEqual(account.orders, []);
  assert.equal(account.bookings.length, 2);

  const recoveryResponse = await worker.fetch(apiRequest("/api/auth/recover", { memberId: registration.member.memberId, contact: "lalit@example.com" }), env);
  assert.equal(recoveryResponse.status, 200);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM password_reset_requests").get().count, 1);

  const logoutResponse = await worker.fetch(apiRequest("/api/auth/logout", {}, cookie), env);
  assert.equal(logoutResponse.status, 200);
  const afterLogout = await worker.fetch(apiRequest("/api/auth/session", undefined, cookie), env);
  assert.equal((await afterLogout.json()).member, null);

  const expiredToken = "expired-session-token";
  sqlite.prepare(`INSERT INTO sessions (id, member_row_id, token_hash, expires_at, user_agent_hash)
    VALUES ('ses_expired', 1, ?, ?, 'test')`).run(await sha256Hex(expiredToken), new Date(Date.now() - 60_000).toISOString());
  const expiredSession = await worker.fetch(apiRequest("/api/auth/session", undefined, `__Host-olc_session=${expiredToken}`), env);
  assert.equal((await expiredSession.json()).member, null);
});
