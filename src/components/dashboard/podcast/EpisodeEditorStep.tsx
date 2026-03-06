import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Clock, Mic, Quote, MessageSquare, ArrowRight } from "lucide-react";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import AbbyCoachingTip from "../social-media/AbbyCoachingTip";
import type { PodcastEpisode } from "./types";
import { FORMAT_LABELS, FORMAT_COLORS, type EpisodeFormat } from "./types";

interface Props {
  episodes: PodcastEpisode[];
  onEpisodesChange: (episodes: PodcastEpisode[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function EpisodeEditorStep({ episodes, onEpisodesChange, onNext, onBack }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);

  const updateEpisode = (id: string, partial: Partial<PodcastEpisode>) => {
    onEpisodesChange(episodes.map(ep => ep.id === id ? { ...ep, ...partial } : ep));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AbbyCoachingTip
        title="Abby's Episode Editing Guide"
        expandedByDefault
        tips={[
          "✏️ Click any episode to expand and review the full script. Edit titles, descriptions, and scripts inline.",
          "🎯 Focus on the first 30 seconds of each script — that's where 80% of listener drop-off happens. Make your hooks irresistible.",
          "💬 Pull quotes are pre-selected for audiogram clips. Swap any that don't sound punchy when spoken aloud.",
          "📋 Show notes are SEO-optimized for podcast directories. Add your actual URLs before publishing.",
          "🔄 You can reorder episodes by editing the episode number. The order should build a logical journey for listeners.",
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Episode Editor</h2>
          <p className="text-sm text-muted-foreground">{episodes.length} episodes • Click to expand & edit</p>
        </div>
      </div>

      <div className="space-y-2">
        {episodes.map(ep => {
          const isExpanded = expandedId === ep.id;
          const isEditing = editingScriptId === ep.id;

          return (
            <Card key={ep.id} className={`overflow-hidden transition-all ${isExpanded ? "ring-1 ring-primary/20" : ""}`}>
              <button onClick={() => setExpandedId(isExpanded ? null : ep.id)} className="w-full text-left">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {ep.episode_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{ep.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{ep.description?.slice(0, 80)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-[10px] ${FORMAT_COLORS[ep.format as EpisodeFormat]}`}>
                      {FORMAT_LABELS[ep.format as EpisodeFormat]}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {ep.duration_minutes}m
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <CardContent className="pt-0 pb-4 space-y-4 border-t border-border">
                  {/* Title & Description */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Episode Title</label>
                      <Input value={ep.title} onChange={e => updateEpisode(ep.id, { title: e.target.value })} className="text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Duration (min)</label>
                      <Input type="number" value={ep.duration_minutes} onChange={e => updateEpisode(ep.id, { duration_minutes: parseInt(e.target.value) || 20 })} className="text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Episode Description</label>
                    <Textarea value={ep.description} onChange={e => updateEpisode(ep.id, { description: e.target.value })} rows={2} className="text-sm" />
                  </div>

                  {/* Script */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Mic className="h-3 w-3" /> Episode Script
                      </label>
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); setEditingScriptId(isEditing ? null : ep.id); }}>
                        {isEditing ? "Preview" : "Edit"}
                      </Button>
                    </div>
                    {isEditing ? (
                      <Textarea value={ep.script_markdown} onChange={e => updateEpisode(ep.id, { script_markdown: e.target.value })} rows={15} className="text-xs font-mono" />
                    ) : (
                      <div className="rounded-lg border border-border bg-muted/30 p-4 max-h-96 overflow-y-auto prose prose-sm">
                        <MarkdownRenderer content={ep.script_markdown || "_No script generated._"} />
                      </div>
                    )}
                  </div>

                  {/* Pull Quotes */}
                  {ep.pull_quotes.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Quote className="h-3 w-3" /> Pull Quotes (for audiograms)
                      </label>
                      <div className="space-y-1.5">
                        {ep.pull_quotes.map((q, i) => (
                          <div key={i} className="rounded-md bg-secondary/5 border border-secondary/20 p-2 text-xs italic text-foreground">
                            "{q}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Guest Questions */}
                  {ep.guest_questions.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Interview Questions
                      </label>
                      <div className="space-y-1">
                        {ep.guest_questions.map((q, i) => (
                          <p key={i} className="text-xs text-muted-foreground">Q{i + 1}: {typeof q === 'string' ? q : JSON.stringify(q)}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show Notes */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Show Notes (for directories)</label>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 max-h-48 overflow-y-auto prose prose-sm">
                      <MarkdownRenderer content={ep.show_notes || "_No show notes._"} />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={onNext} className="bg-primary px-8">
          Monetization Kit <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
