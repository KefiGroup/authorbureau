import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import AbbyRecommendationCard from "./AbbyRecommendationCard";
import AbbyExplainsTooltip from "./AbbyExplainsTooltip";
import StepInstructions, { type BuilderCategory } from "./StepInstructions";
import AbbyMarketAdvice from "@/components/dashboard/book-hub/AbbyMarketAdvice";
import type { MarketResearchData } from "@/hooks/useMarketResearch";

export interface SetupField {
  key: string;
  label: string;
  type: "text" | "textarea" | "pills" | "number" | "price";
  options?: { value: string; label: string; badge?: string; description?: string }[];
  placeholder?: string;
  cols?: number;
}

interface Props {
  configKey: string;
  fields: SetupField[];
  abbyTip: string;
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  stepId: string;
  plan?: any;
  bookTitle?: string;
  defaults?: Record<string, any>;
  marketData?: MarketResearchData | null;
  marketLoading?: boolean;
  category?: BuilderCategory;
}

const categorySelectedStyles: Record<BuilderCategory, string> = {
  build: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500/20",
  bridge: "border-violet-500 bg-violet-50 dark:bg-violet-950/30 ring-1 ring-violet-500/20",
  yield: "border-sky-500 bg-sky-50 dark:bg-sky-950/30 ring-1 ring-sky-500/20",
};

const categoryCheckStyles: Record<BuilderCategory, string> = {
  build: "bg-emerald-500",
  bridge: "bg-violet-500",
  yield: "bg-sky-500",
};

const categoryHoverStyles: Record<BuilderCategory, string> = {
  build: "hover:border-emerald-300 dark:hover:border-emerald-700",
  bridge: "hover:border-violet-300 dark:hover:border-violet-700",
  yield: "hover:border-sky-300 dark:hover:border-sky-700",
};

export default function SharedSetupStep({
  configKey, fields, abbyTip, stepData, setStepData, onMarkEdited, stepId, plan, bookTitle, defaults,
  marketData, marketLoading, category = "build",
}: Props) {
  const config: Record<string, any> = stepData[configKey] || defaults || {};

  const update = (key: string, value: any) => {
    onMarkEdited(stepId);
    setStepData(prev => ({ ...prev, [configKey]: { ...config, [key]: value } }));
  };

  const getMarketFieldType = (fieldKey: string, fieldType: string): "title" | "price" | "description" | null => {
    const lower = fieldKey.toLowerCase();
    if (lower.includes("title") || lower.includes("name")) return "title";
    if (fieldType === "price" || lower.includes("price")) return "price";
    if (fieldType === "textarea" || lower.includes("description") || lower.includes("summary")) return "description";
    return null;
  };

  const getAbbyExplainsReasoning = (fieldKey: string, fieldType: string): string | null => {
    const lower = fieldKey.toLowerCase();
    if (fieldType === "price" || lower.includes("price")) {
      return "Abby calibrated this price using competitive analysis, perceived value benchmarks, and your audience's willingness to pay — maximizing revenue while maintaining accessibility.";
    }
    if (fieldType === "number" && (lower.includes("duration") || lower.includes("day") || lower.includes("session") || lower.includes("week") || lower.includes("minute"))) {
      return "This duration is based on learning science research — long enough to create meaningful transformation, short enough to maintain engagement and completion rates.";
    }
    if (fieldType === "pills" && (lower.includes("format") || lower.includes("type") || lower.includes("tier") || lower.includes("frequency"))) {
      return "These options are curated based on market research and what performs best for your genre and audience. Each format has distinct advantages for engagement and revenue.";
    }
    return null;
  };

  const selectedStyle = categorySelectedStyles[category];
  const checkStyle = categoryCheckStyles[category];
  const hoverStyle = categoryHoverStyles[category];

  return (
    <div className="space-y-6">
      <StepInstructions
        category={category}
        items={[
          { label: "Text fields", description: "Type to set titles, descriptions, and other details." },
          { label: "Option cards", description: "Click to select a preset format, tier, or duration." },
          { label: "Price field", description: "Set your selling price in USD. Change anytime." },
          { label: "Abby's Tip", description: "Personalized advice from your business plan." },
        ]}
      />

      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed">{abbyTip}</p>
      </AbbyRecommendationCard>

      {fields.map(field => {
        const marketFieldType = getMarketFieldType(field.key, field.type);
        const showMarketAdvice = marketFieldType && (marketData || marketLoading);

        return (
          <div key={field.key} className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold tracking-tight">{field.label}</Label>
              {showMarketAdvice && (
                <AbbyMarketAdvice
                  fieldType={marketFieldType!}
                  marketData={marketData || null}
                  loading={marketLoading}
                  currentValue={config[field.key] || ""}
                  onOptimize={marketFieldType === "description" ? (text) => update(field.key, text) : undefined}
                />
              )}
            </div>

            {field.type === "text" && (
              <Input
                value={config[field.key] || ""}
                onChange={e => update(field.key, e.target.value)}
                placeholder={field.placeholder}
              />
            )}

            {field.type === "textarea" && (
              <Textarea
                value={config[field.key] || ""}
                onChange={e => update(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
              />
            )}

            {field.type === "number" && (
              <Input
                type="number"
                value={config[field.key] || ""}
                onChange={e => update(field.key, parseInt(e.target.value) || 0)}
                placeholder={field.placeholder}
                className="max-w-[200px]"
              />
            )}

            {field.type === "price" && (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={config[field.key] || ""}
                  onChange={e => update(field.key, parseInt(e.target.value) || 0)}
                  className="max-w-[200px]"
                />
              </div>
            )}

            {field.type === "pills" && field.options && (
              <div className={`grid gap-3`} style={{ gridTemplateColumns: field.cols ? `repeat(${field.cols}, minmax(0, 1fr))` : undefined }}>
                {field.options.map(opt => {
                  const isSelected = config[field.key] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => update(field.key, opt.value)}
                      className={`relative p-3.5 rounded-xl border-2 text-left transition-all duration-200 ${
                        isSelected
                          ? `${selectedStyle} shadow-sm`
                          : `border-border bg-card ${hoverStyle} hover:shadow-sm`
                      }`}
                    >
                      {isSelected && (
                        <span className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full ${checkStyle} flex items-center justify-center`}>
                          <Check className="h-3 w-3 text-white" />
                        </span>
                      )}
                      <p className="text-sm font-semibold pr-6">{opt.label}</p>
                      {opt.description && <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>}
                      {opt.badge && (
                        <Badge variant="secondary" className="mt-1.5 text-[10px] font-medium">{opt.badge}</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
