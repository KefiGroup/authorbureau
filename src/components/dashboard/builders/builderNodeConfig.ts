/**
 * Lightweight label/icon registry for cross-builder push UI and
 * the Review Products page.
 *
 * The full multi-step config for each node (formerly used by
 * UniversalBuilderStudio) has been retired in favour of the dedicated
 * BPxx / BAxx / YRxx builders. This module now exposes only the metadata
 * those screens need (label, icon, category, approximate step count).
 */

export type BuilderCategory = "build" | "bridge" | "yield";

export interface BuilderNodeConfig {
  id: string;
  label: string;
  icon: string;
  category: BuilderCategory;
  steps: Array<{ id: string; label: string }>;
}

export interface BuilderNodeMeta {
  id: string;
  label: string;
  icon: string; // lucide-react icon name OR emoji (cross-builder UI uses emoji)
  emoji: string;
  category: BuilderCategory;
}

// Single source of truth for all 30 nodes.
const META: BuilderNodeMeta[] = [
  // Brand Products (BP) — category "build"
  { id: "BP-01", label: "Email Marketing", icon: "Mail", emoji: "📧", category: "build" },
  { id: "BP-02", label: "Lead Magnet", icon: "Sparkles", emoji: "🧲", category: "build" },
  { id: "BP-03", label: "Social Media", icon: "Share2", emoji: "📱", category: "build" },
  { id: "BP-04", label: "Author Website", icon: "Globe", emoji: "🌐", category: "build" },
  { id: "BP-05", label: "Webinars", icon: "Video", emoji: "🎥", category: "build" },
  { id: "BP-06", label: "Workbook", icon: "FileText", emoji: "📓", category: "build" },
  { id: "BP-07", label: "Home Study Course", icon: "BookMarked", emoji: "🏠", category: "build" },
  { id: "BP-08", label: "Special Editions", icon: "Sparkles", emoji: "✨", category: "build" },
  { id: "BP-09", label: "Book Sales", icon: "BookOpen", emoji: "📚", category: "build" },

  // Build Authority (BA) — category "bridge"
  { id: "BA-10", label: "Online Course", icon: "GraduationCap", emoji: "🎓", category: "bridge" },
  { id: "BA-11", label: "Home Study Course", icon: "BookMarked", emoji: "🏠", category: "bridge" },
  { id: "BA-12", label: "Membership", icon: "Users", emoji: "🔁", category: "bridge" },
  { id: "BA-13", label: "Group Coaching", icon: "Users", emoji: "👥", category: "bridge" },
  { id: "BA-14", label: "Podcast Tour", icon: "Mic", emoji: "🎤", category: "bridge" },
  { id: "BA-15", label: "Media & PR", icon: "Megaphone", emoji: "📰", category: "bridge" },
  { id: "BA-16", label: "Affiliates", icon: "Heart", emoji: "🤝", category: "bridge" },
  { id: "BA-17", label: "Upsells", icon: "BarChart3", emoji: "📈", category: "bridge" },
  { id: "BA-18", label: "JV Partnerships", icon: "Network", emoji: "🤲", category: "bridge" },

  // Yield Revenue (YR) — category "yield"
  { id: "YR-19", label: "1-on-1 Coaching", icon: "Target", emoji: "🧭", category: "yield" },
  { id: "YR-20", label: "Big Ticket Consulting", icon: "Crown", emoji: "💎", category: "yield" },
  { id: "YR-21", label: "Speaking", icon: "Mic", emoji: "🎤", category: "yield" },
  { id: "YR-22", label: "Corporate Training", icon: "Building2", emoji: "🏢", category: "yield" },
  { id: "YR-23", label: "Mastermind", icon: "Award", emoji: "🧠", category: "yield" },
  { id: "YR-24", label: "Retreats", icon: "Heart", emoji: "🌴", category: "yield" },
  { id: "YR-25", label: "Certification", icon: "ShieldCheck", emoji: "🏅", category: "yield" },
  { id: "YR-26", label: "Conference", icon: "Ticket", emoji: "🎟️", category: "yield" },
  { id: "YR-27", label: "Fundraising", icon: "DollarSign", emoji: "💰", category: "yield" },
  { id: "YR-28", label: "Sponsors", icon: "Briefcase", emoji: "🛡️", category: "yield" },
];

// Default unified flow: Introduction → Generating → Review → Publish → Live
const UNIFIED_STEPS = [
  { id: "introduction", label: "Introduction" },
  { id: "generating", label: "Generating" },
  { id: "review", label: "Review" },
  { id: "publish", label: "Publish" },
  { id: "live", label: "Live" },
];

export const ALL_BUILDER_NODES: BuilderNodeConfig[] = META.map((m) => ({
  id: m.id,
  label: m.label,
  icon: m.icon,
  category: m.category,
  steps: UNIFIED_STEPS,
}));

// Lookup map. Includes lowercase variants for legacy push records that used slugs.
export const BUILDER_NODE_MAP: Record<string, BuilderNodeMeta & { icon: string }> = {};
META.forEach((m) => {
  // CrossBuilder UI uses .icon as an emoji — expose `icon` AS the emoji for those callers,
  // while keeping the real lucide icon name on `.lucideIcon` for the Review page.
  const entry = { ...m, icon: m.emoji, lucideIcon: m.icon } as BuilderNodeMeta & {
    icon: string;
    lucideIcon: string;
  };
  BUILDER_NODE_MAP[m.id] = entry;
  BUILDER_NODE_MAP[m.id.toLowerCase()] = entry;
});
