import { motion } from "framer-motion";
import { Sparkles, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIERS, type SubscriptionTier } from "@/hooks/useAuth";

type JourneyStep = "microsite" | "analyze" | "payments" | "build" | "earn";

interface Props {
  authorName: string;
  tier: SubscriptionTier;
  currentJourneyStep: JourneyStep;
  bookApproved?: boolean;
  onAction: (action: string) => void;
  onAskAbby: () => void;
}

const stepCopy: Record<JourneyStep, { eyebrow: string; title: string; sub: string; cta: string; action: string }> = {
  microsite: {
    eyebrow: "Step 1 of 4 · Brand",
    title: "Set up your Directory Profile",
    sub: "Your free author page on Authors Bureau. Readers find you here, and every product you build links back to it.",
    cta: "Complete your profile",
    action: "profile",
  },
  analyze: {
    eyebrow: "Step 2 of 4 · Analyze",
    title: "Analyze your book with Abby",
    sub: "Abby reads your book and maps it to your personalized 28-stream business plan in about 5 minutes.",
    cta: "Start free analysis",
    action: "analyze",
  },
  payments: {
    eyebrow: "Step 3 of 4 · Build",
    title: "You're ready to build products",
    sub: "Your business plan is ready. Pick a product to build, or connect Stripe so readers can buy when you go live.",
    cta: "Build your first product",
    action: "build",
  },
  build: {
    eyebrow: "Step 3 of 4 · Build",
    title: "Build your next revenue stream",
    sub: "Keep momentum. Each product you publish unlocks more of your 28-stream plan.",
    cta: "Build next product",
    action: "build",
  },
  earn: {
    eyebrow: "Step 4 of 4 · Yield",
    title: "Track your revenue & grow",
    sub: "Your products are live. Watch what's converting and double down.",
    cta: "Open Revenue Dashboard",
    action: "analytics",
  },
};

export default function NextStepHero({ authorName, tier, currentJourneyStep, bookApproved, onAction, onAskAbby }: Props) {
  const copy = stepCopy[currentJourneyStep];
  const tierLabel = tier !== "free" ? TIERS[tier as keyof typeof TIERS]?.label : null;
  const isAnalyzeGated = !bookApproved && currentJourneyStep === "analyze";

  const firstName = (authorName || "").split(" ")[0] || "there";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 p-6 md:p-8"
    >
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">{copy.eyebrow}</p>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mt-1">
            Welcome back, {firstName}
          </h1>
        </div>
        {tierLabel && (
          <span className="inline-flex items-center rounded-full bg-amber-600/10 border border-amber-600/30 px-3 py-1 text-xs font-semibold text-amber-800">
            {tierLabel}
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
        <div className="space-y-3">
          <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground">
            {copy.title}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
            {copy.sub}
          </p>
          <p className="text-xs italic text-amber-700/80">
            "Your book is not the business. Your book is the <span className="font-semibold">HOOK</span>."
          </p>
        </div>

        <div className="flex flex-col gap-2 md:items-end shrink-0">
          <Button
            size="lg"
            disabled={isAnalyzeGated}
            onClick={() => !isAnalyzeGated && onAction(copy.action)}
            className={isAnalyzeGated
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-amber-600 hover:bg-amber-700 text-white shadow-md"}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {copy.cta}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onAskAbby} className="text-amber-700 hover:text-amber-900 hover:bg-amber-100/60">
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
            Ask Abby instead
          </Button>
        </div>
      </div>

      {isAnalyzeGated && (
        <p className="mt-4 text-xs text-muted-foreground">
          Your book is awaiting admin approval. Abby's analysis unlocks once your book is approved.
        </p>
      )}
    </motion.section>
  );
}
