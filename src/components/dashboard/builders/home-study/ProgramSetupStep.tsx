import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Wand2 } from "lucide-react";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import type { HomeStudyStepProps } from "./types";

const DURATIONS = [
  { label: "7 Days", value: 7, desc: "Quick challenge — great for lead magnets" },
  { label: "14 Days", value: 14, desc: "Short program — focused transformation" },
  { label: "21 Days", value: 21, desc: "Habit-builder — ideal for self-help" },
  { label: "30 Days", value: 30, desc: "Deep program — highest perceived value" },
];

const COMMITMENTS = [
  { label: "15 min/day", value: 15 },
  { label: "30 min/day", value: 30 },
  { label: "45 min/day", value: 45 },
  { label: "60 min/day", value: 60 },
];

const LEVELS = [
  { label: "Beginner", value: "beginner", desc: "No prior knowledge required" },
  { label: "Intermediate", value: "intermediate", desc: "Some familiarity expected" },
  { label: "Advanced", value: "advanced", desc: "Deep prior knowledge assumed" },
];

const FORMATS = [
  { label: "PDF + Audio", value: "pdf-audio", desc: "PDF guide with audio prompts for each day" },
  { label: "PDF Only", value: "pdf", desc: "Clean printable study guide" },
  { label: "Digital Interactive", value: "interactive", desc: "Online experience with progress tracking" },
];

export default function ProgramSetupStep({ stepData, setStepData, onMarkEdited, plan }: HomeStudyStepProps) {
  const data = stepData.setup || {};

  const update = (field: string, value: any) => {
    setStepData(prev => ({ ...prev, setup: { ...prev.setup, [field]: value } }));
    onMarkEdited("setup");
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Program Title</Label>
        <Input
          value={data.title || ""}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. 30-Day Value Investing Mastery Program"
          className="text-base font-medium"
        />
        {plan && !data.title && (
          <p className="text-[10px] text-secondary flex items-center gap-1">
            <Wand2 className="h-3 w-3" /> Abby will pre-populate from your business plan
          </p>
        )}
      </div>

      {/* Duration */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Program Duration</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => update("duration", d.value)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                data.duration === d.value
                  ? "border-secondary bg-secondary/5"
                  : "border-border hover:border-secondary/30"
              }`}
            >
              <p className="text-sm font-bold">{d.label}</p>
              <p className="text-[10px] text-muted-foreground">{d.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Daily commitment */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Daily Time Commitment</Label>
        <div className="grid grid-cols-4 gap-2">
          {COMMITMENTS.map((c) => (
            <button
              key={c.value}
              onClick={() => update("commitment", c.value)}
              className={`p-3 rounded-lg border-2 text-center transition-colors ${
                data.commitment === c.value
                  ? "border-secondary bg-secondary/5"
                  : "border-border hover:border-secondary/30"
              }`}
            >
              <p className="text-sm font-bold">{c.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Difficulty Level</Label>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => update("level", l.value)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                data.level === l.value
                  ? "border-secondary bg-secondary/5"
                  : "border-border hover:border-secondary/30"
              }`}
            >
              <p className="text-sm font-bold">{l.label}</p>
              <p className="text-[10px] text-muted-foreground">{l.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Format</Label>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              onClick={() => update("format", f.value)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                data.format === f.value
                  ? "border-secondary bg-secondary/5"
                  : "border-border hover:border-secondary/30"
              }`}
            >
              <p className="text-sm font-bold">{f.label}</p>
              <p className="text-[10px] text-muted-foreground">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Pricing</Label>
        <div className="flex items-center gap-3">
          <div className="relative w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              value={data.price || ""}
              onChange={(e) => update("price", e.target.value)}
              className="pl-7"
              placeholder="37"
            />
          </div>
          <span className="text-xs text-muted-foreground">Recommended: $27–$47 for self-paced programs</span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Program Description</Label>
        <Textarea
          value={data.description || ""}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Brief description of what students will achieve..."
          rows={3}
        />
      </div>
    </div>
  );
}
