const membershipFaqs = [
  {
    question: "What is One Life Circle?",
    answer: "One Life Circle is a membership ecosystem connecting members with selected wellness services, products, experiences, community programmes and partner benefits."
  },
  {
    question: "Who can become a member?",
    answer: "One Life Circle is designed for people across different life stages — from students and young adults to families, middle-aged adults and seniors."
  },
  {
    question: "Is the membership annual?",
    answer: "Yes. Community, Active and Signature are annual memberships paid upfront."
  },
  {
    question: "Why is Community shown at ₹6,000 instead of ₹12,000?",
    answer: "₹6,000 is the current introductory annual membership price. ₹12,000 is the regular annual price."
  },
  {
    question: "Is the Store available to non-members?",
    answer: "Visitors can preview selected categories and partners, but member pricing and member-only purchasing or booking require an active membership."
  },
  {
    question: "Can my family use One Life Circle?",
    answer: "One Life Circle is designed around individual and family wellbeing. Specific account-sharing or family-member eligibility follows the approved membership terms."
  },
  {
    question: "What types of benefits can members receive?",
    answer: "Benefits may include preferred pricing on selected products and wellness services, access to member experiences, community programmes and partner offers. Availability varies by plan, location and partner."
  },
  {
    question: "Are all events included in membership?",
    answer: "Event pricing and eligibility may vary. Each event clearly states whether it is included, discounted or separately chargeable."
  },
  {
    question: "How do I receive my membership card?",
    answer: "After membership activation, eligible members receive their unique digital Member ID and membership card."
  },
  {
    question: "Can partners and benefits change?",
    answer: "Yes. The ecosystem will continue to evolve. Current availability is subject to partner and programme terms."
  }
];

const supportFaqs = [
  {
    question: "How do I receive or replace my digital card?",
    answer: "After membership activation, members receive a unique ID and digital card. Contact membership support if your approved card needs to be reissued."
  },
  {
    question: "Where are current services available?",
    answer: "The launch experience focuses on Panchkula, Chandigarh, Mohali and the Tricity region. Every listing states its available location or fulfilment area."
  },
  {
    question: "How can a brand, doctor or society collaborate?",
    answer: "Choose the relevant enquiry type in the support form so partner, doctor and society/RWA opportunities can be routed correctly."
  }
];

const faqs = [
  ...membershipFaqs.map((item, index) => ({ ...item, page: "membership", order: index + 1 })),
  ...supportFaqs.map((item, index) => ({ ...item, page: "support", order: index + 1 }))
];

export { faqs };
