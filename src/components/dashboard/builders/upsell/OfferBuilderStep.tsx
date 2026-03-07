import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Wand2, Plus, Trash2, ArrowRight, ArrowDown, Check, X } from "lucide-react";
import type { UpsellStepProps, UpsellOffer, FunnelNode } from "./types";

export default function OfferBuilderStep({ stepData, setStepData, onMarkEdited, bookTitle }: UpsellStepProps) {
  const [generating, setGenerating] = useState(false);

  const setup = stepData.setup || {};
  const offer: UpsellOffer | null = stepData.offer || null;
  const funnel: FunnelNode[] = stepData.funnel || [];

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const funnelType = setup.funnelType || "post-purchase-upsell";
      const primaryProduct = setup.primaryProduct || bookTitle;
      const upsellProduct = setup.suggestedUpsell || "Online Course";

      const generatedOffer: UpsellOffer = {
        id: "offer-1",
        headline: funnelType === "exit-intent-downsell"
          ? `Wait! Before you go — get the ${upsellProduct} Starter Pack for 60% off`
          : funnelType === "order-bump"
          ? `Add the ${upsellProduct} Companion Guide`
          : funnelType === "bundle-offer"
          ? `Get the Complete ${primaryProduct} Bundle & Save 40%`
          : `Special Offer: Get the ${upsellProduct} for 40% Off — Only Available Now`,
        productName: upsellProduct,
        originalPrice: funnelType === "order-bump" ? 29 : funnelType === "exit-intent-downsell" ? 47 : 197,
        specialPrice: funnelType === "order-bump" ? 9 : funnelType === "exit-intent-downsell" ? 19 : 117,
        urgencyType: funnelType === "exit-intent-downsell" ? "one-time" : funnelType === "order-bump" ? "none" : "countdown",
        description: funnelType === "exit-intent-downsell"
          ? `You're about to miss out on the perfect companion to "${primaryProduct}". This starter pack gives you the essential tools to put what you've learned into action.`
          : funnelType === "order-bump"
          ? `Enhance your purchase with this curated companion guide. Exercises, templates, and quick-reference sheets — all in one printable PDF.`
          : `You've just invested in "${primaryProduct}" — now accelerate your results with the complete ${upsellProduct}. This exclusive offer is only available right now.`,
        includes: [
          `Full ${upsellProduct} access`,
          "Bonus templates and worksheets",
          "Private community access",
          funnelType === "order-bump" ? "Printable quick-reference guide" : "30-day email support",
        ],
      };

      const generatedFunnel: FunnelNode[] = funnelType === "post-purchase-upsell"
        ? [
          { id: "n1", type: "purchase", label: `Buy "${primaryProduct}"` },
          { id: "n2", type: "upsell", label: "Upsell Page", offerId: "offer-1", yesTarget: "n4", noTarget: "n3" },
          { id: "n3", type: "downsell", label: "Downsell (optional)", yesTarget: "n4", noTarget: "n4" },
          { id: "n4", type: "thank-you", label: "Thank You Page" },
        ]
        : funnelType === "exit-intent-downsell"
        ? [
          { id: "n1", type: "purchase", label: `Checkout: "${primaryProduct}"` },
          { id: "n2", type: "downsell", label: "Exit-Intent Popup", offerId: "offer-1", yesTarget: "n3", noTarget: "n4" },
          { id: "n3", type: "thank-you", label: "Thank You + Downsell Product" },
          { id: "n4", type: "thank-you", label: "Exit" },
        ]
        : funnelType === "order-bump"
        ? [
          { id: "n1", type: "purchase", label: `Checkout: "${primaryProduct}"` },
          { id: "n2", type: "order-bump", label: "Order Bump Checkbox", offerId: "offer-1" },
          { id: "n3", type: "thank-you", label: "Thank You Page" },
        ]
        : [
          { id: "n1", type: "purchase", label: "Bundle Landing Page" },
          { id: "n2", type: "upsell", label: `Buy "${primaryProduct}" Bundle`, offerId: "offer-1" },
          { id: "n3", type: "thank-you", label: "Thank You Page" },
        ];

      setStepData(prev => ({ ...prev, offer: generatedOffer, funnel: generatedFunnel }));
      setGenerating(false);
    }, 3000);
  };

  const updateOffer = (field: string, value: any) => {
    setStepData(prev => ({ ...prev, offer: { ...prev.offer, [field]: value, edited: true } }));
    onMarkEdited("offer");
  };

  const updateInclude = (idx: number, value: string) => {
    if (!offer) return;
    const updated = [...offer.includes];
    updated[idx] = value;
    updateOffer("includes", updated);
  };

  const addInclude = () => {
    if (!offer) return;
    updateOffer("includes", [...offer.includes, "New benefit"]);
  };

  const removeInclude = (idx: number) => {
    if (!offer) return;
    updateOffer("includes", offer.includes.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Offer Strategy</p>
            <p className="text-sm text-muted-foreground">
              The best upsells feel like a natural extension of what was just purchased. 
              I'll create an offer that connects your primary product to a logical next step with urgency.
            </p>
          </div>
        </div>
      </Card>

      {!offer && (
        <Card className="p-8 text-center border-dashed border-2">
          <Wand2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-heading font-semibold mb-2">Generate Your Offer</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            AI will create the perfect {setup.funnelType === "exit-intent-downsell" ? "downsell" : "upsell"} offer 
            based on your products and business plan, including pricing, copy, and funnel flow.
          </p>
          <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {generating ? "Building offer…" : "Generate Offer"}
          </Button>
        </Card>
      )}

      {offer && (
        <>
          {/* Offer editor */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-sm">Offer Details</h3>
              {offer.edited && <Badge variant="secondary" className="text-[9px]">Edited</Badge>}
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold">Headline</Label>
                <Input
                  value={offer.headline}
                  onChange={(e) => updateOffer("headline", e.target.value)}
                  className="mt-1.5 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Original Price</Label>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={offer.originalPrice}
                      onChange={(e) => updateOffer("originalPrice", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Special Price</Label>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={offer.specialPrice}
                      onChange={(e) => updateOffer("specialPrice", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <p className="text-[10px] text-secondary mt-1">
                    {Math.round((1 - offer.specialPrice / offer.originalPrice) * 100)}% off
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Urgency Element</Label>
                <Select value={offer.urgencyType} onValueChange={(v) => updateOffer("urgencyType", v)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="countdown">Countdown Timer</SelectItem>
                    <SelectItem value="limited-spots">Limited Spots</SelectItem>
                    <SelectItem value="one-time">One-Time Offer</SelectItem>
                    <SelectItem value="none">No Urgency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Description</Label>
                <Textarea
                  value={offer.description}
                  onChange={(e) => updateOffer("description", e.target.value)}
                  className="mt-1.5 text-sm min-h-[80px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-semibold">What's Included</Label>
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={addInclude}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                {offer.includes.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <Check className="h-3.5 w-3.5 text-secondary shrink-0" />
                    <Input
                      value={item}
                      onChange={(e) => updateInclude(i, e.target.value)}
                      className="text-sm h-8"
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeInclude(i)}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Funnel flowchart */}
          <Card className="p-5">
            <h3 className="font-heading font-semibold text-sm mb-4">Funnel Flow</h3>
            <div className="flex flex-col items-center gap-1">
              {funnel.map((node, i) => (
                <div key={node.id} className="flex flex-col items-center">
                  <div className={`px-4 py-2.5 rounded-lg border text-sm font-medium w-64 text-center ${
                    node.type === "upsell" || node.type === "downsell"
                      ? "bg-secondary/10 border-secondary/30"
                      : node.type === "order-bump"
                      ? "bg-amber-50 border-amber-200"
                      : node.type === "thank-you"
                      ? "bg-accent/10 border-accent/30"
                      : "bg-muted border-border"
                  }`}>
                    {node.label}
                  </div>
                  {(node.type === "upsell" || node.type === "downsell") && node.yesTarget && (
                    <div className="flex gap-8 mt-1">
                      <span className="text-[10px] text-accent font-medium">✓ Yes</span>
                      <span className="text-[10px] text-muted-foreground">✕ No</span>
                    </div>
                  )}
                  {i < funnel.length - 1 && (
                    <ArrowDown className="h-4 w-4 text-muted-foreground/40 my-0.5" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
