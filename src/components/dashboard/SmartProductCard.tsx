import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Star, Lock, Wrench, CheckCircle2, ArrowRight, Clock, BarChart3,
  TrendingUp, Sparkles, Eye,
} from "lucide-react";
import { getBuilderCategory, type BuilderCategory } from "./builders/shared/BuilderTheme";

export type ProductCardState = "recommended" | "available" | "locked" | "in-progress" | "published" | "coming-soon";

// Per-category visual tokens for SmartProductCard. Mirrors BuilderTheme but
// shaped to the card's specific surfaces (strip, badge, glow, CTA).
const categoryCard: Record<BuilderCategory, {
  iconBg: string;
  iconText: string;
  strip: string;
  stripSoft: string;
  border: string;
  borderHover: string;
  glow: string;
  gradient: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  ctaSolid: string;       // recommended / in-progress
  ctaAvailable: string;   // available — solid but slightly muted
  ring: string;
}> = {
  brand: {
    iconBg: "bg-teal-500/15",
    iconText: "text-teal-600 dark:text-teal-400",
    strip: "bg-teal-500",
    stripSoft: "bg-teal-500/40",
    border: "border-teal-400/40",
    borderHover: "border-border hover:border-teal-400/40",
    glow: "shadow-[0_0_24px_-4px_hsl(172_55%_40%_/_0.30)]",
    gradient: "bg-gradient-to-br from-teal-500/[0.07] via-card to-card",
    badgeBg: "bg-teal-500/15",
    badgeText: "text-teal-700 dark:text-teal-300",
    badgeBorder: "border-teal-500/30",
    ctaSolid: "bg-teal-600 hover:bg-teal-700 text-white border-teal-600",
    ctaAvailable: "bg-teal-500 hover:bg-teal-600 text-white border-teal-500",
    ring: "ring-2 ring-teal-400/40",
  },
  build: {
    iconBg: "bg-indigo-500/15",
    iconText: "text-indigo-600 dark:text-indigo-400",
    strip: "bg-indigo-500",
    stripSoft: "bg-indigo-500/40",
    border: "border-indigo-400/40",
    borderHover: "border-border hover:border-indigo-400/40",
    glow: "shadow-[0_0_24px_-4px_hsl(240_55%_50%_/_0.30)]",
    gradient: "bg-gradient-to-br from-indigo-500/[0.07] via-card to-card",
    badgeBg: "bg-indigo-500/15",
    badgeText: "text-indigo-700 dark:text-indigo-300",
    badgeBorder: "border-indigo-500/30",
    ctaSolid: "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600",
    ctaAvailable: "bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500",
    ring: "ring-2 ring-indigo-400/40",
  },
  yield: {
    iconBg: "bg-amber-500/15",
    iconText: "text-amber-600 dark:text-amber-400",
    strip: "bg-amber-500",
    stripSoft: "bg-amber-500/40",
    border: "border-amber-400/40",
    borderHover: "border-border hover:border-amber-400/40",
    glow: "shadow-[0_0_24px_-4px_hsl(38_75%_50%_/_0.30)]",
    gradient: "bg-gradient-to-br from-amber-500/[0.08] via-card to-card",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-700 dark:text-amber-300",
    badgeBorder: "border-amber-500/30",
    ctaSolid: "bg-amber-600 hover:bg-amber-700 text-white border-amber-600",
    ctaAvailable: "bg-amber-500 hover:bg-amber-600 text-white border-amber-500",
    ring: "ring-2 ring-amber-400/40",
  },
};

// Neutral "not built yet" palette — slate, intentionally outside teal/indigo/amber
const pendingTokens = {
  iconBg: "bg-slate-500/15",
  iconText: "text-slate-600 dark:text-slate-300",
  strip: "bg-slate-500",
  stripSoft: "bg-slate-400/50",
  border: "border-slate-400/50",
  borderHover: "border-border hover:border-slate-400/50",
  glow: "shadow-[0_0_24px_-4px_hsl(215_20%_45%_/_0.35)]",
  gradient: "bg-gradient-to-br from-slate-500/[0.08] via-card to-card",
  badgeBg: "bg-slate-500/15",
  badgeText: "text-slate-700 dark:text-slate-200",
  badgeBorder: "border-slate-500/30",
  ctaSolid: "bg-slate-700 hover:bg-slate-800 text-white border-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:border-slate-600",
  ctaAvailable: "bg-slate-600 hover:bg-slate-700 text-white border-slate-600 dark:bg-slate-500 dark:hover:bg-slate-400 dark:border-slate-500",
  ring: "ring-2 ring-slate-400/40",
};

