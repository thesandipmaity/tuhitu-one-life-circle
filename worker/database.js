import { ApiError, parseCookies, randomHex, sessionCookie, sha256Hex } from "./security.js";

function one(rows) {
  return rows[0] || null;
}

async function d1First(db, sql, ...values) {
  return db.db.prepare(sql).bind(...values).first();
}

async function d1All(db, sql, ...values) {
  const result = await db.db.prepare(sql).bind(...values).all();
  return result.results || [];
}

async function d1Run(db, sql, ...values) {
  return db.db.prepare(sql).bind(...values).run();
}

function filterValue(value) {
  return value === null ? "is.null" : `eq.${value}`;
}

async function supabaseRequest(db, path, { method = "GET", query, body, prefer } = {}) {
  const url = new URL(path, db.SUPABASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    apikey: db.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${db.SUPABASE_SERVICE_ROLE_KEY}`,
  };
  if (prefer) headers.prefer = prefer;
  if (body !== undefined) headers["content-type"] = "application/json";

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(502, "DATABASE_ERROR", payload?.message || "The database request could not be completed.");
  }
  return payload;
}

async function supabaseSelect(db, table, { select = "*", filters = {}, or = "", order, limit } = {}) {
  const query = { select };
  for (const [key, value] of Object.entries(filters)) query[key] = filterValue(value);
  if (or) query.or = or;
  if (order) query.order = order;
  if (limit) query.limit = limit;
  const rows = await supabaseRequest(db, `/rest/v1/${table}`, { query });
  return Array.isArray(rows) ? rows : [];
}

async function supabaseInsert(db, table, values, { prefer = "return=representation", onConflict } = {}) {
  return supabaseRequest(db, `/rest/v1/${table}`, {
    method: "POST",
    query: onConflict ? { on_conflict: onConflict } : undefined,
    body: values,
    prefer,
  });
}

async function supabaseUpdate(db, table, values, { filters = {}, prefer = "return=representation" } = {}) {
  const query = {};
  for (const [key, value] of Object.entries(filters)) query[key] = filterValue(value);
  return supabaseRequest(db, `/rest/v1/${table}`, {
    method: "PATCH",
    query,
    body: values,
    prefer,
  });
}

async function supabaseDelete(db, table, { filters = {} } = {}) {
  const query = {};
  for (const [key, value] of Object.entries(filters)) query[key] = filterValue(value);
  return supabaseRequest(db, `/rest/v1/${table}`, {
    method: "DELETE",
    query,
    prefer: "return=representation",
  });
}

export function database(env) {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      kind: "supabase",
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }
  if (env.DB) return { kind: "d1", db: env.DB };
  throw new ApiError(
    503,
    "DATABASE_NOT_CONFIGURED",
    "Supabase is not configured for local development. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local and restart the dev server.",
  );
}

export async function findDuplicateMemberByEmailOrMobile(db, emailNormalized, mobileNormalized) {
  if (db.kind === "d1") {
    return d1First(
      db,
      "SELECT email_normalized, mobile_normalized FROM members WHERE email_normalized = ? OR mobile_normalized = ?",
      emailNormalized,
      mobileNormalized,
    );
  }
  return one(await supabaseSelect(db, "members", {
    select: "email_normalized,mobile_normalized",
    or: `(email_normalized.eq.${emailNormalized},mobile_normalized.eq.${mobileNormalized})`,
    limit: 1,
  }));
}

function isMissingColumn(error, columnName) {
  return error instanceof ApiError && String(error.message || "").includes(`'${columnName}'`);
}

export async function createMember(db, member) {
  if (db.kind === "d1") {
    const inserted = await d1Run(
      db,
      `INSERT INTO members (
        full_name, email, email_normalized, mobile, mobile_normalized, city, locality, age_group,
        primary_interest, plan_id, plan_price_paise, status, password_hash, password_salt, password_iterations,
        consent_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      member.fullName,
      member.email,
      member.emailNormalized,
      member.mobile,
      member.mobileNormalized,
      member.city,
      member.locality,
      member.ageGroup,
      member.primaryInterest,
      member.planId,
      member.planPricePaise,
      member.passwordHash,
      member.passwordSalt,
      member.passwordIterations,
      member.consentAt,
    );
    return Number(inserted.meta?.last_row_id);
  }
  const basePayload = {
    full_name: member.fullName,
    email: member.email,
    email_normalized: member.emailNormalized,
    mobile: member.mobile,
    mobile_normalized: member.mobileNormalized,
    city: member.city,
    locality: member.locality,
    age_group: member.ageGroup,
    plan_id: member.planId,
    plan_price_paise: member.planPricePaise,
    status: "pending_payment",
    password_hash: member.passwordHash,
    password_salt: member.passwordSalt,
    password_iterations: member.passwordIterations,
    consent_at: member.consentAt,
  };
  let inserted;
  try {
    inserted = await supabaseInsert(db, "members", {
      ...basePayload,
      primary_interest: member.primaryInterest,
    });
  } catch (error) {
    if (!isMissingColumn(error, "primary_interest")) throw error;
    inserted = await supabaseInsert(db, "members", basePayload);
  }
  return Number(inserted?.[0]?.id || 0);
}

