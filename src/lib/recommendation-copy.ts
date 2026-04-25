import type { NodeWithProgress } from "@/hooks/useBookNodeProgress";

/**
 * Stage-aware copy for the "recommended" / "next step" card.
 * Pure function — no data access.
 */
export function buildRecommendationCopy(
  node: NodeWithProgress,
  context: {
    completedInCategory: number;
    totalInCategory: number;
    livePercent?: number;
    previousNodeLabel?: string | null;
  }
): string {
  const { completedInCategory, totalInCategory, livePercent, previousNodeLabel } = context;

  if (node.state === "in-progress" && typeof livePercent === "number" && livePercent > 0) {
    return `${livePercent}% complete — pick up where you left off and finish ${node.label}.`;
  }
  if (completedInCategory === 0) {
    return `Start here. ${node.label} is the fastest path to your first win in this stage.`;
  }
  if (previousNodeLabel) {
    return `Builds on your published "${previousNodeLabel}". Next logical step in your stack.`;
  }
  if (completedInCategory + 1 === totalInCategory) {
    return `Last one in this stage — finish ${node.label} to complete the set.`;
  }
  return `Recommended next: ${node.label} compounds what you've already built.`;
}
