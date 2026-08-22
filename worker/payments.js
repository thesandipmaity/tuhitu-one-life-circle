import { catalogue } from "../src/data/catalogue.js";
import { events } from "../src/data/events.js";
import { plans } from "../src/data/plans.js";
import {
  activateMemberMembership,
  audit,
  getMemberValidity,
  getPaymentOrderById,
  updateBookingStatus,
  updateOrderStatus,
  updatePaymentOrderGatewayState,
} from "./database.js";
import { ApiError, hmacSha256Hex, randomHex, timingSafeEqual } from "./security.js";

export function paymentConfigured(env) {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

export function planById(planId) {
  return plans.find((plan) => plan.id === planId && plan.active);
}

export function catalogueBySlug(slug) {
  return catalogue.find((item) => item.slug === slug && item.active);
}

export function eventBySlug(slug) {
  return events.find((item) => item.slug === slug);
}

export function amountForPlan(planId) {
  const plan = planById(planId);
  if (!plan) throw new ApiError(400, "INVALID_PLAN", "Please select an available membership plan.");
  return { amountPaise: Math.round(plan.annualPrice * 100), title: `${plan.name} annual membership`, plan };
}

export function amountForCart(items) {
  if (!Array.isArray(items) || !items.length || items.length > 20) {
    throw new ApiError(400, "INVALID_CART", "Your cart is empty or contains too many items.");
  }
  const lines = items.map((line) => {
    const item = catalogueBySlug(String(line.slug || ""));
    const quantity = Math.max(1, Math.min(9, Number.parseInt(line.quantity, 10) || 1));
    if (!item || item.type !== "Product") throw new ApiError(400, "INVALID_ITEM", "One or more cart items are unavailable.");
    if (!item.verified || item.checkoutEnabled === false) {
      throw new ApiError(409, "ITEM_NOT_READY", `${item.title} is not yet enabled for online checkout.`);
    }
    const unitPricePaise = Math.round(item.memberPrice * 100);
    return { slug: item.slug, title: item.title, quantity, unitPricePaise, lineTotalPaise: unitPricePaise * quantity };
  });
  const amountPaise = lines.reduce((sum, line) => sum + line.lineTotalPaise, 0);
  if (amountPaise < 100) throw new ApiError(400, "INVALID_AMOUNT", "The order total is not valid.");
  return { amountPaise, lines };
}

export function amountForBooking(sourceType, slug) {
  const item = sourceType === "event" ? eventBySlug(slug) : catalogueBySlug(slug);
  if (!item) throw new ApiError(404, "BOOKING_NOT_FOUND", "This booking option is unavailable.");
  const bookingOpen = sourceType === "event" ? item.bookingOpen === true : item.verified === true && item.checkoutEnabled !== false;
  if (!bookingOpen) throw new ApiError(409, "BOOKING_NOT_OPEN", "Online booking will open after the schedule and provider are confirmed.");
  return {
    item,
    title: item.title,
    amountPaise: Math.max(0, Math.round(Number(item.memberPrice || 0) * 100)),
  };
}

export async function createRazorpayOrder(env, paymentOrder) {
  if (!paymentConfigured(env)) {
    throw new ApiError(503, "PAYMENT_NOT_CONFIGURED", "Online payment is awaiting final merchant activation. Your registration remains saved.");
  }
  const authorization = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      authorization: `Basic ${authorization}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      amount: paymentOrder.amountPaise,
      currency: "INR",
      receipt: paymentOrder.id.slice(0, 40),
      notes: {
        purpose: paymentOrder.purpose,
        reference_id: paymentOrder.referenceId,
        member_id: paymentOrder.memberId,
      },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.id) {
    throw new ApiError(502, "GATEWAY_ORDER_FAILED", "The payment window could not be prepared. Please try again.");
  }
  return {
    keyId: env.RAZORPAY_KEY_ID,
    orderId: payload.id,
    amount: payload.amount,
    currency: payload.currency || "INR",
  };
}

export async function fetchRazorpayPayment(env, paymentId) {
  if (!paymentConfigured(env)) {
    throw new ApiError(503, "PAYMENT_NOT_CONFIGURED", "Online payment is awaiting final merchant activation.");
  }
  const authorization = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { authorization: `Basic ${authorization}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.id) {
    throw new ApiError(502, "PAYMENT_STATUS_UNAVAILABLE", "Payment was submitted but its final status is still being confirmed. No access has been granted yet.");
  }
  return payload;
}

export async function verifyCheckoutSignature(env, storedOrderId, paymentId, signature) {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const expected = await hmacSha256Hex(env.RAZORPAY_KEY_SECRET, `${storedOrderId}|${paymentId}`);
  return timingSafeEqual(expected, signature);
}

export async function verifyWebhookSignature(env, rawBody, signature) {
  if (!env.RAZORPAY_WEBHOOK_SECRET || !signature) return false;
  const expected = await hmacSha256Hex(env.RAZORPAY_WEBHOOK_SECRET, rawBody);
  return timingSafeEqual(expected, signature);
}

function annualValidity(currentValidUntil) {
  const now = new Date();
  const candidate = currentValidUntil ? new Date(currentValidUntil) : null;
  const start = candidate && candidate > now ? candidate : now;
  const validUntil = new Date(start);
  validUntil.setUTCFullYear(validUntil.getUTCFullYear() + 1);
  return { issuedAt: now.toISOString(), validUntil: validUntil.toISOString() };
}

export async function finalizePayment(db, paymentOrder, paymentId, source = "checkout") {
  if (!paymentOrder || paymentOrder.status === "paid") return paymentOrder;
  await updatePaymentOrderGatewayState(db, paymentOrder.id, {
    status: "paid",
    gatewayPaymentId: paymentOrder.gateway_payment_id || paymentId,
    paidAt: new Date().toISOString(),
  });
  const updated = await getPaymentOrderById(db, paymentOrder.id);
  if (!updated || updated.status !== "paid") return updated;

  if (paymentOrder.purpose === "membership") {
    const member = await getMemberValidity(db, paymentOrder.member_row_id);
    const { issuedAt, validUntil } = annualValidity(member?.valid_until);
    await activateMemberMembership(db, paymentOrder.member_row_id, {
      planId: paymentOrder.reference_id,
      planPricePaise: paymentOrder.amount_paise,
      issuedAt,
      validUntil,
    });
  } else if (paymentOrder.purpose === "store") {
    await updateOrderStatus(db, paymentOrder.reference_id, "paid");
  } else if (paymentOrder.purpose === "booking") {
    await updateBookingStatus(db, paymentOrder.reference_id, "confirmed");
  }

  await audit(db, "payment.confirmed", "payment_order", paymentOrder.id, paymentOrder.member_row_id, { source, paymentId });
  return updated;
}

export function paymentReference(prefix = "PAY") {
  return `OLC-${prefix}-${Date.now().toString(36).toUpperCase()}-${randomHex(3).toUpperCase()}`;
}
