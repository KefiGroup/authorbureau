import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Crown, Loader2, ArrowUpRight, Shield, Sparkles,
  TrendingUp, Star, Lock, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SubscriptionTier } from "@/hooks/useAuth";

/* ─── Types ─── */
interface PlanAnalysisData {
  bookTitle: string;
  revenueStreamsCount?: number;
  revenueLow?: string;
  revenueHigh?: string;
  recommendedTier?: "starter" | "pro" | "enterprise";
  /** Array of product suggestions from Abby's analysis for ROI calc */
  products?: Array<{
    name: string;
    price: number;
    type: string;
  }>;
}

interface Props {
  currentTier: SubscriptionTier;
  onSubscribe: (tier: "starter" | "pro" | "enterprise") => void;
  onManage: () => void;
  loading: boolean;
  analysisData: PlanAnalysisData;
  onBuildBusiness?: () => void;
}

/* ─── Plan definitions ─── */
const plans = [
  {
    id: "starter" as const,
    name: "Starter",
    price: "$49",
    priceNum: 49,
    period: "/mo",
    tagline: "Test the waters.",
    description: "Start building with 3 core AI builders",
    popular: false,
    features: [
      "Abby AI Unlimited",
      "3 B·Build builders (Workbook, Social Media, Email)",
      "Basic author profile page",
      "1 product sales page",
      "+ 5% platform fee on sales",
    ],
    unlockedCategories: ["B·Build (3 of 8)"],
    builderCount: 3,
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$199",
    priceNum: 199,
    period: "/mo",
    tagline: "Build a real business.",
    description: "Full Build + Bridge — everything to monetize",
    popular: true,
    features: [
      "Everything in Starter",
      "All 7 B·Build AI builders",
      "All 14 B·Bridge builders (Courses, Coaching, Audiobooks, Podcasts)",
      "Full microsite with unlimited sales pages",
      "Stripe Connect payment processing",
      "CRM & email automation",
      "Lead capture pages",
      "Coaching booking system",
      "+ 5% platform fee on sales",
    ],
    unlockedCategories: ["B·Build (8)", "B·Bridge (8)"],
    builderCount: 16,
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: "$499",
    priceNum: 499,
    period: "/mo",
    tagline: "Build an empire.",
    description: "Complete monetization empire — all 28 streams",
    popular: false,
    features: [
      "Everything in Pro",
      "All 7 Y·Yield builders (Retreats, Certification, Masterminds)",
      "Full site with custom domain support",
      "White-label option (Authors Bureau branding removed)",
      "Events management system",
      "1-on-1 strategic session with Pauline Teo",
      "+ 5% platform fee on sales",
    ],
    unlockedCategories: ["B·Build (8)", "B·Bridge (8)", "Y·Yield (12)"],
    builderCount: 28,
  },
];

const tierOrder = ["free", "starter", "pro", "enterprise"] as const;

/* ─── Helpers ─── */
function getBreakEven(planPrice: number, products: PlanAnalysisData["products"]): { qty: number; productName: string; productPrice: number; total: number } {
  if (!products || products.length === 0) {
    // Fallback: generic workbook at $27
    const price = 27;
    const qty = Math.ceil(planPrice / price);
    return { qty, productName: "workbook", productPrice: price, total: qty * price };
  }
  // Pick the lowest-priced product for a realistic break-even
  const sorted = [...products].sort((a, b) => a.price - b.price);
  const product = sorted[0];
  const qty = Math.ceil(planPrice / product.price);
  return { qty, productName: product.name || product.type, productPrice: product.price, total: qty * product.price };
}

function getRevenueHookText(tier: SubscriptionTier): string {
  switch (tier) {
    case "starter": return "You've unlocked 3 builders. Upgrade to access all 28 revenue streams.";
    case "pro": return "You've unlocked 21 builders. Upgrade to Enterprise for retreats, certification, and a 1-on-1 session with Pauline Teo.";
    case "enterprise": return "You have full access to all 28 builders. Start building!";
    default: return "";
  }
}