interface RevenueEstimate {
  annual: number;
  timeToBuild: string;
  difficulty: number; // 1-5
}

interface SmartProductCardProps {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  personalizedDescription?: string;
  state: ProductCardState;
  tierRequired?: string;
  revenue?: RevenueEstimate;
  progressPercent?: number;
  stats?: { views?: number; sales?: number };
  /** Real revenue earned from author_nodes.revenue_to_date */
  liveRevenue?: number;
  /** ISO timestamp of last activation/update */
  lastActivityAt?: string | null;
  onBuild?: () => void;
  onContinue?: () => void;
  onView?: () => void;
  onUpgrade?: () => void;
  /** Optional secondary action for stuck in-progress nodes — clears the
   *  draft and routes the user back to step 1 of the builder. */
  onRestart?: () => void;
  genre?: string;
  code?: string;
}

function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

const BASELINE_REVENUE: Record<string, RevenueEstimate> = {
  "courses": { annual: 3940, timeToBuild: "~3 hours", difficulty: 3 },
  "home-study": { annual: 2400, timeToBuild: "~2 hours", difficulty: 3 },
  "workbooks": { annual: 1450, timeToBuild: "~1 hour", difficulty: 5 },
  "audiobook": { annual: 2000, timeToBuild: "~2 hours", difficulty: 2 },
  "memberships": { annual: 5880, timeToBuild: "~4 hours", difficulty: 4 },
  "upsells": { annual: 3600, timeToBuild: "~2 hours", difficulty: 3 },
  "coaching-1on1": { annual: 8000, timeToBuild: "~2 hours", difficulty: 2 },
  "group-coaching": { annual: 12000, timeToBuild: "~3 hours", difficulty: 3 },
  "big-ticket": { annual: 25000, timeToBuild: "~4 hours", difficulty: 4 },
  "revenue-sharing": { annual: 6000, timeToBuild: "~3 hours", difficulty: 3 },
  "keynotes": { annual: 15000, timeToBuild: "~2 hours", difficulty: 2 },
  "in-house-speaker": { annual: 10000, timeToBuild: "~3 hours", difficulty: 3 },
  "training": { annual: 18000, timeToBuild: "~5 hours", difficulty: 4 },
  "retreats": { annual: 24000, timeToBuild: "~6 hours", difficulty: 5 },
  "certification": { annual: 15000, timeToBuild: "~8 hours", difficulty: 5 },
  "masterminds": { annual: 12000, timeToBuild: "~4 hours", difficulty: 4 },
  "special-editions": { annual: 3000, timeToBuild: "~2 hours", difficulty: 4 },
  "book-sales-events": { annual: 2400, timeToBuild: "~1 hour", difficulty: 5 },
  "social-media": { annual: 1940, timeToBuild: "~1 hour", difficulty: 4 },
  "webinars": { annual: 9400, timeToBuild: "~3 hours", difficulty: 3 },
  "podcast-guest": { annual: 0, timeToBuild: "~2 hours", difficulty: 2 },
  "microsite": { annual: 0, timeToBuild: "~1 hour", difficulty: 5 },
  "affiliates": { annual: 2400, timeToBuild: "~2 hours", difficulty: 2 },
  "email-marketing": { annual: 1940, timeToBuild: "~2 hours", difficulty: 3 },
  "pr-media": { annual: 0, timeToBuild: "~3 hours", difficulty: 3 },
  "lead-magnet": { annual: 0, timeToBuild: "~1 hour", difficulty: 4 },
  "strategic-partnerships": { annual: 6000, timeToBuild: "~3 hours", difficulty: 3 },
  "book-sales": { annual: 3600, timeToBuild: "~1 hour", difficulty: 1 },
  "course-sales": { annual: 4800, timeToBuild: "~2 hours", difficulty: 2 },
  "coaching-fees": { annual: 9600, timeToBuild: "~2 hours", difficulty: 2 },
  "speaking-fees": { annual: 15000, timeToBuild: "~2 hours", difficulty: 2 },
  "licensing": { annual: 6000, timeToBuild: "~4 hours", difficulty: 4 },
  "sponsorships": { annual: 4800, timeToBuild: "~3 hours", difficulty: 3 },
  "events-conventions": { annual: 12000, timeToBuild: "~6 hours", difficulty: 4 },
  "affiliate-income": { annual: 3600, timeToBuild: "~2 hours", difficulty: 2 },
};

function getDifficultyStars(level: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < level ? "text-secondary" : "text-muted-foreground/20"}>★</span>
  ));
}

const difficultyLabels = ["", "Expert", "Hard", "Medium", "Easy", "Easy"];

