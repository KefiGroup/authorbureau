import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Video } from "lucide-react";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import type { WebinarConfig } from "./types";
import { WEBINAR_TYPE_LABELS, FORMAT_LABELS } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookTitle: string;
  plan: Record<string, any> | null;
}

export default function WebinarSetupStep({ stepData, setStepData, onMarkEdited, bookTitle, plan }: Props) {
  const config: WebinarConfig = stepData["configure"]?.config || {
    title: plan?.webinar_title || `${bookTitle} — Live Masterclass`,
    type: "lead_magnet",
    duration: 60,
    format: "live",
    primaryCtaProduct: "",
    price: 0,
  };

  const updateConfig = (patch: Partial<WebinarConfig>) => {
    setStepData(prev => ({ ...prev, configure: { ...prev.configure, config: { ...config, ...patch } } }));
    onMarkEdited("configure");
  };

  return (
    <div className="space-y-6">
      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed">
          A <strong>60-minute lead-magnet webinar</strong> converts at 20-40% to your paid products. Use the "3 Secrets" framework — share value for 45 min, then pitch for 15 min.
        </p>
      </AbbyRecommendationCard>

      {/* Title */}
      <Card className="p-5">
        <Label className="text-sm font-semibold mb-2 block">Webinar Title</Label>
        <Input
          value={config.title}
          onChange={e => updateConfig({ title: e.target.value })}
          placeholder="e.g. 3 Secrets to [Outcome] from [Book Title]"
          className="text-sm"
        />
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Tip: Use a number + benefit format for higher registration rates
        </p>
      </Card>

      {/* Webinar Type */}
      <Card className="p-5">
        <Label className="text-sm font-semibold mb-3 block">Webinar Type</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(WEBINAR_TYPE_LABELS).map(([key, info]) => (
            <button
              key={key}
              onClick={() => updateConfig({
                type: key as WebinarConfig["type"],
                price: key === "paid_workshop" ? 47 : 0,
              })}
              className={`text-left rounded-lg border px-4 py-3 transition-all ${
                config.type === key
                  ? "border-secondary bg-secondary/5 ring-2 ring-secondary/20"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <p className="text-sm font-medium">{info.label}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{info.description}</p>
            </button>
          ))}
        </div>
        {config.type === "paid_workshop" && (
          <div className="mt-4">
            <Label className="text-xs mb-1.5 block">Workshop Price ($)</Label>
            <Input
              type="number"
              value={config.price}
              onChange={e => updateConfig({ price: Number(e.target.value) })}
              className="w-32 text-sm"
              min={0}
            />
          </div>
        )}
      </Card>

      {/* Duration */}
      <Card className="p-5">
        <Label className="text-sm font-semibold mb-3 block">Duration</Label>
        <div className="flex gap-3">
          {([45, 60, 90] as const).map(d => (
            <button
              key={d}
              onClick={() => updateConfig({ duration: d })}
              className={`flex-1 rounded-lg border py-3 text-center transition-all ${
                config.duration === d
                  ? "border-secondary bg-secondary/5 text-secondary font-semibold"
                  : "border-border text-muted-foreground"
              }`}
            >
              <p className="text-lg font-bold">{d}</p>
              <p className="text-[10px]">minutes</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Format */}
      <Card className="p-5">
        <Label className="text-sm font-semibold mb-3 block">Format</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(FORMAT_LABELS).map(([key, info]) => (
            <button
              key={key}
              onClick={() => updateConfig({ format: key as WebinarConfig["format"] })}
              className={`text-left rounded-lg border px-4 py-3 transition-all ${
                config.format === key
                  ? "border-secondary bg-secondary/5 ring-2 ring-secondary/20"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <p className="text-sm font-medium">{info.label}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{info.description}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Primary CTA */}
      <Card className="p-5">
        <Label className="text-sm font-semibold mb-2 block">Primary CTA — What does this webinar offer?</Label>
        <Input
          value={config.primaryCtaProduct}
          onChange={e => updateConfig({ primaryCtaProduct: e.target.value })}
          placeholder="e.g. Online Course, Coaching Package, Membership"
          className="text-sm"
        />
        <p className="text-[10px] text-muted-foreground mt-1.5">
          The product or service you'll pitch at the end of the webinar
        </p>
      </Card>

      {/* Summary */}
      <Card className="p-4 bg-muted/30 border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <Video className="h-3.5 w-3.5 text-secondary" />
          <span className="text-xs font-semibold">Summary</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {WEBINAR_TYPE_LABELS[config.type]?.label} •{" "}
          {config.duration} min •{" "}
          {FORMAT_LABELS[config.format]?.label} •{" "}
          {config.type === "paid_workshop" ? `$${config.price}` : "Free"}
          {config.primaryCtaProduct ? ` → ${config.primaryCtaProduct}` : ""}
        </p>
      </Card>
    </div>
  );
}
