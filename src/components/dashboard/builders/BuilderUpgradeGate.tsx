/**
 * BuilderUpgradeGate — Conversion-focused gate for locked builders.
 * Shows builder-specific ROI projections, value ladder position,
 * and a contextual upgrade CTA with break-even math.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Lock, Crown, Loader2, TrendingUp, Sparkles, ArrowRight,
  Check, BarChart3, Zap, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TIERS, type SubscriptionTier } from "@/hooks/useAuth";
import {
  getRevenueBenchmark,
  getDefaultPosition,
  getTierConfig,
  type ValueLadderPosition,
} from "@/lib/value-ladder-engine";
import type { BuilderNodeConfig } from "./builderNodeConfig";

interface Props {
  nodeConfig: BuilderNodeConfig;
  currentTier: SubscriptionTier;
  planData?: {
    revenueProjection?: string;
    timeline?: string;
    products?: Array<{ name: string; price: number }>;
  } | null;
  onNavigate?: (section: string) => void;
}

/** What you can build — shown as a teaser grid */
const STEP_PREVIEWS: Record<string, string[]> = {
  "workbook": ["AI-generated exercises", "Chapter-mapped sections", "Downloadable PDF", "Lead magnet CTA"],
  "online-course": ["Full curriculum builder", "Video lesson hosting", "Quiz generator", "Sales page"],
  "coaching": ["Session frameworks", "Booking system", "Client materials", "Sales page"],
  "audiobook": ["AI narration", "Chapter production", "Distribution setup", "Revenue tracking"],
  "webinar": ["Slide deck generator", "Script builder", "Registration page", "Follow-up sequences"],
  "membership": ["Tier builder", "Content calendar", "Onboarding flow", "Recurring revenue"],
  "email-marketing": ["Sequence builder", "Template library", "Automation rules", "Analytics"],
  "social-media": ["90-day calendar", "Platform-specific posts", "Visual assets", "Hashtag strategy"],
  "podcast-scripts": ["Episode roadmap", "Script generator", "Guest interview prep", "Show notes"],
  "group-coaching": ["Program structure", "Session plans", "Group materials", "Pricing strategy"],
  "keynotes": ["Talk structure", "Slide concepts", "Speaker kit", "Booking page"],
  "retreats": ["Program design", "Venue planning", "Pricing model", "Marketing materials"],
  "certification": ["Curriculum design", "Assessment framework", "Credential system", "Pricing"],
  "masterminds": ["Structure design", "Application process", "Content calendar", "Premium pricing"],
};

export default function BuilderUpgradeGate({ nodeConfig, currentTier, planData, onNavigate }: Props) {
  const [loading, setLoading] = useState(false);

  const reqTier = nodeConfig.requiredTier as "brand" | "build" | "yield";
  const tierInfo = TIERS[reqTier];
  const benchmark = getRevenueBenchmark(nodeConfig.id);
  const position = getDefaultPosition(nodeConfig.id);
  const ladderTier = getTierConfig(position);
  const previews = STEP_PREVIEWS[nodeConfig.id] || nodeConfig.steps.slice(0, 4).map(s => s.label);

  // Break-even calculation
  const avgMonthlyRev = Math.round((benchmark.lowMonthly + benchmark.highMonthly) / 2);
  const monthsToBreakEven = avgMonthlyRev > 0
    ? Math.max(1, Math.ceil(tierInfo.monthlyPrice / avgMonthlyRev))
    : null;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: tierInfo.price_id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center mx-auto mb-5">
          <Lock className="h-9 w-9 text-secondary" />
        </div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">
          {nodeConfig.label}
        </h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Unlock this builder with {tierInfo.label} and start generating revenue from {nodeConfig.label.toLowerCase()}.
        </p>
      </motion.div>

      {/* Revenue Projection Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6 border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-secondary" />
            <h3 className="font-heading font-bold text-sm">Revenue Potential</h3>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                ${benchmark.lowMonthly.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Low/mo</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary">
                ${avgMonthlyRev.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Average/mo</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                ${benchmark.highMonthly.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">High/mo</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${ladderTier.color} ${ladderTier.textColor} border-0 text-[10px]`}>
                {ladderTier.label}
              </Badge>
              <span className="text-muted-foreground">{ladderTier.priceRange}</span>
            </div>
            {monthsToBreakEven && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <BarChart3 className="h-3 w-3" />
                <span>Break-even: ~{monthsToBreakEven} month{monthsToBreakEven > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {planData?.revenueProjection && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Sparkles className="h-3 w-3 text-secondary shrink-0 mt-0.5" />
                <span><strong>Abby's analysis:</strong> {planData.revenueProjection}</span>
              </p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* What You'll Build — Feature Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <h3 className="font-heading font-bold text-sm mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-secondary" />
          What Abby Will Build For You
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {previews.map((preview, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span className="text-xs text-muted-foreground">{preview}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Step Preview — Dimmed Stepper */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h3 className="font-heading font-bold text-sm mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 text-secondary" />
          Your {nodeConfig.steps.length}-Step Journey
        </h3>
        <div className="flex items-center gap-1 opacity-50">
          {nodeConfig.steps.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground/60 bg-muted/30">
                <span className="w-4 h-4 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center text-[9px]">
                  {idx + 1}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {idx < nodeConfig.steps.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/20 mx-0.5" />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-center space-y-4"
      >
        <Button
          onClick={handleUpgrade}
          disabled={loading}
          size="lg"
          className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold px-10 shadow-lg"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Crown className="h-4 w-4 mr-2" />
          )}
          Upgrade to {tierInfo.label} — ${tierInfo.monthlyPrice}/month
        </Button>

        {avgMonthlyRev > tierInfo.monthlyPrice && (
          <p className="text-xs text-muted-foreground">
            Average authors earn <strong className="text-foreground">${avgMonthlyRev}/mo</strong> from this builder alone —{" "}
            that's <strong className="text-green-600">{Math.round(avgMonthlyRev / tierInfo.monthlyPrice)}x</strong> your subscription cost.
          </p>
        )}

        <p className="text-[10px] text-muted-foreground">
          14-day money-back guarantee · No questions asked · 5% platform fee on sales
        </p>
      </motion.div>
    </div>
  );
}
