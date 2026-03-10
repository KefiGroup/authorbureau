/**
 * FreeTrialTeaser — Shown in Book Hub for free-tier users.
 * Previews the ABBY builders they'd unlock with a subscription,
 * with revenue projections and a persuasive upgrade flow.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Crown, Sparkles, TrendingUp, Lock, ArrowRight, Loader2,
  BookOpen, Zap, Star, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TIERS, type SubscriptionTier } from "@/hooks/useAuth";
import { getRevenueBenchmark } from "@/lib/value-ladder-engine";

interface Props {
  bookTitle: string;
  bookId: string;
  currentTier: SubscriptionTier;
  hasBusinessPlan: boolean;
  onNavigate: (section: string) => void;
}

const TIER_BUILDERS: Record<string, Array<{ id: string; label: string; emoji: string }>> = {
  starter: [
    { id: "workbook", label: "Workbook Builder", emoji: "📓" },
    { id: "social-media", label: "Social Media Calendar", emoji: "📱" },
    { id: "email-marketing", label: "Email Marketing", emoji: "✉️" },
  ],
  pro: [
    { id: "online-course", label: "Online Course", emoji: "🎓" },
    { id: "audiobook", label: "Audiobook Studio", emoji: "🎧" },
    { id: "coaching", label: "1-on-1 Coaching", emoji: "💬" },
    { id: "webinar", label: "Webinar Builder", emoji: "📹" },
    { id: "podcast-scripts", label: "Podcast Scripts", emoji: "🎙️" },
    { id: "membership", label: "Monthly Membership", emoji: "🔄" },
  ],
  enterprise: [
    { id: "keynotes", label: "Keynote Speaking", emoji: "🎤" },
    { id: "retreats", label: "Retreats & Bootcamps", emoji: "🏕️" },
    { id: "certification", label: "Certification Program", emoji: "🏆" },
    { id: "masterminds", label: "Masterminds", emoji: "🧠" },
  ],
};

export default function FreeTrialTeaser({ bookTitle, bookId, currentTier, hasBusinessPlan, onNavigate }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  // Calculate total revenue potential across all builders
  const allBuilders = [...TIER_BUILDERS.starter, ...TIER_BUILDERS.pro, ...TIER_BUILDERS.enterprise];
  const totalRevLow = allBuilders.reduce((sum, b) => sum + getRevenueBenchmark(b.id).lowMonthly, 0);
  const totalRevHigh = allBuilders.reduce((sum, b) => sum + getRevenueBenchmark(b.id).highMonthly, 0);

  const handleUpgrade = async (tier: "starter" | "pro" | "enterprise") => {
    setLoading(tier);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: TIERS[tier].price_id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(null);
    }
  };

  if (currentTier !== "free") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Revenue Hook */}
      <Card className="overflow-hidden">
        <div
          className="p-6 md:p-8 text-center"
          style={{
            background: "linear-gradient(135deg, hsl(var(--secondary) / 0.08) 0%, hsl(var(--secondary) / 0.02) 100%)",
          }}
        >
          <div className="inline-flex items-center gap-2 text-secondary text-xs font-bold uppercase tracking-widest mb-3">
            <Sparkles className="h-4 w-4" />
            {hasBusinessPlan ? "YOUR PLAN IS READY — NOW BUILD IT" : "UNLOCK AI BUILDERS"}
          </div>

          <h2 className="font-heading text-xl md:text-2xl font-bold mb-2">
            Turn "{bookTitle}" Into a Revenue Engine
          </h2>

          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            {hasBusinessPlan
              ? "Abby has mapped your revenue streams. Subscribe to unlock the AI builders that create each product automatically."
              : "Subscribe to unlock 28 AI-powered builders that turn your book into courses, coaching, memberships, and more."}
          </p>

          <div className="inline-flex items-center gap-3 bg-card rounded-xl px-6 py-3 shadow-sm border border-border">
            <TrendingUp className="h-5 w-5 text-secondary" />
            <div className="text-left">
              <p className="text-lg font-bold">
                ${totalRevLow.toLocaleString()} – ${totalRevHigh.toLocaleString()}/mo
              </p>
              <p className="text-[10px] text-muted-foreground">Potential across all 28 builders</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(["starter", "pro", "enterprise"] as const).map((tierKey) => {
          const tier = TIERS[tierKey];
          const builders = TIER_BUILDERS[tierKey];
          const isExpanded = expandedTier === tierKey;
          const tierRevLow = builders.reduce((s, b) => s + getRevenueBenchmark(b.id).lowMonthly, 0);
          const tierRevHigh = builders.reduce((s, b) => s + getRevenueBenchmark(b.id).highMonthly, 0);

          return (
            <Card
              key={tierKey}
              className={`p-4 cursor-pointer transition-all hover:border-secondary/30 ${
                tierKey === "pro" ? "border-secondary/20 ring-1 ring-secondary/10" : ""
              }`}
              onClick={() => setExpandedTier(isExpanded ? null : tierKey)}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-heading font-bold text-sm">{tier.label}</h3>
                  <p className="text-xs text-muted-foreground">${tier.monthlyPrice}/mo</p>
                </div>
                {tierKey === "pro" && (
                  <Badge variant="secondary" className="text-[9px]">Most Popular</Badge>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                <BarChart className="h-3 w-3" />
                <span>${tierRevLow.toLocaleString()} – ${tierRevHigh.toLocaleString()}/mo potential</span>
              </div>

              <div className="space-y-1.5">
                {builders.slice(0, isExpanded ? builders.length : 3).map((builder) => {
                  const rev = getRevenueBenchmark(builder.id);
                  return (
                    <div key={builder.id} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span>{builder.emoji}</span>
                        <span className="text-muted-foreground">{builder.label}</span>
                      </span>
                      {rev.highMonthly > 0 && (
                        <span className="text-muted-foreground/60 text-[10px]">
                          ~${Math.round((rev.lowMonthly + rev.highMonthly) / 2).toLocaleString()}/mo
                        </span>
                      )}
                    </div>
                  );
                })}
                {!isExpanded && builders.length > 3 && (
                  <p className="text-[10px] text-secondary font-medium">+ {builders.length - 3} more builders ↓</p>
                )}
              </div>

              <Button
                onClick={(e) => { e.stopPropagation(); handleUpgrade(tierKey); }}
                disabled={loading !== null}
                size="sm"
                className={`w-full mt-3 text-xs ${
                  tierKey === "pro"
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    : ""
                }`}
                variant={tierKey === "pro" ? "default" : "outline"}
              >
                {loading === tierKey ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Crown className="h-3.5 w-3.5 mr-1" />
                )}
                Get {tier.label}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Trust Line */}
      <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> 30-day money-back guarantee</span>
        <span>·</span>
        <span>Cancel anytime</span>
        <span>·</span>
        <span>5% platform fee on sales</span>
      </div>
    </motion.div>
  );
}

// Inline BarChart icon (avoid adding another import for a simple usage)
function BarChart({ className }: { className?: string }) {
  return <TrendingUp className={className} />;
}
