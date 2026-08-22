import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const members = sqliteTable("members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: text("member_id").unique(),
  verificationToken: text("verification_token").unique(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  emailNormalized: text("email_normalized").notNull().unique(),
  mobile: text("mobile").notNull(),
  mobileNormalized: text("mobile_normalized").notNull().unique(),
  city: text("city").notNull(),
  locality: text("locality").notNull().default(""),
  ageGroup: text("age_group").notNull().default(""),
  primaryInterest: text("primary_interest").notNull().default(""),
  planId: text("plan_id").notNull(),
  planPricePaise: integer("plan_price_paise").notNull(),
  status: text("status").notNull().default("pending_payment"),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordIterations: integer("password_iterations").notNull().default(210000),
  issuedAt: text("issued_at"),
  validUntil: text("valid_until"),
  consentAt: text("consent_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  memberRowId: integer("member_row_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  userAgentHash: text("user_agent_hash").notNull().default(""),
}, (table) => [index("sessions_member_idx").on(table.memberRowId), index("sessions_expiry_idx").on(table.expiresAt)]);

export const paymentOrders = sqliteTable("payment_orders", {
  id: text("id").primaryKey(),
  memberRowId: integer("member_row_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  referenceId: text("reference_id").notNull(),
  amountPaise: integer("amount_paise").notNull(),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("created"),
  gatewayOrderId: text("gateway_order_id").unique(),
  gatewayPaymentId: text("gateway_payment_id").unique(),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  paidAt: text("paid_at"),
}, (table) => [index("payment_orders_member_idx").on(table.memberRowId), index("payment_orders_status_idx").on(table.status)]);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  memberRowId: integer("member_row_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  paymentOrderId: text("payment_order_id").references(() => paymentOrders.id),
  status: text("status").notNull().default("payment_pending"),
  subtotalPaise: integer("subtotal_paise").notNull(),
  totalPaise: integer("total_paise").notNull(),
  shippingJson: text("shipping_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("orders_member_idx").on(table.memberRowId), index("orders_status_idx").on(table.status)]);

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  itemSlug: text("item_slug").notNull(),
  titleSnapshot: text("title_snapshot").notNull(),
  quantity: integer("quantity").notNull(),
  unitPricePaise: integer("unit_price_paise").notNull(),
  lineTotalPaise: integer("line_total_paise").notNull(),
}, (table) => [index("order_items_order_idx").on(table.orderId)]);

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(),
  memberRowId: integer("member_row_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  paymentOrderId: text("payment_order_id").references(() => paymentOrders.id),
  sourceType: text("source_type").notNull(),
  sourceSlug: text("source_slug").notNull(),
  titleSnapshot: text("title_snapshot").notNull(),
  amountPaise: integer("amount_paise").notNull().default(0),
  attendeeCount: integer("attendee_count").notNull().default(1),
  requestedDate: text("requested_date"),
  requestedTime: text("requested_time"),
  status: text("status").notNull().default("payment_pending"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("bookings_member_idx").on(table.memberRowId), index("bookings_status_idx").on(table.status)]);

export const formSubmissions = sqliteTable("form_submissions", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  memberRowId: integer("member_row_id").references(() => members.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  dataJson: text("data_json").notNull(),
  status: text("status").notNull().default("new"),
  consentAt: text("consent_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("form_submissions_type_idx").on(table.type), index("form_submissions_status_idx").on(table.status)]);

export const passwordResetRequests = sqliteTable("password_reset_requests", {
  id: text("id").primaryKey(),
  memberRowId: integer("member_row_id").references(() => members.id, { onDelete: "cascade" }),
  contact: text("contact").notNull(),
  status: text("status").notNull().default("requested"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("password_reset_member_idx").on(table.memberRowId)]);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: integer("window_start").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  memberRowId: integer("member_row_id").references(() => members.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull().default(""),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("audit_logs_member_idx").on(table.memberRowId), index("audit_logs_action_idx").on(table.action)]);
