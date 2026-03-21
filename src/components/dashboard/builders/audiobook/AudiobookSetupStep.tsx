import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Wand2, Mic, Bot, UserRound, Clock, TrendingUp } from "lucide-react";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";

import type { AudiobookStepProps, NarrationType } from "./types";

const NARRATION_STYLES: { value: NarrationType; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: "author", label: "Author-Narrated", desc: "Record it yourself for maximum authenticity", icon: <Mic className="h-5 w-5" /> },
  { value: "ai-voice", label: "AI Voice (ElevenLabs)", desc: "Professional TTS with natural-sounding voices", icon: <Bot className="h-5 w-5" /> },
  { value: "professional", label: "Professional Narrator", desc: "Hire a narrator from the marketplace", icon: <UserRound className="h-5 w-5" /> },
];

const DISTRIBUTION_OPTIONS = [
  { id: "platform", label: "Authors Bureau Platform", desc: "Sell on your author website" },
  { id: "acx", label: "Audible / ACX", desc: "Distribute to the world's largest audiobook marketplace" },
  { id: "google-play", label: "Google Play Books", desc: "Reach Android users and Google ecosystem" },
];

export default function AudiobookSetupStep({ stepData, setStepData, onMarkEdited, plan, bookTitle }: AudiobookStepProps) {
  const data = stepData.setup || {};

  const update = (field: string, value: any) => {
    setStepData(prev => ({ ...prev, setup: { ...prev.setup, [field]: value } }));
    onMarkEdited("setup");
  };

  const wordCount = data.wordCount || 50000;
  const estimatedHours = Math.round((wordCount / 9300) * 10) / 10;

  return (
    <div className="space-y-6">


      <AbbyRecommendationCard>
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-secondary" />
            <span className="text-sm font-semibold text-foreground">Abby's Market Analysis</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            Audiobooks are the fastest-growing book format — <strong>$4.5B market growing 25% year-over-year</strong>. With AI narration, you can have a professional-sounding audiobook ready in days, not months.
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            I recommend starting with <strong>AI Voice</strong> to test demand quickly. If sales justify it, you can always re-record with a professional narrator later. For non-fiction, <strong>author-narrated audiobooks convert 40% better</strong> because readers connect with the expert's own voice.
          </p>
        </div>
      </AbbyRecommendationCard>

      {/* Title */}
      <div>
        <Label className="text-sm font-medium">Audiobook Title</Label>
        <Input
          value={data.title ?? bookTitle}
          onChange={e => update("title", e.target.value)}
          placeholder="Same as book title"
          className="mt-1.5"
        />
        {!data.title && (
          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            <Wand2 className="h-2.5 w-2.5" /> Pre-filled from your book
          </p>
        )}
      </div>

      {/* Narration style */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Narration Style</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {NARRATION_STYLES.map(ns => (
            <Card
              key={ns.value}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                data.narration === ns.value ? "ring-2 ring-secondary border-secondary" : ""
              }`}
              onClick={() => update("narration", ns.value)}
            >
              <div className="flex items-center gap-2 mb-2 text-secondary">{ns.icon}</div>
              <p className="font-medium text-sm">{ns.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{ns.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Estimated length */}
      <Card className="p-4 bg-muted/30 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
          <Clock className="h-5 w-5 text-secondary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Estimated Length: ~{estimatedHours} hours</p>
          <p className="text-xs text-muted-foreground">Based on ~{wordCount.toLocaleString()} words ({Math.round(wordCount / 9300)} chapters estimated)</p>
        </div>
        <div className="shrink-0">
          <Label className="text-[10px]">Word count</Label>
          <Input
            type="number"
            value={wordCount}
            onChange={e => update("wordCount", parseInt(e.target.value) || 0)}
            className="h-8 w-28 text-xs mt-0.5"
          />
        </div>
      </Card>

      {/* Distribution */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Distribution</Label>
        <div className="space-y-2">
          {DISTRIBUTION_OPTIONS.map(opt => {
            const selected = (data.distribution || ["platform"]) as string[];
            const isChecked = selected.includes(opt.id);
            return (
              <Card
                key={opt.id}
                className={`p-3 cursor-pointer transition-all hover:shadow-md flex items-center gap-3 ${
                  isChecked ? "ring-1 ring-secondary/50 border-secondary/30" : ""
                }`}
                onClick={() => {
                  const next = isChecked ? selected.filter(s => s !== opt.id) : [...selected, opt.id];
                  update("distribution", next.length ? next : ["platform"]);
                }}
              >
                <Checkbox checked={isChecked} />
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Pricing */}
      <div className="max-w-xs">
        <Label className="text-sm font-medium">Price (USD)</Label>
        <Input
          type="number"
          value={data.price ?? "14.99"}
          onChange={e => update("price", e.target.value)}
          className="mt-1.5"
          min={0}
          step={0.01}
        />
        <p className="text-[10px] text-muted-foreground mt-1">Recommended: $9.99–$24.99 for audiobooks</p>
      </div>
    </div>
  );
}
