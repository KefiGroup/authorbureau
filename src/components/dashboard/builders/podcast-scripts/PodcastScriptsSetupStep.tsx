import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mic, ArrowRight } from "lucide-react";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import type { PodcastScriptsConfig, EpisodeFormat, EpisodeLength, PublishSchedule } from "./types";
import { FORMAT_LABELS, LENGTH_LABELS, SCHEDULE_LABELS } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookTitle: string;
  plan: any;
}

const EPISODE_COUNTS = [10, 20, 30, 0]; // 0 = full season

export default function PodcastScriptsSetupStep({ stepData, setStepData, onMarkEdited, bookTitle, plan }: Props) {
  const config: PodcastScriptsConfig = stepData.podcastConfig || {
    podcastName: plan?.products?.podcast?.title || `${bookTitle} Podcast`,
    tagline: "",
    format: "solo" as EpisodeFormat,
    episodeLength: "20-30" as EpisodeLength,
    episodeCount: 10,
    publishSchedule: "weekly" as PublishSchedule,
  };

  const updateConfig = (partial: Partial<PodcastScriptsConfig>) => {
    const updated = { ...config, ...partial };
    setStepData(prev => ({ ...prev, podcastConfig: updated }));
    onMarkEdited("setup");
  };

  return (
    <div className="space-y-6">
      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed">
          Your book has multiple chapters — that's a perfect multi-episode season. I recommend <strong>20-30 minute solo episodes</strong> for non-fiction. Launch with 3 episodes, then weekly.
        </p>
      </AbbyRecommendationCard>

      {/* Podcast Name & Tagline */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Podcast Name</Label>
          <Input value={config.podcastName} onChange={e => updateConfig({ podcastName: e.target.value })} placeholder="My Book Podcast" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Tagline</Label>
          <Input value={config.tagline} onChange={e => updateConfig({ tagline: e.target.value })} placeholder="Insights from the book that changed..." />
        </div>
      </div>

      {/* Episode Format */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Episode Format</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.entries(FORMAT_LABELS) as [EpisodeFormat, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => updateConfig({ format: key })}
              className={`p-3 rounded-lg border text-sm font-medium text-center transition-all ${
                config.format === key
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Episode Length */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Episode Length</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.entries(LENGTH_LABELS) as [EpisodeLength, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => updateConfig({ episodeLength: key })}
              className={`p-3 rounded-lg border text-sm font-medium text-center transition-all ${
                config.episodeLength === key
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Episode Count */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Number of Episodes</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {EPISODE_COUNTS.map(count => (
            <button
              key={count}
              onClick={() => updateConfig({ episodeCount: count })}
              className={`p-3 rounded-lg border text-sm font-medium text-center transition-all ${
                config.episodeCount === count
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              {count === 0 ? "Full Season" : `${count} episodes`}
            </button>
          ))}
        </div>
      </div>

      {/* Publishing Schedule */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Publishing Schedule</Label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(SCHEDULE_LABELS) as [PublishSchedule, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => updateConfig({ publishSchedule: key })}
              className={`p-3 rounded-lg border text-sm font-medium text-center transition-all ${
                config.publishSchedule === key
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary card */}
      <Card className="p-4 bg-muted/30 border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
            <Mic className="h-5 w-5 text-secondary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{config.podcastName || "Untitled Podcast"}</p>
            <p className="text-xs text-muted-foreground">
              {config.episodeCount === 0 ? "Full season" : `${config.episodeCount} episodes`} • {LENGTH_LABELS[config.episodeLength]} each • {FORMAT_LABELS[config.format]} • {SCHEDULE_LABELS[config.publishSchedule]}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">Ready to generate</Badge>
        </div>
      </Card>
    </div>
  );
}
