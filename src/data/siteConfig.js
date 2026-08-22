const contactConfig = {
  // Add the approved number through VITE_WHATSAPP_NUMBER; the UI hides WhatsApp actions until then.
  whatsappDisplay: "+91XXXXXXXXXX",
  whatsappDigits: import.meta.env.VITE_WHATSAPP_NUMBER || "",
  email: "support@onelifecircle.in",
  address: "Panchkula, Haryana",
  serviceArea: "Panchkula, Chandigarh, Mohali and the Tricity region",
  businessHours: "Monday-Saturday, 9:30 AM-6:00 PM",
  website: "www.onelifecircle.in",
  socialLinks: {
    instagram: "#",
    facebook: "#",
    linkedin: "#"
  },
  launchConfiguration: "management-approved values with partner activation controls"
};

const pageMessages = {
  membership: "Hello One Life Circle, I would like help choosing a membership plan.",
  store: "Hello One Life Circle, I need help with the Member Store.",
  product: "Hello One Life Circle, I would like help with a product in the Member Store.",
  booking: "Hello One Life Circle, I need help with a booking.",
  partner: "Hello One Life Circle, I would like to explore a partner collaboration.",
  doctor: "Hello One Life Circle, I would like to discuss a doctor partnership.",
  society: "Hello One Life Circle, I would like to plan an activity for our society/RWA.",
  companion: "Hello One Life Circle, I would like to learn more about becoming a Companion.",
  order: "Hello One Life Circle, I need help with an order.",
  support: "Hello One Life Circle, I need member support."
};

const siteMeta = {
  title: "One Life Circle | ₹50,000+ Potential Value from ₹6,000/Year",
  description: "TuHiTu One Life Circle is a curated community for activities, wellness experiences and exclusive privileges across 100+ brands. Plans start at ₹6,000/year."
};

export { contactConfig, pageMessages, siteMeta };
