const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual Entry",
  csv_import: "CSV Import",
  lead_magnet: "Lead Magnet",
  quiz_opt_in: "Quiz Opt-In",
  website_form: "Website Form",
  consultation: "Consultation",
  course_signup: "Course Signup",
  event_attendee: "Event Attendee",
  referral: "Referral",
  social_media: "Social Media",
  podcast: "Podcast",
  webinar: "Webinar",
  microsite: "Author Page",
  "microsite-BP-02": "Author Page — Quiz",
  "microsite-BP-04": "Author Page — Website",
  "microsite-BP-05": "Author Page — Webinar",
};

export function getSourceLabel(source: string | null | undefined): string {
  if (!source) return "Unknown";
  if (SOURCE_LABELS[source]) return SOURCE_LABELS[source];
  // Handle dynamic microsite-XX patterns
  if (source.startsWith("microsite-")) {
    const nodeId = source.replace("microsite-", "");
    return `Author Page — ${nodeId}`;
  }
  return source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
