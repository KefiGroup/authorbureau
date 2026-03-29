import { Sparkles } from "lucide-react";
import type { JourneyStage } from "./JourneyTracker";
import type { SubscriptionTier } from "@/hooks/useAuth";

interface AbbyNudgeProps {
  stage: JourneyStage;
  bookTitle: string;
  tier: SubscriptionTier;
  revenueStreams?: number;
  productsBuilt?: number;
  totalProducts?: number;
  nextProduct?: string;
  monthlyRevenue?: number;
  topProduct?: string;
  revenueRange?: string;
}

const stageStyles: Record<number, { bg: string; border: string }> = {
  1: { bg: "#FDF6E9", border: "#E8D5A8" },
  2: { bg: "#FDF6E9", border: "#E8D5A8" },
  3: { bg: "#EEF2FF", border: "#C7D2FE" },
  4: { bg: "#CCFBF1", border: "#99F6E4" },
  5: { bg: "#D1FAE5", border: "#A7F3D0" },
};

function getStyleForState(stage: JourneyStage, tier: SubscriptionTier) {
  // Analyzed + subscribed = teal style
  if (stage >= 4) return stageStyles[4];
  // Analyzed + free = indigo style
  if (stage === 3 && tier === "free") return stageStyles[3];
  // Analyzed + paid = teal style (ready to build)
  if (stage === 3) return stageStyles[4];
  return stageStyles[stage];
}

export default function AbbyNudge({
  stage, bookTitle, tier, revenueStreams = 12, productsBuilt = 0, totalProducts = 12,
  nextProduct, monthlyRevenue = 0, topProduct, revenueRange = "$8,000–$30,000",
}: AbbyNudgeProps) {
  const style = getStyleForState(stage, tier);

  const getMessage = (): string => {
    // Stage 1: Microsite only — needs analysis
    if (stage === 1) {
      return `Your microsite for "${bookTitle}" is live! Now let me analyze your book and map up to 28 revenue streams. It's free and takes about 5 minutes.`;
    }

    // Stage 2: Needs analysis (book page live but not analyzed)
    if (stage === 2) {
      return `I can map up to 28 revenue streams for "${bookTitle}." This takes about 5 minutes and it's completely free. Ready to unlock your book's earning potential?`;
    }

    // Stage 3: Analyzed but needs subscription (only happens when tier === "free")
    if (stage === 3) {
      return `Your business plan for "${bookTitle}" is ready with ${revenueStreams} revenue streams mapped! Projected revenue: ${revenueRange}/month by Month 12. Subscribe to unlock the builders and start creating products. Starter is $49/mo — it pays for itself when you sell just 2 copies of your $27 course.`;
    }

    // Stage 4+: Analyzed AND subscribed — tier-specific messages
    if (tier === "brand") {
      return `Your business plan for "${bookTitle}" recommends ${totalProducts} products. With Starter, you can build workbooks, social media content, and email sequences. ${nextProduct ? `I recommend starting with "${nextProduct}" — your quickest win!` : "Let's start building!"}`;
    }
    if (tier === "build") {
      return `Your business plan for "${bookTitle}" has ${totalProducts} products ready to build across Brand + Build. ${nextProduct ? `I recommend starting with "${nextProduct}" — projected at ${revenueRange}/month.` : ""} Let's go!`;
    }
    if (tier === "yield") {
      return `All 28 builders are unlocked for "${bookTitle}"! Your plan maps ${revenueStreams} revenue streams with projected revenue of ${revenueRange}/month. ${nextProduct ? `I recommend starting with "${nextProduct}" — your highest-ROI move.` : ""} Ready to build?`;
    }

    // Stage 5: Earning
    if (stage === 5) {
      return `You earned $${monthlyRevenue} this month from "${bookTitle}."${topProduct ? ` Your top performer is ${topProduct}.` : ""} Here's how to grow 20% next month.`;
    }

    // Fallback for paid tiers in building stage
    return `Your business plan for "${bookTitle}" is ready with ${revenueStreams} revenue streams mapped.${nextProduct ? ` I recommend starting with ${nextProduct} — it's your highest-ROI move.` : ""} Let's build it!`;
  };

  return (
    <div
      className="rounded-lg p-3 flex items-start gap-2.5"
      style={{ backgroundColor: style.bg, borderLeft: `3px solid ${style.border}` }}
    >
      <div className="h-7 w-7 rounded-full bg-[#C4973B]/20 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="h-3.5 w-3.5 text-[#C4973B]" />
      </div>
      <p className="text-xs text-foreground leading-relaxed">{getMessage()}</p>
    </div>
  );
}
