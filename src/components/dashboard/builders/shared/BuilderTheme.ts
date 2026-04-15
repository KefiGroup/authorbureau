export type BuilderCategory = "brand" | "build" | "yield";

export function getBuilderCategory(nodeId: string): BuilderCategory {
  if (nodeId.startsWith("BP-")) return "brand";
  if (nodeId.startsWith("BA-")) return "build";
  if (nodeId.startsWith("YR-")) return "yield";
  return "brand";
}

export const categoryStyles = {
  brand: {
    border: "border-teal-400/30",
    bg: "bg-gradient-to-br from-teal-500/8 via-card to-card",
    iconBg: "bg-teal-500/20",
    iconText: "text-teal-400",
    ring: "ring-teal-400/30",
    stepActive: "bg-teal-500 text-white",
    stepActiveRing: "bg-teal-500 text-white ring-2 ring-teal-400/30",
    stepDone: "bg-teal-500 text-white",
    headerGradient: "from-teal-500/[0.06] via-transparent to-transparent",
    progressBar: "[&>div]:bg-teal-500",
    leftStrip: "bg-teal-500",
    buttonAccent: "bg-teal-600 hover:bg-teal-700 text-white",
    glowShadow: "shadow-[0_0_20px_-4px_hsl(172_55%_40%_/_0.2)]",
    pulseRing: "ring-teal-400/40",
  },
  build: {
    border: "border-indigo-400/30",
    bg: "bg-gradient-to-br from-indigo-500/8 via-card to-card",
    iconBg: "bg-indigo-500/20",
    iconText: "text-indigo-400",
    ring: "ring-indigo-400/30",
    stepActive: "bg-indigo-500 text-white",
    stepActiveRing: "bg-indigo-500 text-white ring-2 ring-indigo-400/30",
    stepDone: "bg-indigo-500 text-white",
    headerGradient: "from-indigo-500/[0.06] via-transparent to-transparent",
    progressBar: "[&>div]:bg-indigo-500",
    leftStrip: "bg-indigo-500",
    buttonAccent: "bg-indigo-600 hover:bg-indigo-700 text-white",
    glowShadow: "shadow-[0_0_20px_-4px_hsl(240_55%_50%_/_0.2)]",
    pulseRing: "ring-indigo-400/40",
  },
  yield: {
    border: "border-amber-400/30",
    bg: "bg-gradient-to-br from-amber-500/8 via-card to-card",
    iconBg: "bg-amber-500/20",
    iconText: "text-amber-400",
    ring: "ring-amber-400/30",
    stepActive: "bg-amber-500 text-white",
    stepActiveRing: "bg-amber-500 text-white ring-2 ring-amber-400/30",
    stepDone: "bg-amber-500 text-white",
    headerGradient: "from-amber-500/[0.06] via-transparent to-transparent",
    progressBar: "[&>div]:bg-amber-500",
    leftStrip: "bg-amber-500",
    buttonAccent: "bg-amber-600 hover:bg-amber-700 text-white",
    glowShadow: "shadow-[0_0_20px_-4px_hsl(38_55%_50%_/_0.2)]",
    pulseRing: "ring-amber-400/40",
  },
} as const;
