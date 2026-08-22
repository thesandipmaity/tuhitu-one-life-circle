const supportIntents = [
  "Membership enquiry",
  "Membership support",
  "Become a partner",
  "Doctor partnership",
  "Society / RWA collaboration",
  "Community / Event enquiry",
  "Order / booking support",
  "Become a Companion",
  "Other"
];

const companionFormConfig = {
  source: "become_companion",
  statuses: ["New application", "Under review", "Verification pending", "Interview scheduled", "Approved", "On hold", "Rejected", "Active companion", "Inactive companion"],
  ageGroups: ["18-24", "25-34", "35-44", "45-59", "60+"],
  languages: ["English", "Hindi", "Punjabi", "Other"],
  occupations: ["Student", "Working professional", "Retired", "Other"],
  interests: ["Spending time and conversation", "Community activities", "Reading and storytelling", "Music, art or creative activities", "Digital assistance", "Mobility and activity support", "Event volunteering", "Wellness-event support", "Caregiver support", "Society activations", "Content or photography support", "Other"],
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  timeSlots: ["Morning", "Afternoon", "Evening"],
  scheduleTypes: ["Weekdays", "Weekends", "Both weekdays and weekends"],
  modes: ["In-person", "Online", "Both"],
  frequencies: ["One-time", "Occasional", "Regular"],
  successMessage: "Thank you for applying to become a One Life Circle Companion. Our team will review your application and contact you regarding the next steps, verification and available participation opportunities.",
};

export { supportIntents, companionFormConfig };
