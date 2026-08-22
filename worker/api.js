import {
  assignMemberIdentity,
  audit,
  createSession,
  createBookingRecord,
  createFormSubmission,
  createMember,
  createOrderItems,
  createOrderRecord,
  createPasswordResetRequest,
  createPaymentOrderRecord,
  database,
  deleteSession,
  findDuplicateMemberByEmailOrMobile,
  findMemberForLogin,
  findRecoveryMember,
  getMemberById,
  getPaymentOrderByGatewayOrder,
  getPaymentOrderByGatewayOrderAndMember,
  getVerificationMemberByToken,
  listMemberBookings,
  listMemberOrders,
  rateLimit,
  sessionMember,
  updateBookingStatus,
  updateOrderStatus,
  updatePaymentOrderGatewayState,
} from "./database.js";
import {
  amountForBooking,
  amountForCart,
  amountForPlan,
  createRazorpayOrder,
  fetchRazorpayPayment,
  finalizePayment,
  paymentConfigured,
  paymentReference,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "./payments.js";
import {
  ApiError,
  assertSameOrigin,
  buildMemberId,
  cleanText,
  clearSessionCookie,
  derivePassword,
  json,
  normalizeEmail,
  normalizeMobile,
  publicMember,
  memberRandomToken,
  randomHex,
  readJson,
  timingSafeEqual,
  validEmail,
  validMobile,
  validatePassword,
} from "./security.js";
import { sendRegistrationWhatsAppAlert, whatsappNotificationConfigured } from "./notifications.js";

const allowedPlans = new Set(["community", "active", "signature"]);

function apiErrorResponse(error) {
  if (error instanceof ApiError) {
    return json({ ok: false, error: { code: error.code, message: error.message, details: error.details } }, error.status);
  }
  console.error("[One Life Circle API]", error);
  return json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } }, 500);
}

function validateRegistration(payload) {
  const fullName = cleanText(payload.fullName, 120);
  const email = cleanText(payload.email, 254);
  const emailNormalized = normalizeEmail(email);
  const mobile = cleanText(payload.mobile, 24);
  const mobileNormalized = normalizeMobile(mobile);
  const city = cleanText(payload.city, 80);
  const locality = cleanText(payload.locality || payload.area, 120);
  const ageGroup = cleanText(payload.ageGroup, 20);
  const primaryInterest = cleanText(payload.interest || payload.primaryInterest, 120);
  const planId = cleanText(payload.planId || payload.plan, 20).toLowerCase();
  const password = String(payload.password || "");
  const errors = {};
  if (fullName.length < 2) errors.fullName = "Enter your full name.";
  if (!validEmail(emailNormalized)) errors.email = "Enter a valid email address.";
  if (!validMobile(mobileNormalized)) errors.mobile = "Enter a valid mobile number.";
  if (city.length < 2) errors.city = "Enter your city.";
  if (!allowedPlans.has(planId)) errors.planId = "Select a membership plan.";
  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;
  if (!payload.consent) errors.consent = "Consent is required to register.";
  if (Object.keys(errors).length) throw new ApiError(400, "VALIDATION_FAILED", "Please correct the highlighted fields.", errors);
  return { fullName, email, emailNormalized, mobile, mobileNormalized, city, locality, ageGroup, primaryInterest, planId, password };
}