function buildStateConfig(state: ProductCardState, cat: BuilderCategory) {
  const c = categoryCard[cat];
  const p = pendingTokens;
  switch (state) {
    case "recommended":
      return {
        badge: "⭐ Recommended",
        badgeClass: `${p.badgeBg} ${p.badgeText} ${p.badgeBorder}`,
        borderClass: `${p.border} ${p.glow} ${p.ring}`,
        cardBg: p.gradient,
        stripColor: p.strip,
      };
    case "available":
      return {
        badge: "Ready to Build",
        badgeClass: `${p.badgeBg} ${p.badgeText} ${p.badgeBorder}`,
        borderClass: p.borderHover,
        cardBg: "bg-card",
        stripColor: p.stripSoft,
      };
    case "locked":
      return {
        badge: "",
        badgeClass: "bg-muted text-muted-foreground border-border",
        borderClass: "border-border opacity-55",
        cardBg: "bg-muted/30",
        stripColor: "bg-muted-foreground/30",
      };
    case "in-progress":
      return {
        badge: "🔨 Building",
        badgeClass: `${p.badgeBg} ${p.badgeText} ${p.badgeBorder}`,
        borderClass: `${p.border} ${p.glow}`,
        cardBg: p.gradient,
        stripColor: p.strip,
      };
    case "published":
      return {
        badge: "✅ Live",
        badgeClass: `${c.badgeBg} ${c.badgeText} ${c.badgeBorder}`,
        borderClass: `${c.border} ${c.glow}`,
        cardBg: c.gradient,
        stripColor: c.strip,
      };
    case "coming-soon":
      return {
        badge: "Coming Soon",
        badgeClass: "bg-muted text-muted-foreground/60 border-border",
        borderClass: "border-border",
        cardBg: "bg-muted/20",
        stripColor: "bg-muted-foreground/20",
      };
  }
}

