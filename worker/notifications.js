import { cleanText } from "./security.js";

export function baileysBridgeConfigured(env) {
  return Boolean(env.BAILEYS_BRIDGE_URL);
}

async function sendThroughBaileysBridge(env, registration) {
  const response = await fetch(`${String(env.BAILEYS_BRIDGE_URL).replace(/\/$/, "")}/send-registration`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(env.BAILEYS_BRIDGE_TOKEN ? { authorization: `Bearer ${env.BAILEYS_BRIDGE_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      to: registration.mobile,
      name: registration.fullName,
      memberId: registration.memberId,
      plan: registration.planId,
    }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || `Baileys bridge request failed with status ${response.status}.`);
  }
  return response.json().catch(() => ({ ok: true }));
}

function graphVersion(env) {
  return cleanText(env.WHATSAPP_API_VERSION || "v23.0", 20);
}

export function whatsappNotificationConfigured(env) {
  return baileysBridgeConfigured(env) || Boolean(
    env.WHATSAPP_ACCESS_TOKEN &&
    env.WHATSAPP_PHONE_NUMBER_ID &&
    env.WHATSAPP_ALERT_TO &&
    env.WHATSAPP_TEMPLATE_NAME,
  );
}

export function formatRegistrationWhatsAppSummary(registration) {
  const lines = [
    "New membership registration received.",
    `Member ID: ${cleanText(registration.memberId, 40) || "Pending"}`,
    `Name: ${cleanText(registration.fullName, 120) || "Not provided"}`,
    `Plan: ${cleanText(registration.planId, 30) || "Not provided"}`,
    `Mobile: ${cleanText(registration.mobile, 24) || "Not provided"}`,
    `Email: ${cleanText(registration.email, 254) || "Not provided"}`,
    `City: ${cleanText(registration.city, 80) || "Not provided"}`,
    `Area: ${cleanText(registration.locality, 120) || "Not provided"}`,
    `Interest: ${cleanText(registration.primaryInterest, 120) || "Not provided"}`,
    `Registered at: ${cleanText(registration.registeredAt, 40) || new Date().toISOString()}`,
  ];
  return lines.join("\n").slice(0, 1024);
}

export async function sendRegistrationWhatsAppAlert(env, registration) {
  if (baileysBridgeConfigured(env)) return sendThroughBaileysBridge(env, registration);
  if (!whatsappNotificationConfigured(env)) return { skipped: true, reason: "not_configured" };

  const response = await fetch(`https://graph.facebook.com/${graphVersion(env)}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: cleanText(env.WHATSAPP_ALERT_TO, 20),
      type: "template",
      template: {
        name: cleanText(env.WHATSAPP_TEMPLATE_NAME, 120),
        language: {
          code: cleanText(env.WHATSAPP_TEMPLATE_LANGUAGE || "en", 20),
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: formatRegistrationWhatsAppSummary(registration),
              },
            ],
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || `WhatsApp API request failed with status ${response.status}.`);
  }

  return response.json().catch(() => ({ ok: true }));
}
