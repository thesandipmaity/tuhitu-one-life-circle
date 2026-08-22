const plans = [
  {
    id: "community",
    name: "Community",
    regularPrice: 12000,
    annualPrice: 6000,
    potentialValue: 50000,
    potentialValueLabel: "₹50,000+",
    valueHeadline: "Pay ₹6,000. Access potential annual value worth ₹50,000+.",
    billingPeriod: "year",
    billingType: "annual-upfront",
    badge: "Limited Launch Price",
    summary: "Monthly companionship and wellness benefits, experiences and year-round member savings.",
    bestFor: "Individuals and families who want a high-value entry into the complete Circle.",
    refreshLabel: "Core benefit allowances refresh monthly",
    benefits: [
      "Up to 2 companionship calls and/or visits each month",
      "1 eligible Panchakarma benefit each month — up to ₹5,000 value",
      "1 eligible Ayurveda therapy each month — up to ₹5,000 value",
      "1 eligible physiotherapy session each month — up to ₹1,000 value",
      "Selected community and experience access — up to ₹5,000 annual value",
      "20–30% illustrative savings on eligible Store purchases"
    ],
    valueExamples: [
      { label: "Companionship", detail: "Up to 2 calls and/or visits", cadence: "Each month", icon: "community" },
      { label: "Panchakarma", detail: "1 eligible benefit · up to ₹5,000 value", cadence: "Each month", icon: "wellness" },
      { label: "Ayurveda therapy", detail: "1 eligible therapy · up to ₹5,000 value", cadence: "Each month", icon: "spark" },
      { label: "Physiotherapy", detail: "1 eligible session · up to ₹1,000 value", cadence: "Each month", icon: "heart" },
      { label: "Community & experiences", detail: "Selected activities and member access", cadence: "Up to ₹5,000/year", icon: "calendar" },
      { label: "Member Store savings", detail: "20–30% illustrative discount on eligible purchases", cadence: "Spend dependent", icon: "bag" }
    ],
    cta: "Choose Community",
    featured: false,
    active: true
  },
  {
    id: "active",
    name: "Active",
    annualPrice: 24000,
    potentialValue: 100000,
    potentialValueLabel: "₹1 lakh+",
    valueHeadline: "Pay ₹24,000. Access potential annual value worth ₹1 lakh+.",
    billingPeriod: "year",
    billingType: "annual-upfront",
    badge: "Most Popular",
    summary: "More monthly wellness access, stronger savings and priority across selected benefits.",
    bestFor: "Members who expect to use wellness bookings, experiences and partner benefits more often.",
    refreshLabel: "Higher benefit allowances refresh monthly",
    benefits: [
      "Everything in Community",
      "Higher monthly physiotherapy, Ayurveda and selected therapy allowances",
      "Enhanced selected partner benefits and stronger discounts",
      "Priority access to selected wellness bookings",
      "Preferred experience pricing",
      "Early access to selected offers"
    ],
    valueExamples: [
      { label: "Everything in Community", detail: "Companionship, wellness, experiences and Store access", cadence: "Included", icon: "check" },
      { label: "More monthly wellness", detail: "Higher eligible allocations across physiotherapy, Ayurveda and therapies", cadence: "Each month", icon: "wellness" },
      { label: "Enhanced savings", detail: "Stronger selected partner and Store benefits", cadence: "Year-round", icon: "bag" },
      { label: "Priority bookings", detail: "Earlier access to selected wellness slots", cadence: "When available", icon: "calendar" },
      { label: "Preferred experiences", detail: "Better eligible pricing and earlier access", cadence: "Programme based", icon: "community" }
    ],
    cta: "Choose Active",
    featured: true,
    active: true
  },
  {
    id: "signature",
    name: "Signature",
    annualPrice: 48000,
    potentialValue: 200000,
    potentialValueLabel: "₹2 lakh+",
    valueHeadline: "Pay ₹48,000. Access potential annual value worth ₹2 lakh+.",
    billingPeriod: "year",
    billingType: "annual-upfront",
    summary: "The highest monthly benefit access, strongest privileges and most premium experiences.",
    bestFor: "Members who value the highest available privileges, support and premium experiences.",
    refreshLabel: "Highest benefit allowances refresh monthly",
    benefits: [
      "Everything in Active",
      "Highest monthly eligible wellness and therapy allowances",
      "Highest selected partner privileges and relevant brand savings",
      "Highest booking priority and priority support",
      "Exclusive and premium experiences",
      "Earliest access to selected services, offers and benefits"
    ],
    valueExamples: [
      { label: "Everything in Active", detail: "All Community and enhanced Active access", cadence: "Included", icon: "check" },
      { label: "Highest monthly wellness", detail: "The strongest eligible therapy and wellness allocations", cadence: "Each month", icon: "wellness" },
      { label: "Maximum privileges", detail: "The widest selected partner and relevant brand savings", cadence: "Year-round", icon: "spark" },
      { label: "Highest priority", detail: "Priority support and the earliest selected booking access", cadence: "When available", icon: "calendar" },
      { label: "Exclusive experiences", detail: "Premium and invitation-led community programming", cadence: "Programme based", icon: "community" }
    ],
    cta: "Choose Signature",
    featured: false,
    active: true
  }
];