/* ─── Main Component ─── */
export default function SubscriptionSalesPitch({
  currentTier, onSubscribe, onManage, loading, analysisData, onBuildBusiness,
}: Props) {
  const isSubscribed = currentTier !== "free";
  const pricingRef = useRef<HTMLDivElement>(null);
  const [stickyDismissed, setStickyDismissed] = useState(false);
  const [showSticky, setShowSticky] = useState(false);

  // Observe pricing cards visibility for sticky banner
  useEffect(() => {
    if (isSubscribed || stickyDismissed) return;
    const el = pricingRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isSubscribed, stickyDismissed]);

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const recommended = analysisData.recommendedTier || "starter";
  const recommendedPlan = plans.find(p => p.id === recommended) || plans[0];

  const {
    bookTitle,
    revenueStreamsCount = 12,
    revenueLow = "$8,000",
    revenueHigh = "$30,000",
  } = analysisData;

  // Enterprise subscriber → show build CTA instead
  if (currentTier === "enterprise") {
    return (
      <div className="space-y-6 mt-8">
        <RevenueHookBanner bookTitle={bookTitle} revenueStreamsCount={revenueStreamsCount}
          revenueLow={revenueLow} revenueHigh={revenueHigh}
          customText={getRevenueHookText("enterprise")} isSubscribed />
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full px-5 py-2.5 text-sm font-bold mb-6">
            <Shield className="h-4 w-4" />
            ✅ ENTERPRISE PLAN — Full Access to All 28 Builders
          </div>
          {onBuildBusiness && (
            <Button size="lg" onClick={onBuildBusiness} className="bg-amber-500 hover:bg-amber-600 text-white text-lg px-10 py-6 rounded-xl shadow-lg">
              <Sparkles className="h-5 w-5 mr-2" />
              BUILD MY AUTHOR BUSINESS →
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0 mt-8">
      {/* ─── Part 1: Revenue Hook ─── */}
      <RevenueHookBanner
        bookTitle={bookTitle}
        revenueStreamsCount={revenueStreamsCount}
        revenueLow={revenueLow}
        revenueHigh={revenueHigh}
        customText={isSubscribed ? getRevenueHookText(currentTier) : undefined}
        isSubscribed={isSubscribed}
      />

      {/* ─── Part 2: Pricing Cards ─── */}
      <div ref={pricingRef} className="py-8 px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const tierIdx = tierOrder.indexOf(plan.id);
            const currentIdx = tierOrder.indexOf(currentTier);
            const isCurrent = plan.id === currentTier;
            const isLower = tierIdx < currentIdx;
            const isHigher = tierIdx > currentIdx;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: tierIdx * 0.1 }}
                className={`relative rounded-2xl border p-6 transition-all flex flex-col bg-card ${
                  plan.popular && !isSubscribed
                    ? "border-amber-400 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/30 scale-[1.02]"
                    : isCurrent
                    ? "border-green-500 ring-2 ring-green-400/30"
                    : isLower
                    ? "border-border opacity-60"
                    : "border-border"
                }`}
              >
                {/* Badges */}
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                    <Check className="h-3 w-3" /> Current Plan
                  </span>
                )}
                {plan.popular && !isSubscribed && !isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                    Most Popular
                  </span>
                )}
                {isLower && !isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-muted px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Included
                  </span>
                )}

                <div className="space-y-4 flex-1 flex flex-col">
                  <div>
                    <h3 className="font-heading text-lg font-bold">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>

                  <p className="text-xs font-semibold italic text-amber-600 dark:text-amber-400">
                    "{plan.tagline}"
                  </p>

                  <ul className="space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {isCurrent ? (
                    <Button className="w-full mt-auto bg-green-500 hover:bg-green-600 text-white cursor-default" disabled>
                      <Check className="h-4 w-4 mr-2" /> Current Plan
                    </Button>
                  ) : isLower ? (
                    <Button className="w-full mt-auto" variant="outline" disabled>
                      Included
                    </Button>
                  ) : (
                    <Button
                      className={`w-full mt-auto text-xs sm:text-sm ${
                        plan.popular
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : "bg-[hsl(var(--primary))] text-primary-foreground hover:bg-[hsl(var(--primary))]/90"
                      }`}
                      onClick={() => onSubscribe(plan.id)}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 shrink-0 animate-spin" />
                      ) : isSubscribed ? (
                        <ArrowUpRight className="h-4 w-4 mr-2 shrink-0" />
                      ) : (
                        <Crown className="h-4 w-4 mr-2 shrink-0" />
                      )}
                      {isSubscribed ? `Upgrade to ${plan.name}` : `Get ${plan.name}`}
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Comparison line */}
        <div className="text-center space-y-3 max-w-2xl mx-auto mt-8">
          <p className="text-xs text-muted-foreground">
            Most authors spend <strong className="text-foreground">$300–$500/month</strong> on Kajabi + Mailchimp + Calendly + Canva + ChatGPT separately.
            Authors Bureau includes everything — plus AI that builds your products for you.
          </p>
          <p className="text-[10px] text-muted-foreground">
            All plans include a 5% platform fee on sales. Standard Stripe fees (2.9% + $0.30) apply separately. You keep ~92%.
          </p>
        </div>
      </div>

      {/* ─── Part 3: ROI Calculator ─── */}
      {!isSubscribed && (
        <ROICalculator
          bookTitle={bookTitle}
          products={analysisData.products}
          recommendedTier={recommended}
          onSubscribe={onSubscribe}
          loading={loading}
        />
      )}

      {isSubscribed && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <p className="text-sm font-medium flex items-center justify-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            You're already earning with {plans.find(p => p.id === currentTier)?.name}.
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {currentTier === "starter"
              ? "Upgrade to Pro to unlock coaching, courses, and webinars."
              : "Upgrade to Enterprise for retreats, certification, and a 1-on-1 session with Pauline Teo."}
          </p>
          <Button onClick={() => onSubscribe(currentTier === "starter" ? "pro" : "enterprise")} disabled={loading}>
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Upgrade to {currentTier === "starter" ? "Pro" : "Enterprise"}
          </Button>
        </div>
      )}

      {/* ─── Trust badges ─── */}
      {!isSubscribed && (
        <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground py-4">
          <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> 30-day money-back guarantee</span>
          <span>·</span>
          <span>Cancel anytime</span>
          <span>·</span>
          <span>No lock-in</span>
        </div>
      )}

      {/* ─── Sticky Banner (free users only) ─── */}
      <AnimatePresence>
        {showSticky && !isSubscribed && !stickyDismissed && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[hsl(220,40%,18%)] text-white px-4 py-3 shadow-2xl"
          >
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  Abby recommends {recommendedPlan.name} ({recommendedPlan.price}/mo) for "{bookTitle}"
                </p>
                <p className="text-xs text-white/70">
                  Revenue potential: {revenueLow}–{revenueHigh}/mo
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={scrollToPricing}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  size="sm"
                >
                  Get Started with {recommendedPlan.name} →
                </Button>
                <button onClick={() => setStickyDismissed(true)} className="text-white/50 hover:text-white p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Sub-Components ─── */

function RevenueHookBanner({
  bookTitle, revenueStreamsCount, revenueLow, revenueHigh, customText, isSubscribed,
}: {
  bookTitle: string; revenueStreamsCount: number; revenueLow: string; revenueHigh: string;
  customText?: string; isSubscribed: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, hsl(40, 60%, 92%) 0%, hsl(38, 70%, 85%) 50%, hsl(35, 55%, 80%) 100%)",
      }}
    >
      <div className="px-6 py-10 md:px-10 md:py-14 text-center space-y-5">
        <div className="inline-flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-widest">
          <Sparkles className="h-4 w-4" /> YOUR BUSINESS PLAN IS READY
        </div>

        {customText ? (
          <p className="text-base md:text-lg font-medium text-[hsl(220,40%,18%)] max-w-lg mx-auto">{customText}</p>
        ) : (
          <>
            <p className="text-sm md:text-base text-[hsl(220,40%,30%)] max-w-lg mx-auto">
              Abby has mapped out <strong className="text-[hsl(220,40%,18%)]">{revenueStreamsCount}</strong> revenue streams for
              "<strong className="text-[hsl(220,40%,18%)]">{bookTitle}</strong>" with a projected revenue potential of
            </p>

            <div className="inline-block bg-white/90 rounded-xl px-8 py-5 shadow-sm">
              <p className="text-3xl md:text-4xl font-bold text-[hsl(220,40%,18%)]">
                {revenueLow} – {revenueHigh}/month
              </p>
              <p className="text-xs text-muted-foreground mt-1">by Month 12</p>
            </div>

            <p className="text-sm text-[hsl(220,40%,30%)]">
              Now unlock the AI builders that turn your plan into real products — <em>automatically.</em>
            </p>

            <p className="text-xs text-amber-700 font-semibold animate-bounce">
              ↓ Subscribe below ↓
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}

function ROICalculator({
  bookTitle, products, recommendedTier, onSubscribe, loading,
}: {
  bookTitle: string; products?: PlanAnalysisData["products"];
  recommendedTier: "starter" | "pro" | "enterprise";
  onSubscribe: (tier: "starter" | "pro" | "enterprise") => void; loading: boolean;
}) {
  const breakEvens = useMemo(() => plans.map(plan => ({
    plan,
    ...getBreakEven(plan.priceNum, products),
  })), [products]);

  const recPlan = plans.find(p => p.id === recommendedTier) || plans[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-border bg-card p-6 md:p-8"
    >
      <div className="text-center mb-6">
        <h3 className="font-heading text-lg md:text-xl font-bold flex items-center justify-center gap-2">
          <TrendingUp className="h-5 w-5 text-amber-500" />
          YOUR ROI — WHY THIS PAYS FOR ITSELF
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Based on Abby's analysis of "{bookTitle}":
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {breakEvens.map(({ plan, qty, productName, productPrice, total }) => (
          <div key={plan.id} className={`rounded-xl border p-5 text-center space-y-2 ${
            plan.id === recommendedTier ? "border-amber-400 bg-amber-500/5" : "border-border"
          }`}>
            <p className="text-sm font-bold">{plan.name} {plan.price}</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Break even:</p>
              <p className="text-foreground font-semibold text-lg">
                Sell {qty}
              </p>
              <p>
                {qty > 1 ? "copies" : "copy"} of your ${productPrice} {productName}
              </p>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                = ${total}/mo
              </p>
              <p className="text-[10px] text-muted-foreground">(covers {plan.price} sub)</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center space-y-4">
        <p className="text-sm font-medium flex items-center justify-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          Abby recommends: <strong>{recPlan.name.toUpperCase()}</strong> to start with Month 1-2 quick wins
        </p>
        <Button
          onClick={() => onSubscribe(recommendedTier)}
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 text-white px-8"
          size="lg"
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
          Get Started with {recPlan.name} — {recPlan.price}/mo →
        </Button>
      </div>
    </motion.div>
  );
}

