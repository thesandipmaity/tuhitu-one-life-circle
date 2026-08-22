import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import { baileysBridgeConfigured, formatRegistrationWhatsAppSummary, whatsappNotificationConfigured } from "../worker/notifications.js";
import { amountForBooking, amountForCart, amountForPlan, verifyCheckoutSignature, verifyWebhookSignature } from "../worker/payments.js";
import { buildMemberId, derivePassword, hmacSha256Hex, normalizeMobile, timingSafeEqual } from "../worker/security.js";

test("member IDs are meaningful, unique-ready and do not expose mobile data", () => {
  const id = buildMemberId("K7M", 42, new Date("2026-08-11T00:00:00Z"));
  assert.match(id, /^OLC-[A-Z0-9]{3}-26-000042$/);
  assert.doesNotMatch(id, /9876543210/);
  assert.equal(normalizeMobile("98765 43210"), "919876543210");
});

test("password derivation is salted and verifiable without storing plaintext", async () => {
  const password = "StrongMember2026";
  const first = await derivePassword(password, "00112233445566778899aabbccddeeff", 10_000);
  const second = await derivePassword(password, "ffeeddccbbaa99887766554433221100", 10_000);
  assert.notEqual(first, second);
  assert.ok(timingSafeEqual(first, await derivePassword(password, "00112233445566778899aabbccddeeff", 10_000)));
});

test("server plan pricing is authoritative and unapproved catalogue checkout is blocked", () => {
  assert.equal(amountForPlan("community").amountPaise, 600_000);
  assert.equal(amountForPlan("active").amountPaise, 2_400_000);
  assert.equal(amountForPlan("signature").amountPaise, 4_800_000);
  assert.equal(amountForBooking("event", "morning-mobility-circle").amountPaise, 0);
  assert.equal(amountForBooking("event", "panchakarma-discovery-session").amountPaise, 49_900);
  assert.throws(() => amountForCart([{ slug: "daily-multivitamin-gummies", quantity: 1 }]), (error) => error.code === "ITEM_NOT_READY");
});

test("Razorpay checkout signatures are verified server-side", async () => {
  const secret = "test_secret";
  const orderId = "order_example";
  const paymentId = "pay_example";
  const signature = await hmacSha256Hex(secret, `${orderId}|${paymentId}`);
  assert.equal(await verifyCheckoutSignature({ RAZORPAY_KEY_SECRET: secret }, orderId, paymentId, signature), true);
  assert.equal(await verifyCheckoutSignature({ RAZORPAY_KEY_SECRET: secret }, orderId, paymentId, "0".repeat(64)), false);
  const body = JSON.stringify({ event: "payment.captured" });
  const webhookSignature = await hmacSha256Hex(secret, body);
  assert.equal(await verifyWebhookSignature({ RAZORPAY_WEBHOOK_SECRET: secret }, body, webhookSignature), true);
  assert.equal(await verifyWebhookSignature({ RAZORPAY_WEBHOOK_SECRET: secret }, `${body}x`, webhookSignature), false);
});

test("production artifact packages the Supabase schema and exposes safe backend health", async () => {
  await Promise.all([
    access("dist/supabase/schema.sql"),
    access("dist/server/index.js"),
  ]);
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("backend", `${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(new Request("https://onelifecircle.example/api/health"), {});
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.database, false);
  assert.equal(payload.payments, false);
});

test("cross-origin state changes are rejected before reaching the database", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("csrf", `${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(new Request("https://onelifecircle.example/api/auth/register", {
    method: "POST",
    headers: { origin: "https://attacker.example", "content-type": "application/json" },
    body: "{}",
  }), {});
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, "INVALID_ORIGIN");
});

test("registration WhatsApp notifications are gated by explicit server config and include the member summary", () => {
  assert.equal(whatsappNotificationConfigured({}), false);
  assert.equal(baileysBridgeConfigured({}), false);
  assert.equal(baileysBridgeConfigured({ BAILEYS_BRIDGE_URL: "http://127.0.0.1:8788" }), true);
  assert.equal(whatsappNotificationConfigured({ BAILEYS_BRIDGE_URL: "http://127.0.0.1:8788" }), true);
  assert.equal(whatsappNotificationConfigured({
    WHATSAPP_ACCESS_TOKEN: "token",
    WHATSAPP_PHONE_NUMBER_ID: "123",
    WHATSAPP_ALERT_TO: "919999999999",
    WHATSAPP_TEMPLATE_NAME: "new_registration_alert",
  }), true);

  const summary = formatRegistrationWhatsAppSummary({
    memberId: "OLC-ABC-26-000123",
    fullName: "Riya Sharma",
    planId: "community",
    mobile: "+91 99999 99999",
    email: "riya@example.com",
    city: "Panchkula",
    locality: "Sector 8",
    primaryInterest: "Community & experiences",
    registeredAt: "2026-08-21T12:34:56.000Z",
  });

  assert.match(summary, /New membership registration received\./);
  assert.match(summary, /Member ID: OLC-ABC-26-000123/);
  assert.match(summary, /Name: Riya Sharma/);
  assert.match(summary, /Plan: community/);
  assert.match(summary, /Registered at: 2026-08-21T12:34:56.000Z/);
});