const benefitCategories = [
  {
    title: "Member Store",
    copy: "Curated products, services and experiences with protected member pricing.",
    image: "/assets/young-everyday-choices.webp"
  },
  {
    title: "Wellness & Therapies",
    copy: "Selected Ayurveda, Panchakarma, physiotherapy, mobility, recovery and wellness services.",
    image: "/assets/therapy-ayurveda.webp"
  },
  {
    title: "Better Everyday Choices",
    copy: "Healthier foods, practical wellness products and useful everyday alternatives.",
    image: "/assets/wellness-category.webp"
  },
  {
    title: "Community & Experiences",
    copy: "Movement, learning, family activities, local experiences and social connection.",
    image: "/assets/intergenerational-community.webp"
  },
  {
    title: "Companionship",
    copy: "A dedicated programme for meaningful intergenerational engagement with older adults.",
    image: "/assets/intergenerational-community.webp"
  },
  {
    title: "Partner Benefits",
    copy: "Selected privileges that evolve as approved partners and locations join the Circle.",
    image: "/assets/diagnostics-consultation.webp"
  }
];

const comparisonRows = [
  { category: "Potential value", label: "Illustrative annual benefit value", community: "₹50,000+", active: "₹1 lakh+", signature: "₹2 lakh+" },
  { category: "Companionship", label: "Calls and/or visits", community: "Up to 2/month", active: "Included + enhanced access", signature: "Highest eligible access" },
  { category: "Panchakarma", label: "Eligible monthly benefit", community: "1/month · up to ₹5,000 value", active: "Higher monthly allocation", signature: "Highest monthly allocation" },
  { category: "Ayurveda", label: "Eligible monthly therapy", community: "1/month · up to ₹5,000 value", active: "Higher monthly allocation", signature: "Highest monthly allocation" },
  { category: "Physiotherapy", label: "Eligible monthly session", community: "1/month · up to ₹1,000 value", active: "Higher monthly allocation", signature: "Highest monthly allocation" },
  { category: "Store", label: "Savings on eligible purchases", community: "Illustrative 20–30%", active: "Enhanced", signature: "Highest selected savings" },
  { category: "Community & Experiences", label: "Experience access and pricing", community: "Selected · up to ₹5,000 annual value", active: "Preferred", signature: "Premium & exclusive" },
  { category: "Priority Access", label: "Selected booking priority", community: "Standard", active: "Priority", signature: "Highest priority" },
  { category: "Support", label: "Member support", community: "Standard", active: "Priority", signature: "Highest priority" }
];

function getPlan(planId) {
  return plans.find((plan) => plan.id === planId) || plans[0];
}

export { plans, benefitCategories, comparisonRows, getPlan };
