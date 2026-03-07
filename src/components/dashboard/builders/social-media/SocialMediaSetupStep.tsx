import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import type { SocialMediaConfig } from "./types";
import { PLATFORM_CONFIG, TONE_OPTIONS, SUGGESTED_PILLARS } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookTitle: string;
  plan: any;
}

export default function SocialMediaSetupStep({ stepData, setStepData, onMarkEdited, bookTitle, plan }: Props) {
  const config: SocialMediaConfig = stepData["setup"]?.config || {
    platforms: ["linkedin", "instagram"],
    frequency: { linkedin: "3x_week", instagram: "3x_week" },
    contentPillars: [],
    tone: "Mix",
    duration: 90,
  };

  const updateConfig = (patch: Partial<SocialMediaConfig>) => {
    const updated = { ...config, ...patch };
    setStepData(prev => ({ ...prev, setup: { ...prev.setup, config: updated } }));
    onMarkEdited("setup");
  };

  // Auto-suggest pillars from plan on first load
  useEffect(() => {
    if (config.contentPillars.length === 0) {
      updateConfig({ contentPillars: SUGGESTED_PILLARS.slice(0, 4) });
    }
  }, []);

  const togglePlatform = (p: string) => {
    const next = config.platforms.includes(p)
      ? config.platforms.filter(x => x !== p)
      : [...config.platforms, p];
    const freq = { ...config.frequency };
    if (!freq[p]) freq[p] = "3x_week";
    updateConfig({ platforms: next, frequency: freq });
  };

  const togglePillar = (p: string) => {
    const next = config.contentPillars.includes(p)
      ? config.contentPillars.filter(x => x !== p)
      : config.contentPillars.length < 5
      ? [...config.contentPillars, p]
      : config.contentPillars;
    updateConfig({ contentPillars: next });
  };

  return (
    <div className="space-y-6">
      {/* Platforms */}
      <Card className="p-5">
        <Label className="text-sm font-semibold mb-3 block">Platforms (select 2-3)</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => togglePlatform(key)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                config.platforms.includes(key)
                  ? "border-secondary bg-secondary/5 ring-2 ring-secondary/20"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className={`w-6 h-6 rounded-full ${cfg.color} flex items-center justify-center text-white text-[10px] font-bold`}>
                {cfg.label[0]}
              </div>
              {cfg.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Posting Frequency */}
      {config.platforms.length > 0 && (
        <Card className="p-5">
          <Label className="text-sm font-semibold mb-3 block">Posting Frequency</Label>
          <div className="space-y-3">
            {config.platforms.map(p => (
              <div key={p} className="flex items-center justify-between">
                <span className="text-sm font-medium">{PLATFORM_CONFIG[p]?.label}</span>
                <Select
                  value={config.frequency[p] || "3x_week"}
                  onValueChange={v => updateConfig({ frequency: { ...config.frequency, [p]: v } })}
                >
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="3x_week">3x / week</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Content Pillars */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-semibold">Content Pillars (3-5)</Label>
          <Badge variant="outline" className="text-[10px]">
            <Sparkles className="h-2.5 w-2.5 mr-1" /> AI Suggested
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Based on your book "{bookTitle}", these pillars will shape your content calendar.
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PILLARS.map(p => (
            <button
              key={p}
              onClick={() => togglePillar(p)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                config.contentPillars.includes(p)
                  ? "bg-secondary text-secondary-foreground border-secondary"
                  : "border-border text-muted-foreground hover:border-muted-foreground/50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </Card>

      {/* Tone & Duration */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <Label className="text-sm font-semibold mb-3 block">Tone</Label>
          <Select value={config.tone} onValueChange={v => updateConfig({ tone: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
        <Card className="p-5">
          <Label className="text-sm font-semibold mb-3 block">Duration</Label>
          <div className="flex gap-2">
            {[30, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => updateConfig({ duration: d })}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ${
                  config.duration === d
                    ? "border-secondary bg-secondary/5 text-secondary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Summary */}
      <Card className="p-4 bg-muted/30 border-border/50">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Summary:</strong>{" "}
          {config.platforms.length} platform{config.platforms.length !== 1 ? "s" : ""} •{" "}
          {config.contentPillars.length} content pillars •{" "}
          {config.tone} tone •{" "}
          {config.duration}-day calendar
        </p>
      </Card>
    </div>
  );
}
