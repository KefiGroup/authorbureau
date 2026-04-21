/**
 * Lightweight label/icon registry for cross-builder push UI.
 *
 * The full multi-step config for each node (formerly used by
 * UniversalBuilderStudio) has been retired in favour of the dedicated
 * BPxx / BAxx / YRxx builders. The only remaining consumers are the
 * Cross-Builder Push notification components, which need a friendly
 * label + emoji for each node id used in `cross_builder_pushes` records.
 */

export interface BuilderNodeMeta {
  id: string;
  label: string;
  icon: string;
}

const META: BuilderNodeMeta[] = [
  // Brand Products
  { id: "BP-01", label: "Email Marketing", icon: "📧" },
  { id: "BP-02", label: "Lead Magnet", icon: "🧲" },
  { id: "BP-03", label: "Social Media", icon: "📱" },
  { id: "BP-04", label: "Author Website", icon: "🌐" },
  { id: "BP-05", label: "Book Sales", icon: "📚" },
  { id: "BP-06", label: "Workbook", icon: "📓" },
  { id: "BP-07", label: "Audiobook", icon: "🎧" },
  { id: "BP-08", label: "Special Editions", icon: "✨" },
  { id: "BP-09", label: "Podcast", icon: "🎙️" },

  // Build Authority
  { id: "BA-10", label: "Online Course", icon: "🎓" },
  { id: "BA-11", label: "Home Study Course", icon: "🏠" },
  { id: "BA-12", label: "Membership", icon: "🔁" },
  { id: "BA-13", label: "Group Coaching", icon: "👥" },
  { id: "BA-14", label: "Podcast Tour", icon: "🎤" },
  { id: "BA-15", label: "Media & PR", icon: "📰" },
  { id: "BA-16", label: "Affiliates", icon: "🤝" },
  { id: "BA-17", label: "Upsells", icon: "📈" },
  { id: "BA-18", label: "JV Partnerships", icon: "🤲" },

  // Yield Revenue
  { id: "YR-19", label: "1-on-1 Coaching", icon: "🧭" },
  { id: "YR-20", label: "Big Ticket Consulting", icon: "💎" },
  { id: "YR-21", label: "Speaking", icon: "🎤" },
  { id: "YR-22", label: "Corporate Training", icon: "🏢" },
  { id: "YR-23", label: "Mastermind", icon: "🧠" },
  { id: "YR-24", label: "Retreats", icon: "🌴" },
  { id: "YR-25", label: "Certification", icon: "🏅" },
  { id: "YR-26", label: "Conference", icon: "🎟️" },
  { id: "YR-27", label: "Fundraising", icon: "💰" },
  { id: "YR-28", label: "Sponsors", icon: "🛡️" },
];

export const BUILDER_NODE_MAP: Record<string, BuilderNodeMeta> = {};
META.forEach((m) => {
  BUILDER_NODE_MAP[m.id] = m;
  // Also expose lowercase variants for legacy push records that used slugs
  BUILDER_NODE_MAP[m.id.toLowerCase()] = m;
});
