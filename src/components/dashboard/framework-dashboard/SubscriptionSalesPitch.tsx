import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Crown, Loader2, ArrowUpRight, Shield, Sparkles,
  TrendingUp, Star, Lock, X, Clock, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import type { SubscriptionTier } from "@/hooks/useAuth";

/* ─── Types ─── */
interface PlanAnalysisData {
  bookTitle: string;
  revenueStreamsCount?: number;
  revenueLow?: string;
  revenueHigh?: string;
  recommendedTier?: "starter" | "pro" | "enterprise";
  products?: Array<{
    name: string;
    price: number;
    type: string;
  }>;
}

interface Props {
  currentTier: SubscriptionTier;
  onSubscribe: (tier: "starter" | "pro" | "enterprise", promoCode?: string) => void;
  onManage: () => void;
  loading: boolean;
  analysisData: PlanAnalysisData;
  onBuildBusiness?: () => void;
}

/* ─── Plan definitions ─── */
const plans = [
  {
    id: "starter" as const,
    name: "Brand Package",
    specialPrice: "$49",
    usualPrice: "$69",
    priceNum: 69,
    specialPriceNum: 49,
    savings: "$20",
    annualSavings: "$240",
    period: "/mo",
    tagline: "Test the waters.",
    description: "Start building with all 9 Brand Products",
    popular: false,
    features: [
      "Abby AI Unlimited",
      "All 9 B·Brand Product builders",
      "Basic author profile page",
      "1 product sales page",
      "+ 5% platform fee on sales",
    ],
    unlockedCategories: ["B·Brand (9)"],
    builderCount: 9,
  },
  {
    id: "pro" as const,
    name: "Build Package",
    specialPrice: "$99",
    usualPrice: "$199",
    priceNum: 199,
    specialPriceNum: 99,
    savings: "$100",
    annualSavings: "$1,200",
    period: "/mo",
    tagline: "Build a real business.",
    description: "Full Brand + Build Authority — everything to monetize",
    popular: true,
    features: [
      "Everything in Brand",
      "All 9 B·Build Authority builders (Courses, Audiobooks, Memberships, Podcasts)",
      "Full microsite with unlimited sales pages",
      "Stripe Connect payment processing",
      "CRM & email automation",
      "Lead capture pages",
      "Coaching booking system",
      "+ 5% platform fee on sales",
    ],
    unlockedCategories: ["B·Brand (9)", "B·Build (9)"],
    builderCount: 18,
  },
  {
    id: "enterprise" as const,
    name: "Yield Package",
    specialPrice: "$249",
    usualPrice: "$499",
    priceNum: 499,
    specialPriceNum: 249,
    savings: "$250",
    annualSavings: "$3,000",
    period: "/mo",
    tagline: "Build an empire.",
    description: "Complete monetization empire — all 28 streams",
    popular: false,
    features: [
      "Everything in Build",
      "All 10 Y·Yield builders (Retreats, Certification, Masterminds)",
      "Full site with custom domain support",
      "White-label option (Authors Bureau branding removed)",
      "Events management system",
      "1-on-1 strategic session with Pauline Teo",
      "+ 5% platform fee on sales",
    ],
    unlockedCategories: ["B·Brand (9)", "B·Build (9)", "Y·Yield (10)"],
    builderCount: 28,
  },
];

const tierOrder = ["free", "starter", "pro", "enterprise"] as const;

/* ─── Countdown Timer Hook (DB-driven) ─── */
function useCountdown(userId?: string) {
  const [remaining, setRemaining] = useState(0);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [storedPromos, setStoredPromos] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (!userId) return;
    cloudSupabase
      .from("author_profiles")
      .select("consultation_promo_codes, consultation_promo_expires_at")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.consultation_promo_codes && data?.consultation_promo_expires_at) {
          const expires = new Date(data.consultation_promo_expires_at);
          if (expires > new Date()) {
            setExpiresAt(expires);
            setStoredPromos(data.consultation_promo_codes as Record<string, string>);
            setRemaining(expires.getTime() - Date.now());
          }
        }
      });
  }, [userId]);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const left = Math.max(0, expiresAt.getTime() - Date.now());
      setRemaining(left);
      if (left <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const expired = !expiresAt || remaining <= 0;
  const urgent = remaining > 0 && remaining < 10 * 60 * 1000;

  return { minutes, seconds, expired, urgent, remaining, storedPromos };
}

