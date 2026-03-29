import { Crown, Loader2, Check, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { TIERS, type SubscriptionTier, hasTierAccess } from "@/hooks/useAuth";

interface PremiumGateProps {
  isPremium: boolean;
  featureName: string;
  children: React.ReactNode;
  requiredTier?: SubscriptionTier;
  currentTier?: SubscriptionTier;
}

const tierFeatures = {
  starter: [
    "Abby AI Consultation",
    "Workbook Builder",
    "Social Media Calendar",
    "Email Marketing Flows",
    "Author Website",
    "Book Sales (Events)",
    "Home Study Courses",
  ],
  pro: [
    "Everything in Brand Package, plus:",
    "Online Course Builder",
    "Audiobook Studio",
    "Podcast Scripts",
    "Webinar Builder",
    "1-on-1 Coaching Setup",
    "Group Coaching Programs",
    "CRM + Subscriber Management",
  ],
  enterprise: [
    "Everything in Build Package, plus:",
    "Keynote Speech Builder",
    "Corporate Training Programs",
    "Retreats & Bootcamps",
    "Certification Programs",
    "Masterminds",
    "Big Ticket Consulting",
    "Revenue Sharing / JV",
    "1-on-1 Session with Pauline Teo",
  ],
};

const tierColors = {
  starter: { gradient: "from-emerald-500 to-emerald-600", badge: "bg-emerald-500/15 text-emerald-700" },
  pro: { gradient: "from-violet-500 to-violet-600", badge: "bg-violet-500/15 text-violet-700" },
  enterprise: { gradient: "from-amber-500 to-amber-600", badge: "bg-amber-500/15 text-amber-700" },
};

export default function PremiumGate({
  isPremium,
  featureName,
  children,
  requiredTier = "brand",
  currentTier = "free",
}: PremiumGateProps) {
  const [loading, setLoading] = useState<string | null>(null);

  // If user has access, render children
  if (isPremium || hasTierAccess(currentTier, requiredTier)) return <>{children}</>;

  const handleUpgrade = async (priceId: string, tierKey: string) => {
    setLoading(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(null);
    }
  };

  const tiers = [
    { key: "brand" as const, tier: TIERS.starter, icon: Sparkles },
    { key: "build" as const, tier: TIERS.pro, icon: Zap },
    { key: "yield" as const, tier: TIERS.enterprise, icon: Crown },
  ];

  return (
    <div className="py-12 px-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4 mx-auto">
          <Crown className="h-8 w-8 text-secondary" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-2">
          Upgrade to Access {featureName}
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Choose the plan that fits your author business goals. Every tier includes Abby AI consultation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {tiers.map(({ key, tier, icon: Icon }) => {
          const colors = tierColors[key];
          const features = tierFeatures[key];
          const isRecommended = key === requiredTier;

          return (
            <div
              key={key}
              className={`relative rounded-2xl border p-6 bg-card ${
                isRecommended ? "border-secondary shadow-lg ring-1 ring-secondary/20" : "border-border"
              }`}
            >
              {isRecommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
                  Recommended
                </span>
              )}

              <div className="flex items-center gap-2 mb-3">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg">{tier.label}</h3>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold">${tier.monthlyPrice}</span>
                <span className="text-muted-foreground text-sm">/mo</span>
              </div>

              <ul className="space-y-2 mb-6">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    {!f.endsWith(":") ? (
                      <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                    ) : null}
                    <span className={f.endsWith(":") ? "font-semibold text-foreground" : ""}>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleUpgrade(tier.price_id, key)}
                disabled={loading !== null}
                className={`w-full rounded-full font-semibold ${
                  isRecommended
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
                size="sm"
              >
                {loading === key ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4 mr-2" />
                )}
                Get {tier.label}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