async function register(env, request) {
  const db = database(env);
  await rateLimit(db, request, "register", 5, 60 * 60);
  const payload = await readJson(request);
  if (payload.website) return json({ ok: true });
  const input = validateRegistration(payload);
  const duplicate = await findDuplicateMemberByEmailOrMobile(db, input.emailNormalized, input.mobileNormalized);
  if (duplicate) {
    const details = {};
    if (duplicate.email_normalized === input.emailNormalized) details.email = "An account already exists for this email.";
    if (duplicate.mobile_normalized === input.mobileNormalized) details.mobile = "An account already exists for this mobile number.";
    throw new ApiError(409, "ACCOUNT_EXISTS", "This registration already exists. Please log in or recover access.", details);
  }
  const { amountPaise } = amountForPlan(input.planId);
  const salt = randomHex(16);
  const iterations = 210000;
  const passwordHash = await derivePassword(input.password, salt, iterations);
  const consentAt = new Date().toISOString();
  let memberRowId;
  try {
    memberRowId = await createMember(db, {
      ...input,
      planPricePaise: amountPaise,
      passwordHash,
      passwordSalt: salt,
      passwordIterations: iterations,
      consentAt,
    });
  } catch (error) {
    if (/unique constraint/i.test(String(error?.message || error))) {
      throw new ApiError(409, "ACCOUNT_EXISTS", "This registration already exists. Please log in or recover access.");
    }
    throw error;
  }
  if (!memberRowId) throw new ApiError(500, "REGISTRATION_FAILED", "The member record could not be created.");
  const memberId = buildMemberId(memberRandomToken(), memberRowId);
  const verificationToken = `vfy_${randomHex(24)}`;
  await assignMemberIdentity(db, memberRowId, memberId, verificationToken);
  const member = await getMemberById(db, memberRowId);
  const session = await createSession(db, memberRowId, request, true);
  await audit(db, "member.registered", "member", memberId, memberRowId, { planId: input.planId });
  if (whatsappNotificationConfigured(env)) {
    try {
      await sendRegistrationWhatsAppAlert(env, {
        memberId,
        fullName: input.fullName,
        planId: input.planId,
        mobile: input.mobile,
        email: input.email,
        city: input.city,
        locality: input.locality,
        primaryInterest: input.primaryInterest,
        registeredAt: consentAt,
      });
      await audit(db, "notification.whatsapp_sent", "member", memberId, memberRowId, { channel: "whatsapp", type: "registration_alert" });
    } catch (error) {
      console.error("[One Life Circle WhatsApp]", error);
      await audit(db, "notification.whatsapp_failed", "member", memberId, memberRowId, {
        channel: "whatsapp",
        type: "registration_alert",
        reason: String(error?.message || error).slice(0, 300),
      });
    }
  }
  return json(
    {
      ok: true,
      member: publicMember(member),
      paymentRequired: true,
      paymentConfigured: paymentConfigured(env),
      message: "Registration created. Save your Member ID and complete payment to activate Store access.",
    },
    201,
    { "set-cookie": session.cookie },
  );
}

function memberLookup(identifier) {
  const value = cleanText(identifier, 254);
  if (value.includes("@")) return { sql: "email_normalized = ?", value: normalizeEmail(value) };
  if (/^OLC-/i.test(value)) return { sql: "member_id = ?", value: value.toUpperCase() };
  return { sql: "mobile_normalized = ?", value: normalizeMobile(value) };
}

async function login(env, request) {
  const db = database(env);
  await rateLimit(db, request, "login", 10, 15 * 60);
  const payload = await readJson(request);
  const lookup = memberLookup(payload.identifier);
  const password = String(payload.password || "");
  if (!lookup.value || !password) throw new ApiError(400, "MISSING_CREDENTIALS", "Enter your Member ID, email or mobile number and password.");
  const field = lookup.sql.split(" = ")[0];
  const member = await findMemberForLogin(db, field, lookup.value);
  if (!member) throw new ApiError(401, "INVALID_CREDENTIALS", "The login details did not match an account.");
  const derived = await derivePassword(password, member.password_salt, member.password_iterations);
  if (!timingSafeEqual(derived, member.password_hash)) {
    await audit(db, "auth.login_failed", "member", member.member_id || "", member.id);
    throw new ApiError(401, "INVALID_CREDENTIALS", "The login details did not match an account.");
  }
  if (["suspended", "cancelled"].includes(member.status)) {
    throw new ApiError(403, "ACCOUNT_INACTIVE", "This account is not active. Please contact member support.");
  }
  const session = await createSession(db, member.id, request, Boolean(payload.remember));
  await audit(db, "auth.login_succeeded", "member", member.member_id, member.id);
  return json({ ok: true, member: publicMember(member) }, 200, { "set-cookie": session.cookie });
}

