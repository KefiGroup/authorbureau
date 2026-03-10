import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, ArrowRight, MessageCircle, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMarketResearch } from "@/hooks/useMarketResearch";
import { ADVISOR_CONTENT, getStudioPath, type AbbyCategory } from "@/config/abbyFrameworkConfig";

interface Props {
  categoryId: string;
  bookId: string;
  bookTitle?: string;
  bookGenre?: string;
}

const difficultyColors: Record<string, string> = {
  Easy: "bg-green-500/15 text-green-700",
  Medium: "bg-amber-500/15 text-amber-700",
  Advanced: "bg-red-500/15 text-red-700",
};

export default function AbbyBuildAdvisor({ categoryId, bookId, bookTitle, bookGenre }: Props) {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();
  const content = ADVISOR_CONTENT[categoryId as AbbyCategory];
  const { data: marketData } = useMarketResearch(bookId, bookTitle, bookGenre);
  if (!content) return null;

  const titleParam = bookTitle ? `&bookTitle=${encodeURIComponent(bookTitle)}` : "";

  return (
    <div className="rounded-xl border border-secondary/30 bg-gradient-to-br from-secondary/5 to-secondary/10 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary/10 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Abby's Build Advisor</p>
          <p className="text-sm font-semibold text-foreground">{content.heading}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-secondary/20 pt-4">
          <p className="text-xs text-muted-foreground leading-relaxed">{content.intro}</p>

          <div className="space-y-3">
            {content.recommendations.map((rec, i) => {
              const studioPath = rec.nodeId ? getStudioPath(rec.nodeId, bookId, titleParam) : null;
              const marketInsight = marketData?.amazonBestsellers?.pricingAnalysis && rec.priceRange
                ? `${rec.label}s in "${marketData.amazonCategory}" are priced ${marketData.amazonBestsellers.pricingAnalysis.lowest}–${marketData.amazonBestsellers.pricingAnalysis.highest}. Median: ${marketData.amazonBestsellers.pricingAnalysis.median}.`
                : null;
              const recommendedPrice = marketData?.amazonBestsellers?.pricingAnalysis?.median;

              return (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3">
                  <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-black text-secondary">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{rec.label}</span>
                      <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${difficultyColors[rec.difficulty]}`}>
                        {rec.difficulty}
                      </span>
                      {recommendedPrice && rec.priceRange ? (
                        <span className="text-[10px] font-semibold text-secondary">
                          {recommendedPrice} Recommended
                        </span>
                      ) : rec.priceRange ? (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {rec.priceRange}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">{rec.reason}</p>

                    {marketInsight && (
                      <div className="flex items-start gap-1.5 mt-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5">
                        <Lightbulb className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                          <strong>Market Insight:</strong> {marketInsight}
                        </p>
                      </div>
                    )}

                    {studioPath && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(studioPath);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary mt-1.5 hover:underline"
                      >
                        Open Studio <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-secondary/10 p-3">
            <Sparkles className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80 leading-relaxed font-medium">{content.closingNote}</p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => navigate(`/dashboard?section=abby&bookId=${bookId}${titleParam}`)}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Ask Abby for personalized advice
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
