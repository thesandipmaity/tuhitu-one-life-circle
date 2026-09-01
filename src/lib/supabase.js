import { createClient } from "@supabase/supabase-js";
import { apiRequest } from "./api";
import { plans } from "../data/site-data";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabasePublishableKey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();

let client;

function buildInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "OL";
}

function normalisePhone(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const compact = trimmed.replace(/[^\d+]/g, "");
  if (compact.startsWith("+")) return compact;
  if (compact.length === 10) return `+91${compact}`;
  return `+${compact.replace(/^\+/, "")}`;
}

function createMemberId({ fullName, userId, createdAt }) {
  const initials = buildInitials(fullName).padEnd(3, "X").slice(0, 3);
  const year = new Date(createdAt || Date.now()).getFullYear().toString().slice(-2);
  const unique = String(userId || "").replace(/-/g, "").slice(0, 6).toUpperCase().padEnd(6, "0");
  return `OLC-${initials}-${year}-${unique}`;
}

function mapProfileToMember(profile, user) {
  const metadata = user?.user_metadata || {};
  const fullName = profile.full_name || metadata.fullName || metadata.name || user?.email?.split("@")[0] || "Member";
  const planId = profile.plan_id || metadata.planId || "community";
  const isPaid = Boolean(profile.can_access_store || profile.payment_verified || profile.status === "active" || paidState(metadata));
  return {
    id: user?.id || profile.user_id,
    memberId: profile.member_id || createMemberId({ fullName, userId: user?.id || profile.user_id, createdAt: user?.created_at || profile.created_at }),
    name: fullName,
    initials: buildInitials(fullName),
    email: user?.email || profile.email || metadata.email || "",
    mobile: user?.phone || profile.mobile || metadata.mobile || "",
    city: profile.city || metadata.city || "",
    locality: profile.locality || metadata.locality || "",
    planId,
    plan: profile.plan_name || metadata.planName || planName(planId),
    status: isPaid ? "active" : profile.status || metadata.status || "payment_pending",
    statusLabel: isPaid ? "Active Member" : "Payment Pending",
    issuedAt: user?.created_at || profile.created_at || null,
    validUntil: profile.valid_until || metadata.validUntil || null,
    verificationToken: metadata.verificationToken || user?.id || profile.user_id,
    canAccessStore: isPaid,
  };
}

function planName(planId) {
  return plans.find((plan) => plan.id === planId)?.name || plans[0]?.name || "Community Member";
}

function paidState(metadata = {}) {
  return Boolean(
    metadata.canAccessStore
    || metadata.membershipPaid
    || metadata.paymentVerified
    || metadata.status === "active",
  );
}

export function hasSupabaseAuth() {
  if (typeof __OLC_USE_MONGO_AUTH__ !== "undefined" && __OLC_USE_MONGO_AUTH__) return false;
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function getSupabaseClient() {
  if (!hasSupabaseAuth()) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export function identifierType(value) {
  const input = String(value || "").trim();
  if (input.includes("@")) return "email";
  // Older database profiles may have one or two initials (for example, OLC-SM-26-00001).
  if (/^OLC-[A-Z0-9]{1,3}-\d{2}-[A-Z0-9]{5,}$/i.test(input)) return "member_id";
  if (/^\+?[\d\s-]{10,16}$/.test(input)) return "phone";
  return "unknown";
}

export function mapAuthUserToMember(user) {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  const fullName = metadata.fullName || metadata.name || user.email?.split("@")[0] || "Member";
  const planId = metadata.planId || "community";
  const isPaid = paidState(metadata);
  return {
    id: user.id,
    memberId: metadata.memberId || createMemberId({ fullName, userId: user.id, createdAt: user.created_at }),
    name: fullName,
    initials: buildInitials(fullName),
    email: user.email || metadata.email || "",
    mobile: user.phone || metadata.mobile || "",
    city: metadata.city || "",
    locality: metadata.locality || "",
    planId,
    plan: metadata.planName || planName(planId),
    status: isPaid ? "active" : "payment_pending",
    statusLabel: isPaid ? "Active Member" : "Payment Pending",
    issuedAt: user.created_at || null,
    validUntil: metadata.validUntil || null,
    verificationToken: metadata.verificationToken || user.id,
    canAccessStore: isPaid,
  };
}

export async function resolveAuthMember(supabase, user) {
  if (!user) return null;
  if (!supabase) return mapAuthUserToMember(user);
  try {
    const { data, error } = await supabase
      .from("member_profiles")
      .select("user_id, member_id, full_name, email, mobile, city, locality, age_group, interest, plan_id, plan_name, status, can_access_store, payment_verified, valid_until, created_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return mapAuthUserToMember(user);
    return mapProfileToMember(data, user);
  } catch {
    return mapAuthUserToMember(user);
  }
}

export function buildSupabaseRegistrationPayload(form, planId, loginMethod) {
  const fullName = String(form.fullName || "").trim();
  const email = String(form.email || "").trim().toLowerCase();
  const mobile = normalisePhone(form.mobile);
  const metadata = {
    fullName,
    name: fullName,
    email,
    mobile,
    city: String(form.city || "").trim(),
    locality: String(form.locality || "").trim(),
    ageGroup: form.ageGroup || "",
    interest: form.interest || "",
    planId,
    planName: planName(planId),
    loginMethod,
    canAccessStore: false,
    status: "payment_pending",
  };
  if (loginMethod === "phone") return { phone: mobile, password: form.password, options: { data: metadata } };
  return {
    email,
    password: form.password,
    options: {
      emailRedirectTo: `${window.location.origin}/account`,
      data: metadata,
    },
  };
}

export function normaliseAuthIdentifier(identifier) {
  const type = identifierType(identifier);
  const trimmed = String(identifier || "").trim();
  return {
    type,
    value: type === "phone" ? normalisePhone(trimmed) : type === "member_id" ? trimmed.toUpperCase() : trimmed.toLowerCase(),
  };
}

export async function resolveSupabaseAuthIdentifier(identifier) {
  const normalized = normaliseAuthIdentifier(identifier);
  if (normalized.type === "unknown") {
    throw new Error("Enter a valid Member ID, email address or mobile number.");
  }
  if (normalized.type !== "member_id") return normalized;

  const response = await apiRequest("/api/auth/resolve-login", {
    method: "POST",
    body: { identifier: normalized.value },
  });
  return {
    type: response.authType,
    value: response.authIdentifier,
    memberId: response.memberId || normalized.value,
  };
}
