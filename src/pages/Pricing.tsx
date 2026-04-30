import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, TIERS, hasTierAccess } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Sparkles, Zap, Crown, ArrowLeft, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PLANS = [
  {
    key: "brand" as const,
    name: "Brand Package",
    price: TIERS.brand.monthlyPrice,
    annualPrice: TIERS.brand.annualPrice,
    priceId: TIERS.brand.price_id,
    annualPriceId: TIERS.brand.annual_price_id,
    icon: Sparkles,
    badge: null,
    cta: "Start Building",
    gradient: "from-emerald-500 to-emerald-600",
    features: [
      "ABBY AI Consultation",
      "9 Brand Products nodes",
      "Author microsite",
      "Email marketing + lead magnets",
      "Social media calendar",
      "Webinars",
      "Digital products (workbook, course, special edition)",
      "Book sales page",
    ],
  },
  {
    key: "build" as const,
    name: "Build Package",
    price: TIERS.build.monthlyPrice,
    annualPrice: TIERS.build.annualPrice,
    priceId: TIERS.build.price_id,
    annualPriceId: TIERS.build.annual_price_id,
    icon: Zap,
    badge: "Most Popular",
    cta: "Build My Authority",
    gradient: "from-violet-500 to-violet-600",
    features: [
      "Everything in Brand Package",
      "9 Build Authority nodes",
      "Online course (hosted platform)",
      "Audiobook distribution",
      "Membership site",
      "Group coaching",
      "Podcast hosting & distribution",
      "Media & PR, Affiliates, JV Partnerships",
    ],
  },
  {
    key: "yield" as const,
    name: "Yield Package",
    price: TIERS.yield.monthlyPrice,
    annualPrice: TIERS.yield.annualPrice,
    priceId: TIERS.yield.price_id,
    annualPriceId: TIERS.yield.annual_price_id,
    icon: Crown,
    badge: "Best Value",
    cta: "Unlock Full Platform",
    gradient: "from-amber-500 to-amber-600",
    features: [
      "Everything in Build Package",
      "10 Yield Revenue nodes",
      "1-on-1 Coaching",
      "Big Ticket Offers & Keynote Speaking",
      "Corporate Training & Mastermind",
      "Retreats & Certification Program",
      "Conferences, Fundraising, Exhibitors & Sponsors",
      "Priority support + 1-on-1 with Pauline Teo",
    ],
  },
];

export default function Pricing() {
  useDocumentMeta({
    title: "Pricing — Authors Bureau | Brand, Build & Yield Packages",
    description: "Choose the Authors Bureau plan that matches your ambition. Every plan includes ABBY AI consultation and access to AI-powered revenue stream builders.",
    ogTitle: "Pricing — Authors Bureau",
    ogDescription: "Choose the Authors Bureau plan that matches your ambition. Every plan includes ABBY AI consultation and revenue stream builders.",
    ogImage: "https://authorsbureau.com/og-image.jpg",
    ogUrl: "https://authorsbureau.com/pricing",
    canonical: "https://authorsbureau.com/pricing",
    twitterCard: "summary_large_image",
  });

  const { user, tier, isPremium } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  // Upgrade-context params: ?upgrade=brand|build|yield&node=<id>&nodeLabel=<label>&bookId=<id>&bookTitle=<title>
  const upgradeTier = (searchParams.get("upgrade") || "").toLowerCase();
  const nodeLabel = searchParams.get("nodeLabel");
  const bookId = searchParams.get("bookId");
  const bookTitle = searchParams.get("bookTitle");
  const fromBookHub = searchParams.get("from") === "book-hub";
  const highlightedPlan = useMemo(() => PLANS.find((p) => p.key === upgradeTier), [upgradeTier]);
  const cardsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (highlightedPlan && cardsRef.current) {
      cardsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [highlightedPlan]);

  const handleCheckout = async (plan: typeof PLANS[number]) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setLoading(plan.key);
    const popup = window.open("about:blank", "_blank");
    try {
      const priceId = billingCycle === "annual" ? plan.annualPriceId : plan.priceId;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url && popup) {
        popup.location.href = data.url;
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      popup?.close();
      console.error("Checkout error:", err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-16 sm:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-heading text-3xl sm:text-5xl font-bold mb-4">
              Choose Your <span className="text-secondary">Growth Plan</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Every plan includes ABBY AI consultation. Pick the tier that matches your ambition.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-3 rounded-full border border-border bg-muted/50 p-1">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${billingCycle === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${billingCycle === "annual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Annual <span className="text-emerald-600 text-xs font-bold ml-1">Save ~17%</span>
              </button>
            </div>
          </div>

          {/* Upgrade context banner — appears when user arrives from a locked node */}
          {highlightedPlan && (
            <div className="max-w-3xl mx-auto mb-8 rounded-2xl border-2 border-secondary/40 bg-secondary/10 p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                  <Lock className="h-4 w-4 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">Unlock to continue</p>
                  <h2 className="font-heading font-bold text-lg leading-tight">
                    {nodeLabel ? <>Upgrade to <span className="text-secondary">{highlightedPlan.name}</span> to unlock <span className="underline">{decodeURIComponent(nodeLabel)}</span></> : <>Upgrade to <span className="text-secondary">{highlightedPlan.name}</span></>}
                  </h2>
                  {bookTitle && (
                    <p className="text-xs text-muted-foreground mt-1">
                      For <strong>"{decodeURIComponent(bookTitle)}"</strong>
                    </p>
                  )}
                  {fromBookHub && bookId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/book/${bookId}`)}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-secondary hover:underline font-semibold"
                    >
                      <ArrowLeft className="h-3 w-3" /> Back to Book Hub
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cards */}
          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = tier === plan.key;
              const hasAccess = hasTierAccess(tier, plan.key);
              const displayPrice = billingCycle === "annual" ? Math.round(plan.annualPrice / 12) : plan.price;
              const isHighlighted = highlightedPlan?.key === plan.key;

              return (
                <div
                  key={plan.key}
                  className={`relative rounded-2xl border p-6 sm:p-8 bg-card flex flex-col transition-all ${
                    isHighlighted
                      ? "border-secondary shadow-xl ring-2 ring-secondary/40 scale-[1.02]"
                      : plan.badge === "Most Popular"
                        ? "border-secondary shadow-lg ring-1 ring-secondary/20"
                        : "border-border"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold uppercase tracking-widest bg-secondary text-secondary-foreground px-4 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-heading font-bold text-xl">{plan.name}</h3>
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-bold">${displayPrice}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                    {billingCycle === "annual" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Billed ${plan.annualPrice}/year
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <Button disabled className="w-full rounded-full" size="lg">
                      Your Current Plan
                    </Button>
                  ) : hasAccess ? (
                    <Button disabled variant="outline" className="w-full rounded-full" size="lg">
                      Included in Your Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleCheckout(plan)}
                      disabled={loading !== null}
                      className={`w-full rounded-full font-semibold ${
                        plan.badge === "Most Popular"
                          ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                          : ""
                      }`}
                      size="lg"
                    >
                      {loading === plan.key ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Icon className="h-4 w-4 mr-2" />
                      )}
                      {plan.cta}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-12">
            <p className="text-sm text-muted-foreground mb-2">All plans include a 14-day money-back guarantee.</p>
            <Button asChild variant="link">
              <Link to="/dashboard">← Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
