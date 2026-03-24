import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Star, Check } from "lucide-react";
import type { MembershipStepProps, MembershipTier, DEFAULT_BENEFITS } from "./types";

const DEFAULT_TIERS: Omit<MembershipTier, "id">[] = [
  {
    name: "Reader Circle",
    description: "Access to the community and monthly content drops",
    monthlyPrice: 9,
    isMostPopular: false,
    benefits: [],
  },
  {
    name: "Pro Member",
    description: "Everything in Reader Circle plus live sessions, exclusive resources, and early access",
    monthlyPrice: 37,
    isMostPopular: true,
    benefits: [],
  },
  {
    name: "VIP Access",
    description: "Full access including monthly coaching calls, direct messaging, and product discounts",
    monthlyPrice: 127,
    isMostPopular: false,
    benefits: [],
  },
  {
    name: "Founding Member",
    description: "Lifetime access with all VIP benefits plus input on future content direction",
    monthlyPrice: 197,
    isMostPopular: false,
    benefits: [],
  },
];

const BENEFIT_OPTIONS = [
  "Monthly content drops",
  "Live Q&A sessions",
  "Community access",
  "Direct messaging",
  "Exclusive resources",
  "Early access to new products",
  "Monthly coaching call",
  "Discounts on other products",
];

// Default benefit mapping per tier index
const TIER_BENEFITS: Record<number, number[]> = {
  0: [0, 2],
  1: [0, 1, 2, 4, 5],
  2: [0, 1, 2, 3, 4, 5, 6, 7],
  3: [0, 1, 2, 3, 4, 5, 6, 7],
};

export default function TierBuilderStep({ stepData, setStepData, onMarkEdited }: MembershipStepProps) {
  const tierCount = parseInt(stepData.setup?.tierCount || "3");
  const tiers: MembershipTier[] = stepData.tiers || [];

  useEffect(() => {
    if (tiers.length === 0) {
      const initial = DEFAULT_TIERS.slice(0, tierCount).map((t, i) => ({
        ...t,
        id: `tier-${i}`,
        benefits: BENEFIT_OPTIONS.map((label, bi) => ({
          id: `benefit-${i}-${bi}`,
          label,
          included: (TIER_BENEFITS[i] || []).includes(bi),
        })),
      }));
      setStepData(prev => ({ ...prev, tiers: initial }));
    }
  }, [setStepData, tierCount]);

  const updateTier = (idx: number, field: string, value: any) => {
    const updated = [...tiers];
    (updated[idx] as any)[field] = value;
    setStepData(prev => ({ ...prev, tiers: updated }));
    onMarkEdited("tiers");
  };

  const toggleBenefit = (tierIdx: number, benefitIdx: number) => {
    const updated = [...tiers];
    updated[tierIdx].benefits[benefitIdx].included = !updated[tierIdx].benefits[benefitIdx].included;
    setStepData(prev => ({ ...prev, tiers: updated }));
    onMarkEdited("tiers");
  };

  const setMostPopular = (tierIdx: number) => {
    const updated = tiers.map((t, i) => ({ ...t, isMostPopular: i === tierIdx }));
    setStepData(prev => ({ ...prev, tiers: updated }));
    onMarkEdited("tiers");
  };

  return (
    <div className="space-y-6">
      {/* Abby tip */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-secondary mb-1">Abby's Pricing Strategy</p>
            <p className="text-sm text-muted-foreground">
              Make the middle tier the obvious choice by giving it 80% of the VIP value at 40% of the price. 
              This is the decoy pricing strategy — the VIP makes Pro look like a steal.
            </p>
          </div>
        </div>
      </Card>

      {/* Tier comparison cards */}
      <div className={`grid gap-4 ${tierCount <= 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"}`}>
        {tiers.slice(0, tierCount).map((tier, idx) => (
          <Card
            key={tier.id}
            className={`p-4 relative ${tier.isMostPopular ? "border-secondary ring-1 ring-secondary/30" : ""}`}
          >
            {tier.isMostPopular && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground text-[10px]">
                <Star className="h-2.5 w-2.5 mr-1" /> Most Popular
              </Badge>
            )}

            <div className="space-y-3 mt-1">
              <div>
                <Input
                  value={tier.name}
                  onChange={(e) => updateTier(idx, "name", e.target.value)}
                  className="font-heading font-bold text-base border-none px-0 h-auto focus-visible:ring-0"
                  placeholder="Tier name"
                />
              </div>

              <div>
                <Label className="text-[10px] text-muted-foreground">Monthly Price</Label>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    value={tier.monthlyPrice}
                    onChange={(e) => updateTier(idx, "monthlyPrice", parseFloat(e.target.value) || 0)}
                    className="w-20 font-bold text-lg border-none px-0 h-auto focus-visible:ring-0"
                  />
                  <span className="text-muted-foreground text-xs">/mo</span>
                </div>
              </div>

              <div>
                <Input
                  value={tier.description}
                  onChange={(e) => updateTier(idx, "description", e.target.value)}
                  className="text-xs text-muted-foreground border-none px-0 h-auto focus-visible:ring-0"
                  placeholder="Brief description"
                />
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Included</p>
                {tier.benefits.map((b, bi) => (
                  <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={b.included}
                      onCheckedChange={() => toggleBenefit(idx, bi)}
                      className="h-3.5 w-3.5"
                    />
                    <span className={`text-xs ${b.included ? "text-foreground" : "text-muted-foreground/50 line-through"}`}>
                      {b.label}
                    </span>
                  </label>
                ))}
              </div>

              <Button
                variant={tier.isMostPopular ? "secondary" : "outline"}
                size="sm"
                className="w-full text-xs"
                onClick={() => setMostPopular(idx)}
              >
                {tier.isMostPopular ? (
                  <><Check className="h-3 w-3 mr-1" /> Most Popular</>
                ) : (
                  "Set as Most Popular"
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
