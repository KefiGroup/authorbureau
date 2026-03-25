import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, ArrowRight, Gift, Timer, Package } from "lucide-react";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import type { UpsellStepProps, FunnelType, FUNNEL_TYPE_LABELS, FUNNEL_TYPE_DESCRIPTIONS } from "./types";

const FUNNEL_ICONS: Record<FunnelType, typeof ShoppingCart> = {
  "post-purchase-upsell": ArrowRight,
  "exit-intent-downsell": Timer,
  "order-bump": Gift,
  "bundle-offer": Package,
};

export default function FunnelSetupStep({ stepData, setStepData, onMarkEdited, bookTitle, plan }: UpsellStepProps) {
  const setup = stepData.setup || {};

  useEffect(() => {
    if (!setup.primaryProduct) {
      setStepData(prev => ({
        ...prev,
        setup: {
          primaryProduct: bookTitle || "My Book",
          funnelType: "post-purchase-upsell" as FunnelType,
          suggestedUpsell: plan?.products?.course?.name || "Online Course",
          ...prev.setup,
        },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookTitle, setStepData]);

  const update = (field: string, value: string) => {
    setStepData(prev => ({ ...prev, setup: { ...prev.setup, [field]: value } }));
    onMarkEdited("setup");
  };

  const funnelTypes: { type: FunnelType; label: string; desc: string }[] = [
    { type: "post-purchase-upsell", label: "Post-Purchase Upsell", desc: "Shown immediately after purchase — 'Add this for a special price'" },
    { type: "exit-intent-downsell", label: "Exit-Intent Downsell", desc: "Triggered when customer tries to leave — 'Wait! Here's a better deal'" },
    { type: "order-bump", label: "Order Bump", desc: "Checkbox on checkout page — 'Add this for just $X more'" },
    { type: "bundle-offer", label: "Bundle Offer", desc: "Combine multiple products at a discount — 'Get everything for one price'" },
  ];

  return (
    <div className="space-y-6">
      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed">
          Your workbook buyers are the perfect audience for an upsell to the Online Course. 
          I recommend a <strong>"Special offer: Get the full course for 40% off — only available now"</strong> upsell.
        </p>
      </AbbyRecommendationCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold">Primary Product</Label>
            <Input
              value={setup.primaryProduct || ""}
              onChange={(e) => update("primaryProduct", e.target.value)}
              placeholder="The product that triggers the funnel"
              className="mt-1.5"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              This is the product the customer buys first
            </p>
          </div>

          <div>
            <Label className="text-xs font-semibold">Upsell Product</Label>
            <Input
              value={setup.suggestedUpsell || ""}
              onChange={(e) => update("suggestedUpsell", e.target.value)}
              placeholder="e.g. Online Course, Coaching Package"
              className="mt-1.5"
            />
          </div>
        </div>

        {/* Funnel type selection */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold">Funnel Type</Label>
          {funnelTypes.map(({ type, label, desc }) => {
            const Icon = FUNNEL_ICONS[type];
            const selected = setup.funnelType === type;
            return (
              <button
                key={type}
                onClick={() => update("funnelType", type)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                  selected
                    ? "border-secondary bg-secondary/5 ring-1 ring-secondary/20"
                    : "border-border hover:border-secondary/30"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  selected ? "bg-secondary/20" : "bg-muted"
                }`}>
                  <Icon className={`h-4 w-4 ${selected ? "text-secondary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
                {selected && (
                  <Badge className="ml-auto bg-secondary/20 text-secondary text-[9px] shrink-0">Selected</Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual flow preview */}
      <Card className="p-5 bg-muted/30 border-dashed">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">Funnel Flow Preview</p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {[
            { label: `Buy "${setup.primaryProduct || "Product"}"`, icon: ShoppingCart, active: true },
            { label: setup.funnelType === "order-bump" ? "Order Bump ✓" : setup.funnelType === "bundle-offer" ? "Bundle Page" : "Upsell Page", icon: ArrowRight, active: true },
            ...(setup.funnelType === "exit-intent-downsell" || setup.funnelType === "post-purchase-upsell"
              ? [{ label: "Accept / Decline", icon: ArrowRight, active: false }]
              : []),
            { label: setup.funnelType === "exit-intent-downsell" ? "Downsell Page" : "Thank You", icon: Gift, active: false },
          ].map((node, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`px-3 py-2 rounded-lg border text-xs font-medium ${
                node.active ? "bg-secondary/10 border-secondary/30 text-foreground" : "bg-muted border-border text-muted-foreground"
              }`}>
                {node.label}
              </div>
              {i < (setup.funnelType === "exit-intent-downsell" || setup.funnelType === "post-purchase-upsell" ? 3 : 1) && (
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