export async function assignMemberIdentity(db, memberRowId, memberId, verificationToken) {
  if (db.kind === "d1") {
    await d1Run(
      db,
      "UPDATE members SET member_id = ?, verification_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      memberId,
      verificationToken,
      memberRowId,
    );
    return;
  }
  await supabaseUpdate(db, "members", {
    member_id: memberId,
    verification_token: verificationToken,
    updated_at: new Date().toISOString(),
  }, { filters: { id: memberRowId } });
}

export async function getMemberById(db, memberRowId) {
  if (db.kind === "d1") return d1First(db, "SELECT * FROM members WHERE id = ?", memberRowId);
  return one(await supabaseSelect(db, "members", { filters: { id: memberRowId }, limit: 1 }));
}

export async function findMemberForLogin(db, field, value) {
  if (db.kind === "d1") return d1First(db, `SELECT * FROM members WHERE ${field} = ?`, value);
  return one(await supabaseSelect(db, "members", { filters: { [field]: value }, limit: 1 }));
}

export async function deleteSession(db, sessionId) {
  if (db.kind === "d1") {
    await d1Run(db, "DELETE FROM sessions WHERE id = ?", sessionId);
    return;
  }
  await supabaseDelete(db, "sessions", { filters: { id: sessionId } });
}

export async function listMemberOrders(db, memberRowId) {
  if (db.kind === "d1") {
    return d1All(
      db,
      "SELECT id, status, total_paise, created_at, updated_at FROM orders WHERE member_row_id = ? ORDER BY created_at DESC LIMIT 20",
      memberRowId,
    );
  }
  return supabaseSelect(db, "orders", {
    select: "id,status,total_paise,created_at,updated_at",
    filters: { member_row_id: memberRowId },
    order: "created_at.desc",
    limit: 20,
  });
}

export async function listMemberBookings(db, memberRowId) {
  if (db.kind === "d1") {
    return d1All(
      db,
      "SELECT id, source_type, source_slug, title_snapshot, amount_paise, status, requested_date, requested_time, created_at FROM bookings WHERE member_row_id = ? ORDER BY created_at DESC LIMIT 20",
      memberRowId,
    );
  }
  return supabaseSelect(db, "bookings", {
    select: "id,source_type,source_slug,title_snapshot,amount_paise,status,requested_date,requested_time,created_at",
    filters: { member_row_id: memberRowId },
    order: "created_at.desc",
    limit: 20,
  });
}

export async function findRecoveryMember(db, memberId, emailNormalized, mobileNormalized) {
  if (db.kind === "d1") {
    return d1First(
      db,
      "SELECT id FROM members WHERE member_id = ? AND (email_normalized = ? OR mobile_normalized = ?)",
      memberId,
      emailNormalized,
      mobileNormalized,
    );
  }
  return one(await supabaseSelect(db, "members", {
    select: "id",
    filters: { member_id: memberId },
    or: `(email_normalized.eq.${emailNormalized},mobile_normalized.eq.${mobileNormalized})`,
    limit: 1,
  }));
}

export async function createPasswordResetRequest(db, payload) {
  if (db.kind === "d1") {
    await d1Run(
      db,
      `INSERT INTO password_reset_requests (id, member_row_id, contact, status, expires_at, created_at)
       VALUES (?, ?, ?, 'requested', ?, CURRENT_TIMESTAMP)`,
      payload.id,
      payload.memberRowId,
      payload.contact,
      payload.expiresAt,
    );
    return;
  }
  await supabaseInsert(db, "password_reset_requests", {
    id: payload.id,
    member_row_id: payload.memberRowId,
    contact: payload.contact,
    status: "requested",
    expires_at: payload.expiresAt,
  }, { prefer: "return=minimal" });
}

