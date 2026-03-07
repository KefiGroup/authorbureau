import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Plus, Trash2, GripVertical, Mic, Star, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { EpisodeCard, PodcastScriptsConfig } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  userId: string;
}

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  regular: { label: "Episode", className: "bg-emerald-500/10 text-emerald-700" },
  trailer: { label: "🎬 Trailer", className: "bg-amber-500/10 text-amber-700" },
  recap: { label: "📋 Recap", className: "bg-blue-500/10 text-blue-700" },
  finale: { label: "🎯 Finale", className: "bg-rose-500/10 text-rose-700" },
};

export default function EpisodeRoadmapStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, userId }: Props) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const episodes: EpisodeCard[] = stepData.episodeRoadmap || [];
  const config: PodcastScriptsConfig = stepData.podcastConfig || {};

  const generateRoadmap = async () => {
    setGenerating(true);
    try {
      // Load manuscript
      const { data: manuscript } = await supabase
        .from("generated_assets")
        .select("content")
        .eq("book_id", bookId)
        .eq("asset_type", "source_material")
        .maybeSingle();

      const manuscriptSnippet = manuscript?.content?.slice(0, 8000) || "";
      const epCount = config.episodeCount === 0 ? 12 : config.episodeCount;

      const token = (await supabase.auth.getSession()).data?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await supabase.functions.invoke("business-consultant", {
        body: {
          messages: [
            {
              role: "system",
              content: `You are a podcast production expert. Generate a ${epCount}-episode podcast roadmap for the book "${bookTitle}". Format: ${config.format || "solo"}. Include special episodes (trailer, mid-season recap, finale with CTA). Return JSON array with objects: { id, episodeNumber, title, sourceChapters (string[]), keyTopic, guestSuggestion (if interview format, else omit), type ("regular"|"trailer"|"recap"|"finale") }. Only return the JSON array, no markdown.`,
            },
            {
              role: "user",
              content: `Book manuscript excerpt:\n${manuscriptSnippet}\n\nGenerate the episode roadmap.`,
            },
          ],
          bookId,
          isPremium: true,
        },
      });

      if (resp.error) throw resp.error;
      const text = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Invalid response");

      const parsed: EpisodeCard[] = JSON.parse(jsonMatch[0]).map((ep: any, i: number) => ({
        ...ep,
        id: ep.id || crypto.randomUUID(),
        episodeNumber: ep.episodeNumber || i + 1,
      }));

      setStepData(prev => ({ ...prev, episodeRoadmap: parsed }));
      toast({ title: `${parsed.length} episodes generated!` });
    } catch (err) {
      console.error("Roadmap generation error:", err);
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const updateEpisode = (id: string, updates: Partial<EpisodeCard>) => {
    const updated = episodes.map(ep => ep.id === id ? { ...ep, ...updates } : ep);
    setStepData(prev => ({ ...prev, episodeRoadmap: updated }));
    onMarkEdited("roadmap");
  };

  const removeEpisode = (id: string) => {
    const updated = episodes.filter(ep => ep.id !== id).map((ep, i) => ({ ...ep, episodeNumber: i + 1 }));
    setStepData(prev => ({ ...prev, episodeRoadmap: updated }));
    onMarkEdited("roadmap");
  };

  const addEpisode = () => {
    const newEp: EpisodeCard = {
      id: crypto.randomUUID(),
      episodeNumber: episodes.length + 1,
      title: "New Episode",
      sourceChapters: [],
      keyTopic: "",
      type: "regular",
    };
    setStepData(prev => ({ ...prev, episodeRoadmap: [...episodes, newEp] }));
    onMarkEdited("roadmap");
  };

  if (episodes.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="p-4 border-secondary/20 bg-secondary/5">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-secondary" />
            </div>
            <p className="text-sm text-muted-foreground">
              I'll analyze your manuscript and create an episode-by-episode roadmap with special episodes for launch, recap, and finale.
            </p>
          </div>
        </Card>
        <div className="text-center py-12">
          <Mic className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">Generate Episode Roadmap</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            AI will map your book chapters to podcast episodes with titles, topics, and special episodes.
          </p>
          <Button onClick={generateRoadmap} disabled={generating} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {generating ? "Generating roadmap..." : "Generate Episode Roadmap"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{episodes.length} episodes planned</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addEpisode}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Episode
          </Button>
          <Button variant="outline" size="sm" onClick={generateRoadmap} disabled={generating}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Regenerate
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {episodes.map(ep => {
          const badge = TYPE_BADGES[ep.type] || TYPE_BADGES.regular;
          return (
            <Card key={ep.id} className="p-4 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-secondary/10 text-secondary text-xs font-bold flex items-center justify-center">
                    {ep.episodeNumber}
                  </span>
                  <Badge className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>
                </div>
                <button onClick={() => removeEpisode(ep.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <Input
                value={ep.title}
                onChange={e => updateEpisode(ep.id, { title: e.target.value })}
                className="text-sm font-semibold border-0 px-0 h-auto focus-visible:ring-0 mb-1"
              />
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{ep.keyTopic}</p>
              {ep.sourceChapters.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {ep.sourceChapters.map((ch, i) => (
                    <Badge key={i} variant="outline" className="text-[9px]">{ch}</Badge>
                  ))}
                </div>
              )}
              {ep.guestSuggestion && (
                <p className="text-[10px] text-secondary mt-2 flex items-center gap-1">
                  <Star className="h-3 w-3" /> Guest: {ep.guestSuggestion}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