/* ─── Helpers ─── */
function getBreakEven(planPrice: number, products: PlanAnalysisData["products"]): { qty: number; productName: string; productPrice: number; total: number } {
  if (!products || products.length === 0) {
    const price = 27;
    const qty = Math.ceil(planPrice / price);
    return { qty, productName: "workbook", productPrice: price, total: qty * price };
  }
  const sorted = [...products].sort((a, b) => a.price - b.price);
  const product = sorted[0];
  const qty = Math.ceil(planPrice / product.price);
  return { qty, productName: product.name || product.type, productPrice: product.price, total: qty * product.price };
}

function getRevenueHookText(tier: SubscriptionTier): string {
  switch (tier) {
    case "starter": return "You've unlocked all 9 Brand Products. Upgrade to Build to access 18 builders and scale your authority.";
    case "pro": return "You've unlocked 18 builders. Upgrade to Yield for retreats, certification, and a 1-on-1 session with Pauline Teo.";
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
  const [promoCodes, setPromoCodes] = useState<Record<string, string>>({});
  const [stickyDismissed, setStickyDismissed] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const countdown = useCountdown();

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

  // Always recommend Build Package (pro) as most popular
  const recommended = "pro" as const;
  const recommendedPlan = plans.find(p => p.id === recommended)!;

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
            ✅ YIELD PACKAGE — Full Access to All 28 Builders
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

      {/* ─── Countdown Timer Banner ─── */}
      {!isSubscribed && !countdown.expired && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl mx-4 md:mx-8 mt-4 px-5 py-3 flex items-center justify-center gap-3 text-sm font-semibold ${
            countdown.urgent
              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
              : "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
          }`}
        >
          <Clock className={`h-4 w-4 ${countdown.urgent ? "animate-pulse" : ""}`} />
          <span>
            Special: Build Package is usually <span className="line-through">$199/mo</span>, now <strong>$99/mo</strong> for the next{" "}
            <span className="font-mono font-bold text-base">
              {String(countdown.minutes).padStart(2, "0")}:{String(countdown.seconds).padStart(2, "0")}
            </span>
            . Save $100/mo.
          </span>
          {countdown.urgent && <AlertTriangle className="h-4 w-4 animate-pulse" />}
        </motion.div>
      )}

      {!isSubscribed && countdown.expired && (
        <div className="rounded-xl mx-4 md:mx-8 mt-4 px-5 py-3 bg-muted text-center text-sm text-muted-foreground border border-border">
          First-timer promotional pricing has expired. Standard pricing applies.
        </div>
      )}

      {/* ─── Part 2: Pricing Cards ─── */}
      <div ref={pricingRef} className="py-8 px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const tierIdx = tierOrder.indexOf(plan.id);
            const currentIdx = tierOrder.indexOf(currentTier);
            const isCurrent = plan.id === currentTier;
            const isLower = tierIdx < currentIdx;

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

                  {/* Pricing with promo / standard switch */}
                  <div>
                    {!countdown.expired ? (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm text-muted-foreground line-through">{plan.usualPrice}/mo</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold">{plan.specialPrice}</span>
                          <span className="text-muted-foreground text-sm">{plan.period}</span>
                        </div>
                        <p className="text-[11px] text-green-600 dark:text-green-400 font-semibold mt-1">
                          You save {plan.savings}/mo ({plan.annualSavings}/yr)
                        </p>
                      </>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">{plan.usualPrice}</span>
                        <span className="text-muted-foreground text-sm">{plan.period}</span>
                      </div>
                    )}
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

                  {/* Promo Code Input */}
                  {!isCurrent && !isLower && (
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Promo code</label>
                      <Input
                        placeholder="Enter code"
                        value={promoCodes[plan.id] || ""}
                        onChange={(e) => setPromoCodes(prev => ({ ...prev, [plan.id]: e.target.value.toUpperCase() }))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  )}

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
                      onClick={() => onSubscribe(plan.id, promoCodes[plan.id]?.trim() || undefined)}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 shrink-0 animate-spin" />
                      ) : isSubscribed ? (
                        <ArrowUpRight className="h-4 w-4 mr-2 shrink-0" />
                      ) : (
                        <Crown className="h-4 w-4 mr-2 shrink-0" />
                      )}
                      {isSubscribed
                        ? `Upgrade to ${plan.name}`
                        : `Get ${plan.name}`}
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
          countdown={countdown}
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
              ? "Upgrade to Build to unlock coaching, courses, and webinars."
              : "Upgrade to Yield for retreats, certification, and a 1-on-1 session with Pauline Teo."}
          </p>
          <Button onClick={() => onSubscribe(currentTier === "starter" ? "pro" : "enterprise")} disabled={loading}>
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Upgrade to {currentTier === "starter" ? "Build" : "Yield"}
          </Button>
        </div>
      )}

      {/* ─── Trust badges ─── */}
      {!isSubscribed && (
        <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground py-4">
          <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-green-500" /> 14-day money-back guarantee</span>
          <span>·</span>
          <span>No questions asked</span>
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
                  🔥 Build Package: Usually $199/mo → <strong>$99/mo</strong> (save $1,200/yr)
                </p>
                <p className="text-xs text-white/70 flex items-center gap-1">
                  {!countdown.expired && (
                    <>
                      <Clock className="h-3 w-3" />
                      {String(countdown.minutes).padStart(2, "0")}:{String(countdown.seconds).padStart(2, "0")} remaining
                      <span className="mx-1">·</span>
                    </>
                  )}
                  14-day money-back guarantee
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={scrollToPricing}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  size="sm"
                >
                  Get Build Package — $99/mo →
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
  bookTitle, products, recommendedTier, onSubscribe, loading, countdown,
}: {
  bookTitle: string; products?: PlanAnalysisData["products"];
  recommendedTier: "starter" | "pro" | "enterprise";
  onSubscribe: (tier: "starter" | "pro" | "enterprise", promoCode?: string) => void; loading: boolean;
  countdown: { minutes: number; seconds: number; expired: boolean; urgent: boolean };
}) {
  const breakEvens = useMemo(() => plans.map(plan => ({
    plan,
    ...getBreakEven(plan.priceNum, products),
  })), [products]);

  const recPlan = plans.find(p => p.id === recommendedTier) || plans[1];

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
            <p className="text-sm font-bold">{plan.name} {plan.usualPrice}</p>
            <p className="text-[10px] text-muted-foreground line-through">Usually {plan.usualPrice}/mo</p>
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
              <p className="text-[10px] text-muted-foreground">(covers {plan.usualPrice} sub)</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center space-y-4">
        <p className="text-sm font-medium flex items-center justify-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          Abby recommends: <strong>BUILD PACKAGE</strong> — most authors start here
        </p>

        {/* Urgency + savings pitch */}
        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl px-5 py-4 max-w-lg mx-auto space-y-2 border border-amber-200 dark:border-amber-800">
          <p className="text-sm font-semibold text-foreground">
            Usually <span className="line-through">$199/mo</span> → <span className="text-amber-600 dark:text-amber-400">$99/mo today</span>
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
            That's $100 off every month — $1,200 saved over the year.
          </p>
          {!countdown.expired && (
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              First-timer rate expires in{" "}
              <span className="font-mono font-bold">
                {String(countdown.minutes).padStart(2, "0")}:{String(countdown.seconds).padStart(2, "0")}
              </span>
            </p>
          )}
        </div>

        <Button
          onClick={() => onSubscribe(recommendedTier)}
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 text-white px-8"
          size="lg"
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
          Get Started with Build Package — $99/mo →
        </Button>

        <p className="text-xs text-muted-foreground">
          <Shield className="h-3 w-3 inline mr-1" />
          14-day money-back guarantee. No questions asked. Cancel anytime.
        </p>

        <p className="text-[11px] text-muted-foreground italic max-w-md mx-auto">
          If $99 feels like a stretch today, the Brand Package at $49/mo (usually $69) gives you all 9 Brand Products to get started.
          Most authors upgrade to Build within 60 days.
        </p>
      </div>
    </motion.div>
  );
}