export default function SmartProductCard({
  id, label, icon: Icon, description, personalizedDescription,
  state, tierRequired, revenue, progressPercent,
  stats, liveRevenue, lastActivityAt,
  onBuild, onContinue, onView, onUpgrade, onRestart, genre, code,
}: SmartProductCardProps) {
  const category = getBuilderCategory(code ?? "");
  const catTokens = categoryCard[category];
  const config = buildStateConfig(state, category);
  const rev = revenue || BASELINE_REVENUE[id] || { annual: 0, timeToBuild: "~2 hours", difficulty: 2 };
  const showEconomics = state !== "coming-soon";
  const isPublished = state === "published";
  const isInProgress = state === "in-progress";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`relative overflow-hidden p-5 space-y-3.5 transition-all hover:shadow-lg h-full flex flex-col ${config.borderClass} ${config.cardBg}`}>
        {/* Left color strip */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.stripColor}`} />
        {code && (
          <span className="absolute top-2 right-2 text-[9px] font-mono font-bold tracking-wider text-muted-foreground/70 bg-muted/60 rounded px-1.5 py-0.5">
            {code}
          </span>
        )}
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            state === "locked" ? "bg-muted"
              : state === "coming-soon" ? "bg-muted/60"
              : state === "published" ? catTokens.iconBg
              : pendingTokens.iconBg
          }`}>
            <Icon className={`h-5 w-5 ${
              state === "locked" || state === "coming-soon" ? "text-muted-foreground/40"
                : state === "published" ? catTokens.iconText
                : pendingTokens.iconText
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-heading font-bold text-base">{label}</h4>
              {state === "locked" ? (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                  <Lock className="h-2.5 w-2.5" /> {tierRequired} Plan
                </span>
              ) : (
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.badgeClass}`}>
                  {config.badge}
                </span>
              )}
            </div>
          </div>
        </div>


        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed flex-1">
          {state === "recommended" && personalizedDescription
            ? personalizedDescription
            : state === "in-progress" && progressPercent !== undefined
            ? `${progressPercent}% complete — continue where you left off`
            : description}
        </p>

        {/* Progress bar for in-progress */}
        {state === "in-progress" && progressPercent !== undefined && (
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${pendingTokens.strip}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className={`text-[9px] font-medium text-right ${pendingTokens.iconText}`}>{progressPercent}%</p>
          </div>
        )}
        {showEconomics && (
          <div className="grid grid-cols-3 gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`rounded-lg p-2 text-center ${isPublished ? "bg-success/10" : "bg-muted/50"}`}>
                    <TrendingUp className={`h-3 w-3 mx-auto mb-0.5 ${isPublished ? "text-success" : "text-muted-foreground"}`} />
                    {isPublished ? (
                      <>
                        <p className="text-xs font-semibold">
                          {liveRevenue && liveRevenue > 0
                            ? `$${liveRevenue.toLocaleString()}`
                            : "—"}
                        </p>
                        <p className="text-[9px] text-success/80">earned</p>
                      </>
                    ) : isInProgress ? (
                      <>
                        <p className="text-[10px] font-semibold leading-tight">In progress</p>
                        <p className="text-[8px] text-muted-foreground leading-tight">
                          {progressPercent ? `${progressPercent}% done` : "draft"}
                        </p>
                      </>
                    ) : id === "microsite" ? (
                      <>
                        <p className="text-[10px] font-semibold leading-tight">Revenue Enabler</p>
                        <p className="text-[8px] text-muted-foreground leading-tight">unlocks all other streams</p>
                      </>
                    ) : id === "lead-magnet" ? (
                      <>
                        <p className="text-[10px] font-semibold leading-tight">Revenue Enabler</p>
                        <p className="text-[8px] text-muted-foreground leading-tight">feeds your email list</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-semibold">
                          {rev.annual > 0 ? `$${rev.annual.toLocaleString()}/yr` : "Indirect"}
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          {state === "locked" ? "potential" : "estimated"}
                        </p>
                      </>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[200px]">
                    {isPublished
                      ? "Live revenue tracked from your activated checkout."
                      : `Based on industry averages${genre ? ` for ${genre} authors` : ""}. Your actual revenue depends on audience size, pricing, and marketing effort.`}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className={`rounded-lg p-2 text-center ${isPublished ? "bg-success/10" : "bg-muted/50"}`}>
              <Clock className={`h-3 w-3 mx-auto mb-0.5 ${isPublished ? "text-success" : "text-muted-foreground"}`} />
              {isPublished && lastActivityAt ? (
                <>
                  <p className="text-xs font-semibold">{formatRelative(lastActivityAt)}</p>
                  <p className="text-[9px] text-muted-foreground">last update</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold">{rev.timeToBuild}</p>
                  <p className="text-[9px] text-muted-foreground">to build</p>
                </>
              )}
            </div>
            <div className={`rounded-lg p-2 text-center ${isPublished ? "bg-success/10" : "bg-muted/50"}`}>
              <BarChart3 className={`h-3 w-3 mx-auto mb-0.5 ${isPublished ? "text-success" : "text-muted-foreground"}`} />
              {isPublished ? (
                <>
                  <p className="text-xs font-semibold text-success">Live</p>
                  <p className="text-[9px] text-muted-foreground">status</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold leading-none mt-0.5">
                    {getDifficultyStars(rev.difficulty)}
                  </p>
                  <p className="text-[9px] text-muted-foreground">{difficultyLabels[rev.difficulty]}</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Published stats (optional, supplemental) */}
        {isPublished && stats && (stats.views !== undefined || stats.sales !== undefined) && (
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            {stats.views !== undefined && <span>{stats.views} views</span>}
            {stats.sales !== undefined && <span>{stats.sales} sales</span>}
          </div>
        )}

        {/* Action Button */}
        <div>
          {state === "locked" && (
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={onUpgrade}>
              <Lock className="h-3 w-3 mr-1.5" /> Upgrade to {tierRequired} →
            </Button>
          )}
          {state === "recommended" && (
            <Button
              size="sm"
              className={`w-full text-xs border ${pendingTokens.ctaSolid} shadow-md`}
              onClick={onBuild}
            >
              <Sparkles className="h-3 w-3 mr-1.5" /> Build This Product →
            </Button>
          )}
          {state === "available" && (
            <Button
              size="sm"
              className={`w-full text-xs border ${pendingTokens.ctaAvailable}`}
              onClick={onBuild}
            >
              <ArrowRight className="h-3 w-3 mr-1.5" /> Build This Product →
            </Button>
          )}
          {state === "in-progress" && (
            <Button size="sm" className={`w-full text-xs border ${pendingTokens.ctaSolid} shadow-md`} onClick={onContinue}>
              <Wrench className="h-3 w-3 mr-1.5" /> Continue Building →
            </Button>
          )}
          {state === "published" && (
            <Button
              variant="outline"
              size="sm"
              className={`w-full text-xs bg-transparent ${catTokens.border} ${catTokens.iconText} hover:${catTokens.badgeBg}`}
              onClick={onView}
            >
              <Eye className="h-3 w-3 mr-1.5" /> Open & Manage →
            </Button>
          )}
          {state === "coming-soon" && (
            <Button variant="outline" size="sm" className="w-full text-xs opacity-60" disabled>
              Coming Soon
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export { BASELINE_REVENUE };
