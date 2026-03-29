import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Loader2, ExternalLink, ArrowUpRight, Shield, Clock, Zap, Sparkles, Gift, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  currentTier: string;
  onSubscribe: (tier: "starter" | "pro" | "enterprise", promoCode?: string) => void;
  onManage: () => void;
  loading: boolean;
  abbyRecommendedTier?: string;
}


const TIMER_KEY = "ab_promo_start";
const PROMO_DURATION_MS = 60 * 60 * 1000; // 60 minutes

function getTimeRemaining(): number {
  const stored = localStorage.getItem(TIMER_KEY);
  if (!stored) {
    localStorage.setItem(TIMER_KEY, Date.now().toString());
    return PROMO_DURATION_MS;
  }
  const elapsed = Date.now() - parseInt(stored, 10);
  return Math.max(0, PROMO_DURATION_MS - elapsed);
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

const plans = [
  {
    id: "starter" as const,
    name: "Brand Package",
    specialPrice: "$49",
    usualPrice: "$69",
    savings: "$20",
    period: "/mo",
    icon: Sparkles,
    tagline: "Create your product suite.",
    description: "Start building with Brand Products",
    popular: false,
    features: [
      "Abby AI Unlimited Consultation",
      "All 9 B·Brand Products builders",
      "Basic author profile page",
      "1 product sales page",
      "+ 5% platform fee on sales",
    ],
    unlockedCategories: ["B·Brand (9)"],
  },
  {
    id: "pro" as const,
    name: "Build Package",
    specialPrice: "$99",
    usualPrice: "$199",
    savings: "$100",
    period: "/mo",
    icon: Zap,
    tagline: "Scale your audience & revenue.",
    description: "Full Brand + Build Authority — everything to monetize",
    popular: true,
    features: [
      "Everything in Brand Package",
      "All 9 B·Build Authority builders",
      "Full website with unlimited sales pages",
      "Stripe Connect payment processing",
      "CRM & email automation",
      "Lead capture pages",
      "Coaching booking system",
      "+ 5% platform fee on sales",
    ],
    unlockedCategories: ["B·Brand (9)", "B·Build (9)"],
  },
  {
    id: "enterprise" as const,
    name: "Yield Package",
    specialPrice: "$249",
    usualPrice: "$499",
    savings: "$250",
    period: "/mo",
    icon: Crown,
    tagline: "Premium high-ticket empire.",
    description: "Complete monetization empire — all 28 streams",
    popular: false,
    features: [
      "Everything in Build Package",
      "All 10 Y·Yield builders",
      "Full site with custom domain support",
      "White-label option",
      "Events management system",
      "1-on-1 strategic session with Pauline Teo",
      "+ 5% platform fee on sales",
    ],
    unlockedCategories: ["B·Brand (9)", "B·Build (9)", "Y·Yield (10)"],
  },
];

export default function SubscriptionPricing({ currentTier, onSubscribe, onManage, loading, abbyRecommendedTier }: Props) {
  const isSubscribed = currentTier !== "free";
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [promoCodes, setPromoCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const promoExpired = timeLeft <= 0;

  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  if (isSubscribed) {
    const currentPlan = plans.find(p => p.id === currentTier) || plans[0];
    return (
      <motion.section
        className="rounded-2xl border border-border bg-card p-6 md:p-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full px-4 py-2 text-sm font-bold">
            <Shield className="h-4 w-4" />
            ✅ You're on the {currentPlan.name.toUpperCase()} ({currentPlan.usualPrice}/month)
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
            {currentPlan.unlockedCategories.map(cat => (
              <span key={cat} className="rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium px-3 py-1 border border-green-500/20">
                ✓ {cat}
              </span>
            ))}
            {currentTier !== "enterprise" && (
              <span className="rounded-full bg-muted text-muted-foreground text-xs font-medium px-3 py-1 border border-border">
                🔒 {currentTier === "starter" ? "B·Build + Y·Yield locked" : "Y·Yield locked"}
              </span>
            )}
          </div>
          <div className="flex justify-center gap-3">
            {currentTier !== "enterprise" && (
              <Button onClick={() => onSubscribe(currentTier === "starter" ? "pro" : "enterprise")} disabled={loading}>
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Upgrade to {currentTier === "starter" ? "Build Package" : "Yield Package"}
              </Button>
            )}
            <Button variant="outline" onClick={onManage} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
              Manage Subscription
            </Button>
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      className="rounded-2xl border border-border bg-card p-6 md:p-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Header */}
      <div className="text-center space-y-3 mb-6">
        <h2 className="font-heading text-2xl md:text-3xl font-bold">
          Ready to Build Your Author Business?
        </h2>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          Your directory profile is live. Your business plan is ready. Now unlock the AI builders that turn your plan into real products.
        </p>
      </div>

      {/* Urgency Banner */}
      {!promoExpired && (
        <motion.div
          className="mx-auto max-w-2xl mb-8 rounded-xl border-2 border-amber-400/60 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 p-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-500 shrink-0" />
              <span className="text-sm font-bold text-foreground">
                🎉 First-Timer Promo — Exclusive pricing just for you!
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-foreground/5 px-3 py-1.5">
              <Clock className="h-4 w-4 text-destructive animate-pulse" />
              <span className="font-mono text-lg font-bold text-destructive tracking-wider">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            This offer expires when the timer runs out. Lock in your promotional rate today.
          </p>
        </motion.div>
      )}

      {promoExpired && (
        <div className="mx-auto max-w-2xl mb-8 rounded-xl border border-muted bg-muted/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            ⏰ The first-timer promo has expired. Standard pricing now applies.
          </p>
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {plans.map((plan, index) => {
          const isRecommended = abbyRecommendedTier === plan.id;
          const Icon = plan.icon;
          const showPromo = !promoExpired;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className={`relative rounded-2xl border p-6 transition-all flex flex-col bg-card ${
                plan.popular
                  ? "border-amber-400 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/30 md:scale-[1.03]"
                  : "border-border hover:border-amber-400/40 hover:shadow-md"
              } ${isRecommended ? "ring-2 ring-amber-400" : ""}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-4 py-1 text-[10px] font-bold text-white uppercase tracking-wider whitespace-nowrap">
                  🔥 Most Popular
                </span>
              )}
              {isRecommended && !plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                  ⭐ Abby Recommends
                </span>
              )}

              <div className="space-y-4 flex-1 flex flex-col">
                {/* Plan Header */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    plan.popular
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold">{plan.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{plan.description}</p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-1">
                  {showPromo ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-foreground">{plan.specialPrice}</span>
                        <span className="text-muted-foreground text-sm">{plan.period}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground line-through">{plan.usualPrice}/mo</span>
                        <span className="rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-[10px] font-bold px-2 py-0.5">
                          SAVE {plan.savings}/mo
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-foreground">{plan.usualPrice}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                  )}
                </div>

                {/* Promo Code Input */}
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Promo code</label>
                  <Input
                    placeholder="Enter code"
                    value={promoCodes[plan.id] || ""}
                    onChange={(e) => setPromoCodes(prev => ({ ...prev, [plan.id]: e.target.value.toUpperCase() }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                {/* Tagline */}
                <p className="text-xs font-semibold italic text-amber-600 dark:text-amber-400">
                  "{plan.tagline}"
                </p>

                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className={`w-full mt-auto text-xs sm:text-sm font-semibold ${
                    plan.popular
                      ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"
                      : ""
                  }`}
                  onClick={() => onSubscribe(plan.id, promoCodes[plan.id]?.trim() || undefined)}
                  disabled={loading}
                  size="lg"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 shrink-0 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4 mr-2 shrink-0" />
                  )}
                  {showPromo ? `Get ${plan.name} — ${plan.specialPrice}/mo` : `Get ${plan.name}`}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Refund Guarantee & Trust */}
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">14-Day Money-Back Guarantee</p>
            <p className="text-xs text-muted-foreground mt-1">
              Not happy? No problem. Cancel within 14 days for a full refund — no questions asked. 
              We're confident you'll love what Abby builds for you, but the safety net is there.
            </p>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Most authors spend <strong className="text-foreground">$300–$500/month</strong> on Kajabi + Mailchimp + Calendly + Canva + ChatGPT separately.
            Authors Bureau includes everything — plus AI that builds your products for you.
          </p>
          <p className="text-[10px] text-muted-foreground">
            All plans include a 5% platform fee on sales. Standard Stripe fees (2.9% + $0.30) apply separately. You keep ~92%.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