async function logout(env, request) {
  const member = await sessionMember(env, request);
  if (member) {
    const db = database(env);
    await deleteSession(db, member.session_id);
    await audit(db, "auth.logout", "member", member.member_id, member.id);
  }
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie(request.url) });
}

async function getSession(env, request) {
  const member = await sessionMember(env, request);
  return json({ ok: true, member: member ? publicMember(member) : null, paymentConfigured: paymentConfigured(env) });
}

async function getAccount(env, request) {
  const member = await sessionMember(env, request, { required: true });
  const db = database(env);
  const [orders, bookings] = await Promise.all([
    listMemberOrders(db, member.id),
    listMemberBookings(db, member.id),
  ]);
  return json({ ok: true, member: publicMember(member), orders, bookings });
}

async function recoverAccess(env, request) {
  const db = database(env);
  await rateLimit(db, request, "password-recovery", 5, 60 * 60);
  const payload = await readJson(request);
  const memberId = cleanText(payload.memberId, 40).toUpperCase();
  const contact = cleanText(payload.contact, 254);
  const email = normalizeEmail(contact);
  const mobile = normalizeMobile(contact);
  const member = await findRecoveryMember(db, memberId, email, mobile);
  if (member) {
    await createPasswordResetRequest(db, {
      id: `rst_${randomHex(16)}`,
      memberRowId: member.id,
      contact,
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    });
    await audit(db, "auth.recovery_requested", "member", memberId, member.id);
  }
  return json({
    ok: true,
    message: "If those details match an account, the recovery request has been queued for the approved support process.",
    deliveryConfigured: false,
  });
}

function safeSubmissionPayload(payload) {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => {
    if (typeof value === "boolean") return [key, value];
    if (Array.isArray(value)) return [key, value.slice(0, 30).map((item) => cleanText(item, 200))];
    return [key, cleanText(value, key === "message" || key === "introduction" ? 2500 : 300)];
  }));
}

async function saveForm(env, request, type) {
  const db = database(env);
  await rateLimit(db, request, `form-${type}`, 10, 60 * 60);
  const raw = await readJson(request);
  if (raw.website) return json({ ok: true });
  const payload = safeSubmissionPayload(raw);
  const name = cleanText(payload.name || payload.fullName, 120);
  const contact = cleanText(payload.contact || payload.email || payload.mobile, 254);
  if (name.length < 2 || !contact || !raw.consent) {
    throw new ApiError(400, "VALIDATION_FAILED", "Complete the required fields and consent before submitting.");
  }
  if (type === "support" && cleanText(payload.message, 2500).length < 4) {
    throw new ApiError(400, "VALIDATION_FAILED", "Please tell us how we can help.");
  }
  const member = await sessionMember(env, request);
  const id = paymentReference(type === "companion" ? "CMP" : "ENQ");
  await createFormSubmission(db, {
    id,
    type,
    memberRowId: member?.id || null,
    name,
    contact,
    dataJson: JSON.stringify(payload),
    consentAt: new Date().toISOString(),
  });
  await audit(db, "form.submitted", "form_submission", id, member?.id || null, { type });
  return json({ ok: true, reference: id, message: "Your details have been securely received." }, 201);
}

function addressFrom(payload) {
  const shipping = {
    name: cleanText(payload.shipping?.name, 120),
    mobile: cleanText(payload.shipping?.mobile, 24),
    address: cleanText(payload.shipping?.address, 240),
    area: cleanText(payload.shipping?.area, 120),
    city: cleanText(payload.shipping?.city, 80),
    pincode: cleanText(payload.shipping?.pincode, 10),
  };
  if (!shipping.name || !validMobile(normalizeMobile(shipping.mobile)) || !shipping.address || !shipping.city || !/^\d{6}$/.test(shipping.pincode)) {
    throw new ApiError(400, "INVALID_ADDRESS", "Complete the delivery name, mobile, address, city and six-digit PIN code.");
  }
  return shipping;
}

