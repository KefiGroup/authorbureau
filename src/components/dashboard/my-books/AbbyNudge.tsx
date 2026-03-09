import { Sparkles } from "lucide-react";
import type { JourneyStage } from "./JourneyTracker";

interface AbbyNudgeProps {
  stage: JourneyStage;
  bookTitle: string;
  revenueStreams?: number;
  productsBuilt?: number;
  totalProducts?: number;
  nextProduct?: string;
  monthlyRevenue?: number;
  topProduct?: string;
}

const stageStyles: Record<number, { bg: string; border: string }> = {
  1: { bg: "#FDF6E9", border: "#E8D5A8" },
  2: { bg: "#FDF6E9", border: "#E8D5A8" },
  3: { bg: "#EEF2FF", border: "#C7D2FE" },
  4: { bg: "#CCFBF1", border: "#99F6E4" },
  5: { bg: "#D1FAE5", border: "#A7F3D0" },
};

export default function AbbyNudge({
  stage, bookTitle, revenueStreams = 0, productsBuilt = 0, totalProducts = 0,
  nextProduct, monthlyRevenue = 0, topProduct,
}: AbbyNudgeProps) {
  const style = stageStyles[stage];

  const messages: Record<number, string> = {
    1: `Your microsite for "${bookTitle}" is live! Now let me analyze your book and map up to 27 revenue streams. It's free and takes 2 minutes.`,
    2: `I can map up to 27 revenue streams for "${bookTitle}." This takes about 2 minutes and it's completely free. Ready to unlock your book's earning potential?`,
    3: `Your business plan for "${bookTitle}" is ready with ${revenueStreams} revenue streams! Subscribe to unlock the AI builders and start creating products. Starter is just $49/month — it pays for itself when you sell 2 copies of your $27 course.`,
    4: `Your business plan for "${bookTitle}" is ready with ${revenueStreams} revenue streams mapped.${nextProduct ? ` I recommend starting with ${nextProduct} — it's your highest-ROI move.` : ""} Let's build it!`,
    5: `You earned $${monthlyRevenue} this month from "${bookTitle}."${topProduct ? ` Your top performer is ${topProduct}.` : ""} Here's how to grow 20% next month.`,
  };

  return (
    <div
      className="rounded-lg p-3 flex items-start gap-2.5"
      style={{ backgroundColor: style.bg, borderLeft: `3px solid ${style.border}` }}
    >
      <div className="h-7 w-7 rounded-full bg-[#C4973B]/20 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="h-3.5 w-3.5 text-[#C4973B]" />
      </div>
      <p className="text-xs text-foreground leading-relaxed">{messages[stage]}</p>
    </div>
  );
}
