import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2 } from "lucide-react";
import AbbyRecommendationCard from "./AbbyRecommendationCard";
import AbbyExplainsTooltip from "./AbbyExplainsTooltip";
import StepInstructions, { type BuilderCategory } from "./StepInstructions";
import AbbyMarketAdvice from "@/components/dashboard/book-hub/AbbyMarketAdvice";
import type { MarketResearchData } from "@/hooks/useMarketResearch";
import { generateJSONWithAI } from "@/lib/ai-generate";

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
  bookId?: string;
  builderId?: string;
  builderLabel?: string;
  defaults?: Record<string, any>;
  marketData?: MarketResearchData | null;
  marketLoading?: boolean;
  category?: BuilderCategory;
  /** Clear dependent keys in stepData when specific setup fields change */
  invalidateOnFieldChange?: Record<string, string[]>;
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
  configKey, fields, abbyTip, stepData, setStepData, onMarkEdited, stepId, plan, bookTitle, bookId, builderId, builderLabel, defaults,
  marketData, marketLoading, category = "build", invalidateOnFieldChange,
}: Props) {
  const config: Record<string, any> = stepData[configKey] || defaults || {};
  const [analyzing, setAnalyzing] = useState(false);
  const hasConfig = Object.keys(stepData[configKey] || {}).length > 0;

  // Track whether the author chose to customise manually after Abby filled in
  const [manualMode, setManualMode] = useState(false);
  // Track whether Abby has completed her analysis (reasoning present = yes)
  const reasoning = stepData[`${configKey}_reasoning`];
  const abbyHasAnalyzed = !!reasoning && hasConfig;

  // If author previously edited fields manually (edited badge exists), go straight to manual mode
  const showDecisionPrompt = abbyHasAnalyzed && !manualMode && !stepData[`${configKey}_accepted`];

  const update = (key: string, value: any) => {
    onMarkEdited(stepId);
    setStepData(prev => {
      const currentConfig: Record<string, any> = prev[configKey] || defaults || {};
      const next: Record<string, any> = {
        ...prev,
        [configKey]: { ...currentConfig, [key]: value },
      };

      const keysToInvalidate = invalidateOnFieldChange?.[key] || [];
      for (const dependentKey of keysToInvalidate) {
        next[dependentKey] = "";
      }

      return next;
    });
  };

  const analyzeWithAbby = async () => {
    if (!bookId) return;
    setAnalyzing(true);
    setManualMode(false);
    // Reset acceptance so the decision prompt shows again
    setStepData(prev => ({ ...prev, [`${configKey}_accepted`]: false }));
    try {
      const fieldDescriptions = fields.map(f => {
        let desc = `"${f.key}" (${f.label})`;
        if (f.options) desc += ` — options: ${f.options.map(o => o.value).join(", ")}`;
        if (f.type === "price" || f.type === "number") desc += ` — numeric value`;
        return desc;
      }).join("\n");

      const prompt = `You are Abby, an expert book-business strategist. Analyze the book "${bookTitle || "this book"}" and recommend the best configuration for this product.

Return a JSON object with these fields:
${fieldDescriptions}

Also include "_reasoning" as a string explaining your recommendations in 2-3 sentences.

Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;

      const result = await generateJSONWithAI<Record<string, any>>(prompt, {
        bookId,
        isPremium: true,
        builderMode: true,
        builderId: builderId || configKey,
        builderLabel: builderLabel || "Setup",
        builderStep: "Configure",
      });

      // Apply all suggested values
      const newConfig = { ...config };
      for (const field of fields) {
        if (result[field.key] !== undefined) {
          newConfig[field.key] = result[field.key];
        }
      }
      onMarkEdited(stepId);
      setStepData(prev => ({ ...prev, [configKey]: newConfig, [`${configKey}_reasoning`]: result._reasoning || "", [`${configKey}_accepted`]: false }));
    } catch (err) {
      console.error("Abby analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const acceptAbby = () => {
    setStepData(prev => ({ ...prev, [`${configKey}_accepted`]: true }));
    onMarkEdited(stepId);
  };

  const chooseDIY = () => {
    setManualMode(true);
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

  /** Render a read-only summary of Abby's chosen config */
  const renderConfigSummary = () => (
    <Card className="border-secondary/30 bg-gradient-to-br from-secondary/5 to-transparent p-5 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-secondary" />
        <p className="text-xs font-bold text-secondary uppercase tracking-wider">Abby's Configuration</p>
      </div>
      {fields.map(field => {
        const val = config[field.key];
        if (!val) return null;
        const displayVal = field.type === "pills"
          ? field.options?.find(o => o.value === val)?.label || val
          : field.type === "price" ? `$${val}` : val;
        return (
          <div key={field.key} className="flex items-start gap-3">
            <span className="text-xs font-semibold text-muted-foreground w-28 shrink-0 pt-0.5">{field.label}</span>
            <span className="text-sm text-foreground">{displayVal}</span>
          </div>
        );
      })}
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Abby recommendation card — always visible */}
      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed mb-3">{abbyTip}</p>
        {bookId && !abbyHasAnalyzed && (
          <Button
            onClick={analyzeWithAbby}
            disabled={analyzing}
            size="sm"
            className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold"
          >
            {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {analyzing ? "Analyzing your book..." : "Let Abby Configure This"}
          </Button>
        )}
        {reasoning && (
          <p className="text-xs text-muted-foreground mt-2 italic border-t border-secondary/20 pt-2">{reasoning}</p>
        )}
      </AbbyRecommendationCard>

      {/* Decision prompt: Abby analyzed → choose path */}
      {showDecisionPrompt && (
        <>
          {renderConfigSummary()}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Path 1: Accept Abby */}
            <button
              type="button"
              onClick={acceptAbby}
              className="group relative rounded-xl border-2 border-secondary/40 bg-secondary/5 p-5 text-left transition-all hover:border-secondary hover:bg-secondary/10 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Sparkles className="h-4.5 w-4.5 text-secondary" />
                </div>
                <p className="text-sm font-bold text-foreground">Yes, use Abby's plan</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Accept Abby's recommendations and proceed to the next step. You can always come back and adjust later.
              </p>
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-secondary/30 group-hover:border-secondary transition-colors" />
            </button>

            {/* Path 2: DIY */}
            <button
              type="button"
              onClick={chooseDIY}
              className="group relative rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-foreground/30 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Check className="h-4.5 w-4.5 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold text-foreground">I'll customise myself</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Review Abby's suggestions and tweak the fields manually. Take full control of every setting.
              </p>
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-border group-hover:border-foreground/30 transition-colors" />
            </button>
          </div>

          {/* Re-analyze button */}
          {bookId && (
            <div className="flex justify-center">
              <Button
                onClick={analyzeWithAbby}
                disabled={analyzing}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-secondary"
              >
                {analyzing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                Re-analyze with Abby
              </Button>
            </div>
          )}
        </>
      )}

      {/* Fields — shown when: no Abby analysis yet, OR manual mode, OR accepted (for review) */}
      {/* Accepted state — show read-only summary */}
      {stepData[`${configKey}_accepted`] && !manualMode && (
        <>
          {renderConfigSummary()}
          <Card className="border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Abby's configuration accepted</p>
                <p className="text-xs text-muted-foreground">Click Save & Continue below to proceed, or edit fields if you'd like to adjust.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={chooseDIY}>Edit fields</Button>
              {bookId && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={analyzeWithAbby} disabled={analyzing}>
                  {analyzing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  Re-analyze
                </Button>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Editable fields — only when no Abby analysis or manual mode */}
      {(!abbyHasAnalyzed || manualMode) && (
        <>
          {/* If accepted, show a compact confirmation + re-analyze */}
          {stepData[`${configKey}_accepted`] && !manualMode && (
            <Card className="border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Abby's configuration accepted</p>
                  <p className="text-xs text-muted-foreground">Click Save & Continue below, or tweak individual fields.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs" onClick={chooseDIY}>Edit fields</Button>
                {bookId && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={analyzeWithAbby} disabled={analyzing}>
                    {analyzing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    Re-analyze
                  </Button>
                )}
              </div>
            </Card>
          )}

          <StepInstructions
            category={category}
            items={[
              { label: "Abby's Analysis", description: "Click the button above to let Abby analyze your book and pre-fill settings." },
              { label: "Text fields", description: "Type to set titles, descriptions, and other details." },
              { label: "Option cards", description: "Click to select a preset format, tier, or duration." },
              { label: "Price field", description: "Set your selling price in USD. Change anytime." },
            ]}
          />

          {fields.map(field => {
            const marketFieldType = getMarketFieldType(field.key, field.type);
            const showMarketAdvice = marketFieldType && (marketData || marketLoading);

            return (
              <div key={field.key} className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold tracking-tight">{field.label}</Label>
                  {(() => {
                    const reasoning = getAbbyExplainsReasoning(field.key, field.type);
                    return reasoning ? <AbbyExplainsTooltip reasoning={reasoning} /> : null;
                  })()}
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
        </>
      )}
    </div>
  );
}