async function createPaymentOrder(env, request) {
  const member = await sessionMember(env, request, { required: true });
  const db = database(env);
  await rateLimit(db, request, "payment-order", 12, 15 * 60);
  const payload = await readJson(request);
  const purpose = cleanText(payload.purpose, 20);
  if (!paymentConfigured(env)) {
    throw new ApiError(503, "PAYMENT_NOT_CONFIGURED", "Online payment is awaiting final merchant activation. Your registration remains saved.");
  }

  let amountPaise;
  let referenceId;
  let description;
  let postCreate;

  if (purpose === "membership") {
    const result = amountForPlan(payload.referenceId || member.plan_id);
    amountPaise = result.amountPaise;
    referenceId = result.plan.id;
    description = result.title;
  } else if (purpose === "store") {
    if (member.status !== "active") throw new ApiError(403, "MEMBERSHIP_REQUIRED", "Complete membership payment to access Store checkout.");
    const result = amountForCart(payload.items);
    const shipping = addressFrom(payload);
    amountPaise = result.amountPaise;
    referenceId = paymentReference("ORD");
    description = `One Life Circle order ${referenceId}`;
    postCreate = { type: "store", lines: result.lines, shipping };
  } else if (purpose === "booking") {
    if (member.status !== "active") throw new ApiError(403, "MEMBERSHIP_REQUIRED", "Complete membership payment to book member services and experiences.");
    const sourceType = payload.sourceType === "event" ? "event" : "catalogue";
    const result = amountForBooking(sourceType, cleanText(payload.referenceId, 120));
    referenceId = paymentReference("BKG");
    description = result.title;
    amountPaise = result.amountPaise;
    postCreate = {
      type: "booking",
      sourceType,
      sourceSlug: result.item.slug,
      title: result.item.title,
      requestedDate: cleanText(payload.requestedDate, 40),
      requestedTime: cleanText(payload.requestedTime, 40),
      attendeeCount: Math.max(1, Math.min(8, Number.parseInt(payload.attendeeCount, 10) || 1)),
      notes: cleanText(payload.notes, 600),
    };
    if (amountPaise === 0) {
      await createBookingRecord(db, {
        id: referenceId,
        memberRowId: member.id,
        paymentOrderId: null,
        sourceType,
        sourceSlug: postCreate.sourceSlug,
        titleSnapshot: postCreate.title,
        amountPaise: 0,
        attendeeCount: postCreate.attendeeCount,
        requestedDate: postCreate.requestedDate,
        requestedTime: postCreate.requestedTime,
        status: "confirmed",
        notes: postCreate.notes,
      });
      await audit(db, "booking.created_free", "booking", referenceId, member.id);
      return json({ ok: true, paymentRequired: false, reference: referenceId, status: "confirmed" }, 201);
    }
  } else {
    throw new ApiError(400, "INVALID_PAYMENT_PURPOSE", "The payment request is not valid.");
  }

  const localPaymentId = paymentReference("PAY");
  await createPaymentOrderRecord(db, {
    id: localPaymentId,
    memberRowId: member.id,
    purpose,
    referenceId,
    amountPaise,
    metadataJson: JSON.stringify({ description }),
  });

  if (postCreate?.type === "store") {
    await createOrderRecord(db, {
      id: referenceId,
      memberRowId: member.id,
      paymentOrderId: localPaymentId,
      subtotalPaise: amountPaise,
      totalPaise: amountPaise,
      shippingJson: JSON.stringify(postCreate.shipping),
    });
    await createOrderItems(db, postCreate.lines.map((line) => ({
      orderId: referenceId,
      itemSlug: line.slug,
      titleSnapshot: line.title,
      quantity: line.quantity,
      unitPricePaise: line.unitPricePaise,
      lineTotalPaise: line.lineTotalPaise,
    })));
  }

  if (postCreate?.type === "booking") {
    await createBookingRecord(db, {
      id: referenceId,
      memberRowId: member.id,
      paymentOrderId: localPaymentId,
      sourceType: postCreate.sourceType,
      sourceSlug: postCreate.sourceSlug,
      titleSnapshot: postCreate.title,
      amountPaise,
      attendeeCount: postCreate.attendeeCount,
      requestedDate: postCreate.requestedDate,
      requestedTime: postCreate.requestedTime,
      status: "payment_pending",
      notes: postCreate.notes,
    });
  }

  let gateway;
  try {
    gateway = await createRazorpayOrder(env, {
      id: localPaymentId,
      memberId: member.member_id,
      purpose,
      referenceId,
      amountPaise,
    });
  } catch (error) {
    await updatePaymentOrderGatewayState(db, localPaymentId, { status: "gateway_failed" });
    if (purpose === "store") await updateOrderStatus(db, referenceId, "payment_failed");
    if (purpose === "booking") await updateBookingStatus(db, referenceId, "payment_failed");
    await audit(db, "payment.order_failed", "payment_order", localPaymentId, member.id, { purpose, referenceId });
    throw error;
  }
  await updatePaymentOrderGatewayState(db, localPaymentId, {
    status: "gateway_pending",
    gatewayOrderId: gateway.orderId,
  });
  await audit(db, "payment.order_created", "payment_order", localPaymentId, member.id, { purpose, referenceId });
  return json({
    ok: true,
    paymentRequired: true,
    payment: {
      localPaymentId,
      reference: referenceId,
      orderId: gateway.orderId,
      keyId: gateway.keyId,
      amount: gateway.amount,
      currency: gateway.currency,
      name: "One Life Circle",
      description,
      prefill: { name: member.full_name, email: member.email, contact: member.mobile },
    },
  }, 201);
}

