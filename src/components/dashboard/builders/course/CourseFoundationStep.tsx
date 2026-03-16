import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wand2, Sparkles } from "lucide-react";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import ProductDistinctionCard from "../shared/ProductDistinctionCard";
import type { CourseStepProps } from "./types";

const PRICE_TIERS = [
  { label: "Free", value: "0", desc: "Lead magnet / list builder" },
  { label: "$27–$47", value: "37", desc: "Entry-level, impulse buy" },
  { label: "$97–$197", value: "147", desc: "Standard online course" },
  { label: "$297+", value: "297", desc: "Premium / flagship" },
];

const FORMATS = [
  { label: "Self-paced", value: "self-paced", desc: "Students go at their own speed" },
  { label: "Cohort-based", value: "cohort", desc: "Fixed start date, group learning" },
  { label: "Hybrid", value: "hybrid", desc: "Self-paced + live group calls" },
];

export default function CourseFoundationStep({ stepData, setStepData, onMarkEdited, plan, onStartGeneration, builderAct }: CourseStepProps) {
  const data = stepData.foundation || {};

  const update = (field: string, value: any) => {
    setStepData(prev => ({
      ...prev,
      foundation: { ...prev.foundation, [field]: value },
    }));
    onMarkEdited("foundation");
  };

  const canGenerate = builderAct === "idle" || !builderAct;

  return (
    <div className="space-y-6">
      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed">
          Online courses are the <strong>#1 revenue stream</strong> for non-fiction authors. Your book's framework is perfect for a structured learning experience. I recommend the <strong>$97–$197 price point</strong> for your first course.
        </p>
      </AbbyRecommendationCard>

      {/* Abby Generate CTA */}
      {canGenerate && onStartGeneration && (
        <Card className="p-5 border-secondary/30 bg-secondary/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Let Abby design your entire course</p>
              <p className="text-xs text-muted-foreground">
                Abby will analyze your manuscript and propose a complete curriculum, pricing strategy, and sales copy — all for your review before generating.
              </p>
            </div>
            <Button
              onClick={onStartGeneration}
              className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0"
            >
              <Sparkles className="h-4 w-4 mr-2" /> Analyze with Abby
            </Button>
          </div>
        </Card>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Course Title</Label>
        <Input
          value={data.title || ""}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. Master Value Investing: A Complete Guide"
          className="text-base font-medium"
        />
        {plan && !data.title && (
          <p className="text-[10px] text-secondary flex items-center gap-1">
            <Wand2 className="h-3 w-3" /> Abby will pre-populate from your business plan
          </p>
        )}
      </div>

      {/* Subtitle */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Course Subtitle / Tagline</Label>
        <Input
          value={data.subtitle || ""}
          onChange={(e) => update("subtitle", e.target.value)}
          placeholder="A catchy one-liner that sells the transformation"
        />
      </div>

      {/* Target Audience */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Target Audience</Label>
        <Textarea
          value={data.targetAudience || ""}
          onChange={(e) => update("targetAudience", e.target.value)}
          placeholder="Who is this course for? Be specific about their pain points and goals."
          rows={3}
        />
      </div>

      {/* Transformation Promise */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Transformation Promise</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">By the end of this course, the student will be able to...</span>
        </div>
        <Textarea
          value={data.transformation || ""}
          onChange={(e) => update("transformation", e.target.value)}
          placeholder="...confidently analyze stocks and build a diversified portfolio"
          rows={2}
        />
      </div>

      {/* Pricing */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Pricing Tier</Label>
        <div className="grid grid-cols-2 gap-2">
          {PRICE_TIERS.map((tier) => (
            <button
              key={tier.value}
              onClick={() => update("priceTier", tier.value)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                data.priceTier === tier.value
                  ? "border-secondary bg-secondary/5"
                  : "border-border hover:border-secondary/30"
              }`}
            >
              <p className="text-sm font-bold">{tier.label}</p>
              <p className="text-[10px] text-muted-foreground">{tier.desc}</p>
            </button>
          ))}
        </div>
        {data.priceTier && data.priceTier !== "0" && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Exact price:</Label>
            <div className="relative w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                value={data.exactPrice || ""}
                onChange={(e) => update("exactPrice", e.target.value)}
                className="pl-7"
                placeholder={data.priceTier}
              />
            </div>
          </div>
        )}
      </div>

      {/* Format */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Course Format</Label>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((fmt) => (
            <button
              key={fmt.value}
              onClick={() => update("format", fmt.value)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                data.format === fmt.value
                  ? "border-secondary bg-secondary/5"
                  : "border-border hover:border-secondary/30"
              }`}
            >
              <p className="text-sm font-bold">{fmt.label}</p>
              <p className="text-[10px] text-muted-foreground">{fmt.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
