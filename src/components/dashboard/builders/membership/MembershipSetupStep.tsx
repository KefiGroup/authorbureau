import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import type { MembershipStepProps } from "./types";

export default function MembershipSetupStep({ stepData, setStepData, onMarkEdited, bookTitle, plan }: MembershipStepProps) {
  const setup = stepData.setup || {};

  useEffect(() => {
    if (!setup.name) {
      const planName = plan?.products?.membership?.name;
      setStepData(prev => ({
        ...prev,
        setup: {
          name: planName || `${bookTitle} Inner Circle`,
          tagline: plan?.products?.membership?.tagline || "Your monthly dose of transformation",
          tierCount: "3",
          ...prev.setup,
        },
      }));
    }
  }, []);

  const update = (field: string, value: string) => {
    setStepData(prev => ({ ...prev, setup: { ...prev.setup, [field]: value } }));
    onMarkEdited("setup");
  };

  return (
    <div className="space-y-6">
      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed">
          3 tiers is the sweet spot. Your Reader Circle (free/low-cost) builds the community, 
          Pro (<strong>$27-$47/mo</strong>) delivers ongoing value, and VIP (<strong>$97-$197/mo</strong>) gives access to you personally.
        </p>
      </AbbyRecommendationCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold">Membership Name</Label>
            <Input
              value={setup.name || ""}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. The Inner Circle"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Tagline</Label>
            <Input
              value={setup.tagline || ""}
              onChange={(e) => update("tagline", e.target.value)}
              placeholder="Your monthly dose of transformation"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Number of Tiers</Label>
            <Select value={setup.tierCount || "3"} onValueChange={(v) => update("tierCount", v)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Tiers</SelectItem>
                <SelectItem value="3">3 Tiers (Recommended)</SelectItem>
                <SelectItem value="4">4 Tiers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview card */}
        <Card className="p-5 bg-muted/30 border-dashed flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-secondary/15 flex items-center justify-center mb-3">
            <Sparkles className="h-6 w-6 text-secondary" />
          </div>
          <h3 className="font-heading font-bold text-lg">{setup.name || "Your Membership"}</h3>
          <p className="text-xs text-muted-foreground mt-1">{setup.tagline || "Add a tagline"}</p>
          <div className="flex gap-2 mt-4">
            {Array.from({ length: parseInt(setup.tierCount || "3") }).map((_, i) => (
              <div key={i} className="h-2 w-8 rounded-full bg-secondary/30" />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-3">
            {setup.tierCount || "3"} tiers will be configured in the next step
          </p>
        </Card>
      </div>
    </div>
  );
}
