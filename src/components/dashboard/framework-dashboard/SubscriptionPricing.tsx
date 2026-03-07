import { motion } from "framer-motion";
import { Check, Crown, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  currentTier: string;
  onSubscribe: (tier: "starter" | "pro" | "enterprise") => void;
  onManage: () => void;
  loading: boolean;
}

const plans = [
  {
    id: "starter" as const,
    name: "Starter",
    price: "$47",
    period: "/mo",
    description: "Start building with 3 core AI builders",
    popular: false,
    features: [
      "3 B·Build AI builders (Workbook, Social Media, Email)",
      "Basic author profile page",
      "1 product sales page",
      "Abby business consultation",
      "+ 5% platform fee on sales",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$197",
    period: "/mo",
    description: "Full Build + Bridge — everything to monetize",
    popular: true,
    features: [
      "All 11 B·Build AI builders",
      "All 8 B·Bridge builders (Coaching, Speaking, Training)",
      "Full microsite with unlimited pages",
      "Stripe payment processing",
      "CRM & email automation",
      "Coaching booking system",
      "Lead capture forms",
      "+ 5% platform fee on sales",
    ],
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: "$497",
    period: "/mo",
    description: "Complete monetization empire — all 27 streams",
    popular: false,
    features: [
      "Everything in Pro",
      "All 8 Y·Yield builders (Retreats, Certification, Masterminds)",
      "Custom domain support",
      "White-label (remove platform branding)",
      "Events management system",
      "1-on-1 session with founder Pauline Teo",
      "+ 5% platform fee on sales",
    ],
  },
];

export default function SubscriptionPricing({ currentTier, onSubscribe, onManage, loading }: Props) {
  const isSubscribed = currentTier !== "free";

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 transition-all ${
                plan.popular
                  ? "border-amber-400 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/30"
                  : "border-border"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                  Most Popular
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="font-heading text-lg font-bold">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="outline" className="w-full" onClick={onManage} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                    Manage Plan
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${plan.popular ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                    onClick={() => onSubscribe(plan.id)}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
                    {isSubscribed ? "Switch to " + plan.name : "Get " + plan.name}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground max-w-md mx-auto">
        Most authors spend <strong>$300–$500/month</strong> on Kajabi + Mailchimp + Calendly + Canva + ChatGPT separately. 
        Get everything in one platform.
      </p>
    </motion.section>
  );
}
