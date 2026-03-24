/**
 * ROI Banner — Shows portfolio revenue projection vs subscription cost
 * 
 * Displays at the top of Book Hub and inside builders when Act 3 completes.
 * Calculates live ROI from the author's product portfolio.
 */

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, AlertTriangle, Sparkles, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  analyzePortfolio,
  buildPortfolioFromAssets,
  getGapRecommendation,
  getTierConfig,
  VALUE_LADDER_TIERS,
  type PortfolioAnalysis,
  type ValueLadderPosition,
} from "@/lib/value-ladder-engine";
import type { SubscriptionTier } from "@/hooks/useAuth";

interface ROIBannerProps {
  bookId: string;
  authorId: string;
  tier: SubscriptionTier;
  /** Compact mode for inside builders */
  compact?: boolean;
  /** Callback to navigate to a builder */
  onNavigateBuilder?: (builderId: string) => void;
}

export default function ROIBanner({
  bookId,
  authorId,
  tier,
  compact = false,
  onNavigateBuilder,
}: ROIBannerProps) {
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => {
    if (!authorId || !bookId) return;
    loadPortfolio();
  }, [authorId, bookId, tier, loadPortfolio]);

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const { data: assets } = await supabase
        .from("generated_assets")
        .select("asset_type, content")
        .eq("author_id", authorId)
        .eq("book_id", bookId)
        .or("asset_type.like.builder_content_%,asset_type.like.builder_draft_%");

      if (!assets || assets.length === 0) {
        setAnalysis(null);
        setLoading(false);
        return;
      }

      const products = buildPortfolioFromAssets(assets);
      if (products.length === 0) {
        setAnalysis(null);
        setLoading(false);
        return;
      }

      const result = analyzePortfolio(products, tier);
      setAnalysis(result);
    } catch (err) {
      console.error("ROI Banner load error:", err);
    }
    setLoading(false);
  };

  const gapRec = useMemo(() => {
    if (!analysis) return null;
    return getGapRecommendation(analysis.gaps);
  }, [analysis]);

  if (loading || !analysis) return null;

  const roiPositive = analysis.roiMultiplier >= 1;
  const roiColor = analysis.roiMultiplier >= 5 ? "text-emerald-600" :
    analysis.roiMultiplier >= 2 ? "text-accent" :
    analysis.roiMultiplier >= 1 ? "text-primary" : "text-amber-600";

  // ── Compact mode for builders ─────────────────────────────────
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <Card className="border-accent/20 bg-accent/5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between p-3 text-left"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold">
                Portfolio: ${analysis.projectedMonthlyRevenue.toLocaleString()}/mo projected
              </span>
              <Badge variant="outline" className={`text-[10px] ${roiColor}`}>
                {analysis.roiMultiplier}x ROI
              </Badge>
            </div>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {expanded && (
            <CardContent className="pt-0 pb-3 px-3">
              <div className="flex gap-2 flex-wrap">
                {VALUE_LADDER_TIERS.map(vlt => {
                  const filled = analysis.filledPositions.includes(vlt.position);
                  return (
                    <div
                      key={vlt.position}
                      className={`px-2 py-1 rounded text-[10px] font-medium border ${
                        filled
                          ? `${vlt.color} ${vlt.textColor} border-transparent`
                          : "bg-muted/30 text-muted-foreground/50 border-dashed border-muted-foreground/20"
                      }`}
                    >
                      {filled ? "✓" : "○"} {vlt.label}
                    </div>
                  );
                })}
              </div>
              {gapRec && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  💡 Gap: {gapRec.reason}
                </p>
              )}
            </CardContent>
          )}
        </Card>
      </motion.div>
    );
  }

  // ── Full mode for Book Hub ────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-background overflow-hidden">
        <CardContent className="p-5">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold">Revenue Intelligence</p>
              <p className="text-xs text-muted-foreground">
                {analysis.products.length} {analysis.products.length === 1 ? "product" : "products"} in your portfolio
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="text-center p-3 rounded-lg bg-background border border-border">
              <p className="text-lg font-bold text-foreground">
                ${analysis.projectedMonthlyRevenue.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">Projected / Month</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background border border-border">
              <p className="text-lg font-bold text-foreground">
                ${analysis.projectedAnnualRevenue.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">Projected / Year</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background border border-border">
              <p className={`text-lg font-bold ${roiColor}`}>
                {analysis.roiMultiplier}x
              </p>
              <p className="text-[10px] text-muted-foreground">
                ROI on ${analysis.subscriptionCost}/mo
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background border border-border">
              <p className="text-lg font-bold text-foreground">
                ${analysis.netMonthlyRevenue.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">Net (after 5% fee)</p>
            </div>
          </div>

          {/* Value Ladder Visual */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-secondary" />
              Your Value Ladder
            </p>
            <div className="flex gap-1">
              {VALUE_LADDER_TIERS.map((vlt, idx) => {
                const filled = analysis.filledPositions.includes(vlt.position);
                const productCount = analysis.products.filter(
                  p => p.valueLadderPosition === vlt.position
                ).length;
                return (
                  <div
                    key={vlt.position}
                    className="flex-1 relative"
                  >
                    <div
                      className={`h-10 rounded-md flex items-center justify-center transition-all ${
                        filled
                          ? `${vlt.color} ${vlt.textColor} border-2 border-current/20`
                          : "bg-muted/40 border-2 border-dashed border-muted-foreground/15"
                      }`}
                      style={{ minHeight: `${28 + idx * 6}px` }}
                    >
                      {filled ? (
                        <span className="text-[10px] font-bold">{productCount}</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      )}
                    </div>
                    <p className={`text-[9px] text-center mt-1 ${filled ? "font-medium" : "text-muted-foreground/50"}`}>
                      {vlt.label.split(" ")[0]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gap Recommendation */}
          {gapRec && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-0.5">
                    Value Ladder Gap: {getTierConfig(gapRec.position).label}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300/80">
                    {gapRec.reason}
                  </p>
                  {onNavigateBuilder && gapRec.suggestedBuilders.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-amber-700 hover:text-amber-900 mt-1 -ml-2 h-7"
                      onClick={() => onNavigateBuilder(gapRec.suggestedBuilders[0])}
                    >
                      Build your {getTierConfig(gapRec.position).label.toLowerCase()}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Product list */}
          {analysis.products.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold mb-2">Products by Value Ladder</p>
              <div className="space-y-1">
                {analysis.products
                  .sort((a, b) => a.price - b.price)
                  .map(product => {
                    const tierConfig = getTierConfig(product.valueLadderPosition);
                    return (
                      <div
                        key={product.builderId}
                        className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
                      >
                        <span className={`w-2 h-2 rounded-full ${tierConfig.color.replace("bg-", "bg-")}`} />
                        <span className="font-medium flex-1">{product.builderLabel}</span>
                        <span className="text-muted-foreground">
                          {product.price > 0 ? `$${product.price}` : "Free"}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            product.status === "published"
                              ? "text-emerald-600 border-emerald-200"
                              : "text-muted-foreground border-muted"
                          }`}
                        >
                          {product.status === "published" ? "Live" : product.status === "in_progress" ? "Draft" : "Planned"}
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
