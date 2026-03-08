import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import AbbyRecommendationCard from "./AbbyRecommendationCard";

export interface SetupField {
  key: string;
  label: string;
  type: "text" | "textarea" | "pills" | "number" | "price";
  options?: { value: string; label: string; badge?: string; description?: string }[];
  placeholder?: string;
  cols?: number; // grid columns for pills
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
}

export default function SharedSetupStep({
  configKey, fields, abbyTip, stepData, setStepData, onMarkEdited, stepId, plan, bookTitle, defaults,
}: Props) {
  const config: Record<string, any> = stepData[configKey] || defaults || {};

  const update = (key: string, value: any) => {
    onMarkEdited(stepId);
    setStepData(prev => ({ ...prev, [configKey]: { ...config, [key]: value } }));
  };

  return (
    <div className="space-y-6">
      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed">{abbyTip}</p>
      </AbbyRecommendationCard>

      {/* Fields */}
      {fields.map(field => (
        <div key={field.key} className="space-y-2">
          <Label className="text-xs font-semibold">{field.label}</Label>

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
            <div className={`grid gap-2 ${field.cols ? `grid-cols-${field.cols}` : ""}`} style={{ gridTemplateColumns: field.cols ? `repeat(${field.cols}, minmax(0, 1fr))` : undefined }}>
              {field.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update(field.key, opt.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    config[field.key] === opt.value
                      ? "border-secondary bg-secondary/5 shadow-sm"
                      : "border-border hover:border-secondary/40"
                  }`}
                >
                  <p className="text-sm font-semibold">{opt.label}</p>
                  {opt.description && <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>}
                  {opt.badge && <Badge variant="outline" className="mt-1.5 text-[10px]">{opt.badge}</Badge>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