async function verifyPayment(env, request) {
  const member = await sessionMember(env, request, { required: true });
  const db = database(env);
  const payload = await readJson(request);
  const gatewayOrderId = cleanText(payload.razorpay_order_id, 120);
  const paymentId = cleanText(payload.razorpay_payment_id, 120);
  const signature = cleanText(payload.razorpay_signature, 200);
  const paymentOrder = await getPaymentOrderByGatewayOrderAndMember(db, gatewayOrderId, member.id);
  if (!paymentOrder) throw new ApiError(404, "PAYMENT_ORDER_NOT_FOUND", "The payment order could not be matched.");
  const valid = await verifyCheckoutSignature(env, paymentOrder.gateway_order_id, paymentId, signature);
  if (!valid) {
    await audit(db, "payment.signature_failed", "payment_order", paymentOrder.id, member.id);
    throw new ApiError(400, "INVALID_PAYMENT_SIGNATURE", "Payment verification failed. No access was granted.");
  }
  const gatewayPayment = await fetchRazorpayPayment(env, paymentId);
  const gatewayMatches = gatewayPayment.order_id === paymentOrder.gateway_order_id
    && Number(gatewayPayment.amount) === Number(paymentOrder.amount_paise)
    && String(gatewayPayment.currency || "").toUpperCase() === paymentOrder.currency;
  if (!gatewayMatches) {
    await audit(db, "payment.details_mismatch", "payment_order", paymentOrder.id, member.id);
    throw new ApiError(400, "PAYMENT_DETAILS_MISMATCH", "Payment details could not be matched. No access was granted.");
  }
  if (gatewayPayment.status !== "captured") {
    const terminalFailure = gatewayPayment.status === "failed";
    await updatePaymentOrderGatewayState(db, paymentOrder.id, {
      status: terminalFailure ? "failed" : "capture_pending",
      gatewayPaymentId: paymentId,
    });
    if (terminalFailure && paymentOrder.purpose === "store") await updateOrderStatus(db, paymentOrder.reference_id, "payment_failed");
    if (terminalFailure && paymentOrder.purpose === "booking") await updateBookingStatus(db, paymentOrder.reference_id, "payment_failed");
    await audit(db, terminalFailure ? "payment.failed" : "payment.capture_pending", "payment_order", paymentOrder.id, member.id, { gatewayStatus: gatewayPayment.status });
    if (terminalFailure) throw new ApiError(400, "PAYMENT_FAILED", "Payment failed. No access was granted.");
    return json({
      ok: true,
      pending: true,
      reference: paymentOrder.reference_id,
      purpose: paymentOrder.purpose,
      message: "Payment is awaiting final capture. Access will activate only after the signed confirmation arrives.",
    }, 202);
  }
  await finalizePayment(db, paymentOrder, paymentId, "checkout");
  const updatedMember = await getMemberById(db, member.id);
  return json({ ok: true, reference: paymentOrder.reference_id, purpose: paymentOrder.purpose, member: publicMember(updatedMember) });
}

