import { products } from "./products.js";
import { services } from "./services.js";
import { experiences } from "./experiences.js";

const MEMBER_DISCOUNT_RATE = 0.2;

function discountedMemberPrice(listPrice, fallback = 0) {
  const amount = Number(listPrice || 0);
  if (amount > 0) return Math.round(amount * (1 - MEMBER_DISCOUNT_RATE));
  return Number(fallback || 0);
}

const catalogue = [...services, ...products, ...experiences].map((item) => ({
  ...item,
  memberPrice: discountedMemberPrice(item.listPrice, item.memberPrice),
}));

const categoryFilters = [
  "All",
  "Nutrition & Wellness",
  "Better Everyday Food",
  "Healthy Convenience",
  "Panchakarma & Ayurveda",
  "Diagnostics",
  "Consultations",
  "Physiotherapy",
  "Nutrition",
  "Mental wellness",
  "Fitness",
  "Family Wellness",
  "Personal Care",
  "Senior Support",
  "Experiences"
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function savingFor(item) {
  const memberPrice = discountedMemberPrice(item?.listPrice, item?.memberPrice);
  if (!item?.listPrice || !memberPrice || memberPrice >= item.listPrice) return null;
  return item.listPrice - memberPrice;
}

function pricingForItem(item) {
  const listPrice = Number(item?.listPrice || 0);
  const memberPrice = discountedMemberPrice(listPrice, item?.memberPrice);
  return {
    listPrice,
    memberPrice,
    saving: savingFor({ listPrice, memberPrice }),
  };
}

export { catalogue, categoryFilters, formatCurrency, pricingForItem, savingFor };
