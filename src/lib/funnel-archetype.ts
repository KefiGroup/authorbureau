/**
 * Shared archetype constants for funnel UIs.
 * Single source of truth used by FunnelsHub and the per-node funnel flow chart.
 */
export type ArchetypeKey = "A" | "B" | "C" | "D";

export const ARCHETYPE_TO_FUNNEL_TYPE: Record<ArchetypeKey, string> = {
  A: "sales",
  B: "opt_in",
  C: "application",
  D: "event",
};

export const ARCHETYPE_LABEL: Record<ArchetypeKey, string> = {
  A: "Sales",
  B: "Opt-in",
  C: "Application",
  D: "Event",
};

/** Tailwind classes for the per-archetype accent (chips, badges, dots). */
export const ARCHETYPE_ACCENT: Record<ArchetypeKey, string> = {
  A: "border-amber-400/50 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100",
  B: "border-sky-400/50 bg-sky-50 text-sky-900 dark:bg-sky-900/20 dark:text-sky-100",
  C: "border-violet-400/50 bg-violet-50 text-violet-900 dark:bg-violet-900/20 dark:text-violet-100",
  D: "border-emerald-400/50 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100",
};

export const COLOR_PRESETS = [
  { bg: "#0B1220", accent: "#D4AF37", name: "Navy + Gold" },
  { bg: "#0F172A", accent: "#38BDF8", name: "Slate + Sky" },
  { bg: "#1E1B4B", accent: "#A78BFA", name: "Indigo + Violet" },
  { bg: "#7F1D1D", accent: "#FCD34D", name: "Crimson + Amber" },
  { bg: "#064E3B", accent: "#34D399", name: "Emerald" },
  { bg: "#111827", accent: "#F472B6", name: "Charcoal + Pink" },
];