async function razorpayWebhook(env, request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";
  if (!await verifyWebhookSignature(env, rawBody, signature)) {
    throw new ApiError(401, "INVALID_WEBHOOK_SIGNATURE", "Webhook signature did not match.");
  }
  const payload = JSON.parse(rawBody);
  const event = cleanText(payload.event, 80);
  const gatewayOrderId = payload.payload?.payment?.entity?.order_id || payload.payload?.order?.entity?.id;
  const paymentId = payload.payload?.payment?.entity?.id || (gatewayOrderId ? `orderpaid_${gatewayOrderId}` : "");
  if (!gatewayOrderId) return json({ ok: true, ignored: true });
  const db = database(env);
  const paymentOrder = await getPaymentOrderByGatewayOrder(db, gatewayOrderId);
  if (!paymentOrder) return json({ ok: true, ignored: true });
  if (["payment.captured", "order.paid"].includes(event)) {
    await finalizePayment(db, paymentOrder, paymentId, `webhook:${event}`);
  } else if (event === "payment.failed") {
    await updatePaymentOrderGatewayState(db, paymentOrder.id, { status: "failed" });
    if (paymentOrder.purpose === "store") await updateOrderStatus(db, paymentOrder.reference_id, "payment_failed");
    if (paymentOrder.purpose === "booking") await updateBookingStatus(db, paymentOrder.reference_id, "payment_failed");
    await audit(db, "payment.failed", "payment_order", paymentOrder.id, paymentOrder.member_row_id, { event });
  }
  return json({ ok: true });
}

async function verifyMember(env, token) {
  const db = database(env);
  const member = await getVerificationMemberByToken(db, token);
  if (!member) throw new ApiError(404, "MEMBERSHIP_NOT_FOUND", "This membership could not be verified.");
  return json({
    ok: true,
    membership: {
      name: member.full_name,
      plan: `${member.plan_id[0].toUpperCase()}${member.plan_id.slice(1)} Member`,
      status: member.status,
      validUntil: member.valid_until,
    },
    verifiedAt: new Date().toISOString(),
  });
}

export async function handleApi(request, env) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();
    if (path === "/api/payments/webhook" && method === "POST") return await razorpayWebhook(env, request);
    if (method !== "GET") assertSameOrigin(request);

    if (path === "/api/health" && method === "GET") {
      return json({ ok: true, service: "One Life Circle", database: Boolean(env.DB), payments: paymentConfigured(env), timestamp: new Date().toISOString() });
    }
    if (path === "/api/auth/register" && method === "POST") return await register(env, request);
    if (path === "/api/auth/login" && method === "POST") return await login(env, request);
    if (path === "/api/auth/logout" && method === "POST") return await logout(env, request);
    if (path === "/api/auth/session" && method === "GET") return await getSession(env, request);
    if (path === "/api/auth/recover" && method === "POST") return await recoverAccess(env, request);
    if (path === "/api/account" && method === "GET") return await getAccount(env, request);
    if (path === "/api/forms/support" && method === "POST") return await saveForm(env, request, "support");
    if (path === "/api/forms/companion" && method === "POST") return await saveForm(env, request, "companion");
    if (path === "/api/payments/order" && method === "POST") return await createPaymentOrder(env, request);
    if (path === "/api/payments/verify" && method === "POST") return await verifyPayment(env, request);
    if (path.startsWith("/api/members/verify/") && method === "GET") {
      return await verifyMember(env, decodeURIComponent(path.slice("/api/members/verify/".length)));
    }
    throw new ApiError(404, "API_NOT_FOUND", "The requested service was not found.");
  } catch (error) {
    return apiErrorResponse(error);
  }
}
