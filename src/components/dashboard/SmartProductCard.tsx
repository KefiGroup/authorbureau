import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Star, Lock, Wrench, CheckCircle2, ArrowRight, Clock, BarChart3,
  TrendingUp, Sparkles, Eye,
} from "lucide-react";

export type ProductCardState = "recommended" | "available" | "locked" | "in-progress" | "published" | "coming-soon";

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
  onBuild?: () => void;
  onContinue?: () => void;
  onView?: () => void;
  onUpgrade?: () => void;
  genre?: string;
}

const BASELINE_REVENUE: Record<string, RevenueEstimate> = {
  "courses": { annual: 3940, timeToBuild: "~3 hours", difficulty: 3 },
  "home-study": { annual: 2400, timeToBuild: "~2 hours", difficulty: 2 },
  "workbooks": { annual: 1450, timeToBuild: "~1 hour", difficulty: 1 },
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
  "special-editions": { annual: 3000, timeToBuild: "~2 hours", difficulty: 2 },
  "book-sales-events": { annual: 2400, timeToBuild: "~1 hour", difficulty: 1 },
  "social-media": { annual: 1940, timeToBuild: "~1 hour", difficulty: 1 },
  "webinars": { annual: 9400, timeToBuild: "~3 hours", difficulty: 3 },
  "podcast-guest": { annual: 0, timeToBuild: "~2 hours", difficulty: 2 },
  "microsite": { annual: 0, timeToBuild: "~1 hour", difficulty: 1 },
  "affiliates": { annual: 2400, timeToBuild: "~2 hours", difficulty: 2 },
  "email-marketing": { annual: 1940, timeToBuild: "~2 hours", difficulty: 2 },
  "pr-media": { annual: 0, timeToBuild: "~3 hours", difficulty: 3 },
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

const difficultyLabels = ["", "Easy", "Easy", "Medium", "Hard", "Expert"];

const stateConfig: Record<ProductCardState, { badge: string; badgeClass: string; borderClass: string }> = {
  recommended: {
    badge: "⭐ Recommended for You",
    badgeClass: "bg-secondary/15 text-secondary border-secondary/30",
    borderClass: "border-secondary/30 shadow-[0_0_15px_-3px_hsl(var(--secondary)/0.15)]",
  },
  available: {
    badge: "Available",
    badgeClass: "bg-accent/15 text-accent border-accent/30",
    borderClass: "border-border",
  },
  locked: {
    badge: "",
    badgeClass: "bg-muted text-muted-foreground border-border",
    borderClass: "border-border opacity-60",
  },
  "in-progress": {
    badge: "🔨 In Progress",
    badgeClass: "bg-blue-500/15 text-blue-700 border-blue-500/30",
    borderClass: "border-blue-500/30",
  },
  published: {
    badge: "✅ Published",
    badgeClass: "bg-accent/15 text-accent border-accent/30",
    borderClass: "border-accent/30",
  },
  "coming-soon": {
    badge: "🚧 Coming Soon",
    badgeClass: "bg-muted text-muted-foreground border-border",
    borderClass: "border-border opacity-70",
  },
};

export default function SmartProductCard({
  id, label, icon: Icon, description, personalizedDescription,
  state, tierRequired, revenue, progressPercent,
  stats, onBuild, onContinue, onView, onUpgrade, genre,
}: SmartProductCardProps) {
  const config = stateConfig[state];
  const rev = revenue || BASELINE_REVENUE[id] || { annual: 0, timeToBuild: "~2 hours", difficulty: 2 };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`p-4 space-y-3 transition-all hover:shadow-md h-full flex flex-col ${config.borderClass}`}>
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            state === "locked" ? "bg-muted" : "bg-secondary/10"
          }`}>
            <Icon className={`h-5 w-5 ${state === "locked" ? "text-muted-foreground/40" : "text-secondary"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-heading font-semibold text-sm">{label}</h4>
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

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <TrendingUp className="h-3 w-3 mx-auto mb-0.5 text-muted-foreground" />
                  <p className="text-xs font-semibold">
                    {rev.annual > 0 ? `$${(rev.annual).toLocaleString()}/yr` : "Indirect"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">estimated</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">
                  Based on industry averages{genre ? ` for ${genre} authors` : ""}. Your actual revenue depends on audience size, pricing, and marketing effort.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <Clock className="h-3 w-3 mx-auto mb-0.5 text-muted-foreground" />
            <p className="text-xs font-semibold">{rev.timeToBuild}</p>
            <p className="text-[9px] text-muted-foreground">to build</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <BarChart3 className="h-3 w-3 mx-auto mb-0.5 text-muted-foreground" />
            <p className="text-xs font-semibold leading-none mt-0.5">
              {getDifficultyStars(rev.difficulty)}
            </p>
            <p className="text-[9px] text-muted-foreground">{difficultyLabels[rev.difficulty]}</p>
          </div>
        </div>

        {/* Published stats */}
        {state === "published" && stats && (
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
              className="w-full text-xs bg-secondary text-secondary-foreground hover:bg-secondary/90"
              onClick={onBuild}
            >
              <Sparkles className="h-3 w-3 mr-1.5" /> Build This Product →
            </Button>
          )}
          {state === "available" && (
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={onBuild}>
              <ArrowRight className="h-3 w-3 mr-1.5" /> Build This Product →
            </Button>
          )}
          {state === "in-progress" && (
            <Button size="sm" className="w-full text-xs bg-blue-600 text-white hover:bg-blue-700" onClick={onContinue}>
              <Wrench className="h-3 w-3 mr-1.5" /> Continue Building →
            </Button>
          )}
          {state === "published" && (
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={onView}>
              <Eye className="h-3 w-3 mr-1.5" /> View on Website →
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
