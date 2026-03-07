import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, DollarSign, BarChart3, ShoppingCart, Loader2, Check, Rocket } from "lucide-react";
import type { UpsellStepProps, UpsellOffer } from "./types";

export default function UpsellPublishStep({ stepData, setStepData, onMarkEdited }: UpsellStepProps) {
  const [publishing, setPublishing] = useState(false);
  const [walkthrough, setWalkthrough] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);

  const setup = stepData.setup || {};
  const offer: UpsellOffer | null = stepData.offer || null;
  const funnelType = setup.funnelType || "post-purchase-upsell";

  const conversionRate = funnelType === "order-bump" ? 25 : funnelType === "post-purchase-upsell" ? 20 : 15;
  const monthlyPurchases = 50;
  const additionalRevenue = offer ? Math.round(monthlyPurchases * (conversionRate / 100) * offer.specialPrice) : 0;

  const walkthroughSteps = [
    { label: "Customer purchases primary product", desc: `"${setup.primaryProduct}" — checkout complete` },
    { label: funnelType === "order-bump" ? "Order bump appears on checkout" : "Upsell page appears", desc: offer?.headline || "Special offer shown" },
    { label: "Customer accepts or declines", desc: `${conversionRate}% accept rate expected` },
    { label: "Thank you page", desc: "Order confirmation with next steps" },
  ];

  const handlePublish = () => {
    setPublishing(true);
    setTimeout(() => {
      setPublishing(false);
      setStepData(prev => ({ ...prev, published: true }));
      onMarkEdited("publish");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Abby projection */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Revenue Uplift Projection</p>
            <p className="text-sm text-muted-foreground">
              Based on a <strong>{conversionRate}%</strong> {funnelType === "order-bump" ? "order bump" : "upsell"} conversion rate 
              with {monthlyPurchases} monthly purchases at ${offer?.specialPrice || 0}, 
              this could add <strong className="text-foreground">${additionalRevenue.toLocaleString()}/month</strong> to your revenue — 
              with zero additional traffic needed.
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: ShoppingCart, label: "Funnel Type", value: funnelType === "order-bump" ? "Order Bump" : funnelType === "exit-intent-downsell" ? "Downsell" : funnelType === "bundle-offer" ? "Bundle" : "Upsell" },
          { icon: DollarSign, label: "Offer Price", value: `$${offer?.specialPrice || 0}` },
          { icon: BarChart3, label: "Conv. Rate", value: `${conversionRate}%` },
          { icon: TrendingUp, label: "Monthly Uplift", value: `+$${additionalRevenue.toLocaleString()}` },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="p-3 text-center">
            <Icon className="h-4 w-4 text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      {/* Funnel walkthrough */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-sm">Customer Walkthrough</h3>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              setWalkthrough(true);
              setWalkthroughStep(0);
              const interval = setInterval(() => {
                setWalkthroughStep(prev => {
                  if (prev >= walkthroughSteps.length - 1) {
                    clearInterval(interval);
                    return prev;
                  }
                  return prev + 1;
                });
              }, 1500);
            }}
            disabled={walkthrough}
          >
            {walkthrough ? "Walking through…" : "▶ Start Walkthrough"}
          </Button>
        </div>

        <div className="space-y-3">
          {walkthroughSteps.map((step, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-300 ${
                walkthrough && i === walkthroughStep
                  ? "border-secondary bg-secondary/5 scale-[1.02]"
                  : walkthrough && i < walkthroughStep
                  ? "border-accent/30 bg-accent/5"
                  : "border-border"
              }`}
            >
              <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                walkthrough && i < walkthroughStep
                  ? "bg-accent text-accent-foreground"
                  : walkthrough && i === walkthroughStep
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}>
                {walkthrough && i < walkthroughStep ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <div>
                <p className="text-sm font-medium">{step.label}</p>
                <p className="text-[10px] text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Publish */}
      <div className="flex items-center gap-4">
        <Button
          className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90 h-12 text-sm font-semibold"
          onClick={handlePublish}
          disabled={publishing || stepData.published}
        >
          {publishing ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Publishing…</>
          ) : stepData.published ? (
            <><Check className="h-4 w-4 mr-2" /> Published!</>
          ) : (
            <><Rocket className="h-4 w-4 mr-2" /> Publish Funnel</>
          )}
        </Button>
        <Button variant="outline" className="h-12 text-sm" onClick={() => onMarkEdited("publish")}>
          Save as Draft
        </Button>
      </div>
    </div>
  );
}
