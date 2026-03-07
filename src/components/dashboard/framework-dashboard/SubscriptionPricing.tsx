import { motion } from "framer-motion";
import { Check, Crown, Loader2, ExternalLink, ArrowUpRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  currentTier: string;
  onSubscribe: (tier: "starter" | "pro" | "enterprise") => void;
  onManage: () => void;
  loading: boolean;
  abbyRecommendedTier?: string;
}

const plans = [
  {
    id: "starter" as const,
    name: "Starter",
    price: "$47",
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
    unlockedCategories: ["B·Build (3 of 11)"],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$197",
    period: "/mo",
    tagline: "Build a real business.",
    description: "Full Build + Bridge — everything to monetize",
    popular: true,
    features: [
      "Everything in Starter",
      "All 11 B·Build AI builders",
      "All 8 B·Bridge builders (Coaching, Speaking, Training)",
      "Full microsite with unlimited sales pages",
      "Stripe Connect payment processing",
      "CRM & email automation",
      "Lead capture pages",
      "Coaching booking system",
      "+ 5% platform fee on sales",
    ],
    unlockedCategories: ["B·Build (11)", "B·Bridge (8)"],
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: "$497",
    period: "/mo",
    tagline: "Build an empire.",
    description: "Complete monetization empire — all 27 streams",
    popular: false,
    features: [
      "Everything in Pro",
      "All 8 Y·Yield builders (Retreats, Certification, Masterminds)",
      "Full site with custom domain support",
      "White-label option (Authors Bureau branding removed)",
      "Events management system",
      "1-on-1 strategic session with Pauline Teo",
      "+ 5% platform fee on sales",
    ],
    unlockedCategories: ["B·Build (11)", "B·Bridge (8)", "Y·Yield (8)"],
  },
];

export default function SubscriptionPricing({ currentTier, onSubscribe, onManage, loading, abbyRecommendedTier }: Props) {
  const isSubscribed = currentTier !== "free";

  // Subscribed compact summary
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
            ✅ You're on the {currentPlan.name.toUpperCase()} PLAN ({currentPlan.price}/month)
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
            {currentPlan.unlockedCategories.map(cat => (
              <span key={cat} className="rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium px-3 py-1 border border-green-500/20">
                ✓ {cat}
              </span>
            ))}
            {currentTier !== "enterprise" && (
              <span className="rounded-full bg-muted text-muted-foreground text-xs font-medium px-3 py-1 border border-border">
                🔒 {currentTier === "starter" ? "B·Bridge + Y·Yield locked" : "Y·Yield locked"}
              </span>
            )}
          </div>
          <div className="flex justify-center gap-3">
            {currentTier !== "enterprise" && (
              <Button onClick={() => onSubscribe(currentTier === "starter" ? "pro" : "enterprise")} disabled={loading}>
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Upgrade to {currentTier === "starter" ? "Pro" : "Enterprise"}
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
      <div className="text-center space-y-2 mb-8">
        <h2 className="font-heading text-2xl md:text-3xl font-bold">
          Ready to Build Your Author Business?
        </h2>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          Your microsite is live. Your business plan is ready. Now unlock the AI builders that turn your plan into real products.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {plans.map((plan) => {
          const isRecommended = abbyRecommendedTier === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 transition-all flex flex-col ${
                plan.popular
                  ? "border-amber-400 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/30 scale-[1.02]"
                  : "border-border"
              } ${isRecommended ? "ring-2 ring-amber-400" : ""}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                  Most Popular
                </span>
              )}
              {isRecommended && !plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                  ⭐ Abby Recommends
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

                <Button
                  className={`w-full mt-auto ${plan.popular ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                  onClick={() => onSubscribe(plan.id)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
                  Get Started with {plan.name}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <p className="text-xs text-muted-foreground">
          Most authors spend <strong className="text-foreground">$300–$500/month</strong> on Kajabi + Mailchimp + Calendly + Canva + ChatGPT separately. 
          Authors Bureau includes everything — plus AI that builds your products for you.
        </p>
        <p className="text-[10px] text-muted-foreground">
          All plans include a 5% platform fee on sales. Standard Stripe fees (2.9% + $0.30) apply separately. You keep ~92%.
        </p>
      </div>
    </motion.section>
  );
}
