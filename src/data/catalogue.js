import { products } from "./products.js";
import { services } from "./services.js";
import { experiences } from "./experiences.js";

const catalogue = [...services, ...products, ...experiences];

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
  if (!item.listPrice || !item.memberPrice || item.memberPrice >= item.listPrice) return null;
  return item.listPrice - item.memberPrice;
}

export { catalogue, categoryFilters, formatCurrency, savingFor };