export async function createFormSubmission(db, payload) {
  if (db.kind === "d1") {
    await d1Run(
      db,
      `INSERT INTO form_submissions (id, type, member_row_id, name, contact, data_json, status, consent_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'new', ?, CURRENT_TIMESTAMP)`,
      payload.id,
      payload.type,
      payload.memberRowId,
      payload.name,
      payload.contact,
      payload.dataJson,
      payload.consentAt,
    );
    return;
  }
  await supabaseInsert(db, "form_submissions", {
    id: payload.id,
    type: payload.type,
    member_row_id: payload.memberRowId,
    name: payload.name,
    contact: payload.contact,
    data_json: payload.dataJson,
    status: "new",
    consent_at: payload.consentAt,
  }, { prefer: "return=minimal" });
}

export async function createPaymentOrderRecord(db, payload) {
  if (db.kind === "d1") {
    await d1Run(
      db,
      `INSERT INTO payment_orders (id, member_row_id, purpose, reference_id, amount_paise, currency, status, metadata_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'INR', 'created', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      payload.id,
      payload.memberRowId,
      payload.purpose,
      payload.referenceId,
      payload.amountPaise,
      payload.metadataJson,
    );
    return;
  }
  await supabaseInsert(db, "payment_orders", {
    id: payload.id,
    member_row_id: payload.memberRowId,
    purpose: payload.purpose,
    reference_id: payload.referenceId,
    amount_paise: payload.amountPaise,
    currency: "INR",
    status: "created",
    metadata_json: payload.metadataJson,
  }, { prefer: "return=minimal" });
}

export async function createOrderRecord(db, payload) {
  if (db.kind === "d1") {
    await d1Run(
      db,
      `INSERT INTO orders (id, member_row_id, payment_order_id, status, subtotal_paise, total_paise, shipping_json, created_at, updated_at)
       VALUES (?, ?, ?, 'payment_pending', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      payload.id,
      payload.memberRowId,
      payload.paymentOrderId,
      payload.subtotalPaise,
      payload.totalPaise,
      payload.shippingJson,
    );
    return;
  }
  await supabaseInsert(db, "orders", {
    id: payload.id,
    member_row_id: payload.memberRowId,
    payment_order_id: payload.paymentOrderId,
    status: "payment_pending",
    subtotal_paise: payload.subtotalPaise,
    total_paise: payload.totalPaise,
    shipping_json: payload.shippingJson,
  }, { prefer: "return=minimal" });
}

export async function createOrderItems(db, lines) {
  if (!lines.length) return;
  if (db.kind === "d1") {
    await db.db.batch(lines.map((line) => db.db.prepare(
      `INSERT INTO order_items (order_id, item_slug, title_snapshot, quantity, unit_price_paise, line_total_paise)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(line.orderId, line.itemSlug, line.titleSnapshot, line.quantity, line.unitPricePaise, line.lineTotalPaise)));
    return;
  }
  await supabaseInsert(db, "order_items", lines.map((line) => ({
    order_id: line.orderId,
    item_slug: line.itemSlug,
    title_snapshot: line.titleSnapshot,
    quantity: line.quantity,
    unit_price_paise: line.unitPricePaise,
    line_total_paise: line.lineTotalPaise,
  })), { prefer: "return=minimal" });
}

export async function createBookingRecord(db, payload) {
  if (db.kind === "d1") {
    await d1Run(
      db,
      `INSERT INTO bookings (id, member_row_id, payment_order_id, source_type, source_slug, title_snapshot, amount_paise, attendee_count, requested_date, requested_time, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      payload.id,
      payload.memberRowId,
      payload.paymentOrderId,
      payload.sourceType,
      payload.sourceSlug,
      payload.titleSnapshot,
      payload.amountPaise,
      payload.attendeeCount,
      payload.requestedDate,
      payload.requestedTime,
      payload.status,
      payload.notes,
    );
    return;
  }
  await supabaseInsert(db, "bookings", {
    id: payload.id,
    member_row_id: payload.memberRowId,
    payment_order_id: payload.paymentOrderId,
    source_type: payload.sourceType,
    source_slug: payload.sourceSlug,
    title_snapshot: payload.titleSnapshot,
    amount_paise: payload.amountPaise,
    attendee_count: payload.attendeeCount,
    requested_date: payload.requestedDate,
    requested_time: payload.requestedTime,
    status: payload.status,
    notes: payload.notes,
  }, { prefer: "return=minimal" });
}

export async function updatePaymentOrderGatewayState(db, paymentOrderId, values) {
  if (db.kind === "d1") {
    const sets = [];
    const args = [];
    if (values.status) {
      sets.push("status = ?");
      args.push(values.status);
    }
    if (values.gatewayOrderId !== undefined) {
      sets.push("gateway_order_id = ?");
      args.push(values.gatewayOrderId);
    }
    if (values.gatewayPaymentId !== undefined) {
      sets.push("gateway_payment_id = ?");
      args.push(values.gatewayPaymentId);
    }
    if (values.paidAt) {
      sets.push("paid_at = ?");
      args.push(values.paidAt);
    }
    sets.push("updated_at = CURRENT_TIMESTAMP");
    args.push(paymentOrderId);
    await d1Run(db, `UPDATE payment_orders SET ${sets.join(", ")} WHERE id = ?`, ...args);
    return;
  }
  const payload = { updated_at: new Date().toISOString() };
  if (values.status) payload.status = values.status;
  if (values.gatewayOrderId !== undefined) payload.gateway_order_id = values.gatewayOrderId;
  if (values.gatewayPaymentId !== undefined) payload.gateway_payment_id = values.gatewayPaymentId;
  if (values.paidAt) payload.paid_at = values.paidAt;
  await supabaseUpdate(db, "payment_orders", payload, { filters: { id: paymentOrderId } });
}

export async function getPaymentOrderByGatewayOrderAndMember(db, gatewayOrderId, memberRowId) {
  if (db.kind === "d1") {
    return d1First(
      db,
      "SELECT * FROM payment_orders WHERE gateway_order_id = ? AND member_row_id = ?",
      gatewayOrderId,
      memberRowId,
    );
  }
  return one(await supabaseSelect(db, "payment_orders", {
    filters: { gateway_order_id: gatewayOrderId, member_row_id: memberRowId },
    limit: 1,
  }));
}

export async function getPaymentOrderByGatewayOrder(db, gatewayOrderId) {
  if (db.kind === "d1") return d1First(db, "SELECT * FROM payment_orders WHERE gateway_order_id = ?", gatewayOrderId);
  return one(await supabaseSelect(db, "payment_orders", { filters: { gateway_order_id: gatewayOrderId }, limit: 1 }));
}

export async function getPaymentOrderById(db, paymentOrderId) {
  if (db.kind === "d1") return d1First(db, "SELECT * FROM payment_orders WHERE id = ?", paymentOrderId);
  return one(await supabaseSelect(db, "payment_orders", { filters: { id: paymentOrderId }, limit: 1 }));
}

export async function getMemberValidity(db, memberRowId) {
  if (db.kind === "d1") return d1First(db, "SELECT valid_until FROM members WHERE id = ?", memberRowId);
  return one(await supabaseSelect(db, "members", { select: "valid_until", filters: { id: memberRowId }, limit: 1 }));
}

export async function activateMemberMembership(db, memberRowId, values) {
  if (db.kind === "d1") {
    await d1Run(
      db,
      `UPDATE members
       SET plan_id = ?, plan_price_paise = ?, status = 'active', issued_at = ?, valid_until = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      values.planId,
      values.planPricePaise,
      values.issuedAt,
      values.validUntil,
      memberRowId,
    );
    return;
  }
  await supabaseUpdate(db, "members", {
    plan_id: values.planId,
    plan_price_paise: values.planPricePaise,
    status: "active",
    issued_at: values.issuedAt,
    valid_until: values.validUntil,
    updated_at: new Date().toISOString(),
  }, { filters: { id: memberRowId } });
}

export async function updateOrderStatus(db, orderId, status) {
  if (db.kind === "d1") {
    await d1Run(db, "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", status, orderId);
    return;
  }
  await supabaseUpdate(db, "orders", { status, updated_at: new Date().toISOString() }, { filters: { id: orderId } });
}

export async function updateBookingStatus(db, bookingId, status) {
  if (db.kind === "d1") {
    await d1Run(db, "UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", status, bookingId);
    return;
  }
  await supabaseUpdate(db, "bookings", { status, updated_at: new Date().toISOString() }, { filters: { id: bookingId } });
}

export async function getVerificationMemberByToken(db, token) {
  if (db.kind === "d1") {
    return d1First(
      db,
      "SELECT full_name, plan_id, status, valid_until FROM members WHERE verification_token = ?",
      token,
    );
  }
  return one(await supabaseSelect(db, "members", {
    select: "full_name,plan_id,status,valid_until",
    filters: { verification_token: token },
    limit: 1,
  }));
}

export async function rateLimit(db, request, action, maximum, windowSeconds) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const key = await sha256Hex(`${action}:${ip}`);
  const now = Math.floor(Date.now() / 1000);

  if (db.kind === "d1") {
    const existing = await d1First(db, "SELECT count, window_start FROM rate_limits WHERE key = ?", key);
    if (!existing || now - existing.window_start >= windowSeconds) {
      await d1Run(
        db,
        `INSERT INTO rate_limits (key, count, window_start, updated_at)
         VALUES (?, 1, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start, updated_at = CURRENT_TIMESTAMP`,
        key,
        now,
      );
      return;
    }
    if (existing.count >= maximum) {
      throw new ApiError(429, "TOO_MANY_REQUESTS", "Too many attempts. Please wait and try again.");
    }
    await d1Run(db, "UPDATE rate_limits SET count = count + 1, updated_at = CURRENT_TIMESTAMP WHERE key = ?", key);
    return;
  }

  const existing = one(await supabaseSelect(db, "rate_limits", {
    select: "key,count,window_start",
    filters: { key },
    limit: 1,
  }));
  if (!existing || now - existing.window_start >= windowSeconds) {
    await supabaseInsert(db, "rate_limits", {
      key,
      count: 1,
      window_start: now,
    }, { prefer: "resolution=merge-duplicates,return=minimal", onConflict: "key" });
    return;
  }
  if (existing.count >= maximum) {
    throw new ApiError(429, "TOO_MANY_REQUESTS", "Too many attempts. Please wait and try again.");
  }
  await supabaseUpdate(db, "rate_limits", {
    count: Number(existing.count) + 1,
    updated_at: new Date().toISOString(),
  }, { filters: { key } });
}

export async function createSession(db, memberRowId, request, remember = false) {
  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  const id = `ses_${randomHex(12)}`;
  const days = remember ? 30 : 7;
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
  const userAgentHash = await sha256Hex(request.headers.get("user-agent") || "unknown");

  if (db.kind === "d1") {
    await d1Run(
      db,
      `INSERT INTO sessions (id, member_row_id, token_hash, expires_at, created_at, last_seen_at, user_agent_hash)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)`,
      id,
      memberRowId,
      tokenHash,
      expiresAt,
      userAgentHash,
    );
  } else {
    await supabaseInsert(db, "sessions", {
      id,
      member_row_id: memberRowId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      user_agent_hash: userAgentHash,
    }, { prefer: "return=minimal" });
  }

  return { token, cookie: sessionCookie(token, days * 86_400, request.url), expiresAt };
}

export async function sessionMember(env, request, { required = false } = {}) {
  const cookies = parseCookies(request);
  const token = cookies["__Host-olc_session"] || cookies.olc_session;
  if (!token) {
    if (required) throw new ApiError(401, "AUTH_REQUIRED", "Please log in to continue.");
    return null;
  }

  const db = database(env);
  const tokenHash = await sha256Hex(token);
  let member;

  if (db.kind === "d1") {
    member = await d1First(
      db,
      `SELECT m.*, s.id AS session_id, s.expires_at AS session_expires_at
       FROM sessions s
       JOIN members m ON m.id = s.member_row_id
       WHERE s.token_hash = ? AND datetime(s.expires_at) > CURRENT_TIMESTAMP`,
      tokenHash,
    );
  } else {
    const session = one(await supabaseSelect(db, "sessions", {
      select: "id,member_row_id,expires_at",
      filters: { token_hash: tokenHash },
      limit: 1,
    }));
    if (session && new Date(session.expires_at) > new Date()) {
      const row = await getMemberById(db, session.member_row_id);
      member = row ? { ...row, session_id: session.id, session_expires_at: session.expires_at } : null;
    } else {
      member = null;
    }
  }

  if (!member) {
    if (required) throw new ApiError(401, "SESSION_EXPIRED", "Your session has expired. Please log in again.");
    return null;
  }

  if (db.kind === "d1") {
    await d1Run(db, "UPDATE sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?", member.session_id);
  } else {
    await supabaseUpdate(db, "sessions", { last_seen_at: new Date().toISOString() }, { filters: { id: member.session_id } });
  }
  return member;
}

export async function audit(db, action, entityType, entityId = "", memberRowId = null, metadata = {}) {
  if (db.kind === "d1") {
    await d1Run(
      db,
      `INSERT INTO audit_logs (id, member_row_id, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      `aud_${randomHex(12)}`,
      memberRowId,
      action,
      entityType,
      entityId,
      JSON.stringify(metadata),
    );
    return;
  }
  await supabaseInsert(db, "audit_logs", {
    id: `aud_${randomHex(12)}`,
    member_row_id: memberRowId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata_json: JSON.stringify(metadata),
  }, { prefer: "return=minimal" });
}
