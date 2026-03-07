import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, ChevronLeft, ChevronRight, Clock, FileText, BookOpen, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import type { EpisodeCard, EpisodeScript, ScriptSection, PodcastScriptsConfig } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  userId: string;
}

export default function ScriptGeneratorStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, userId }: Props) {
  const { toast } = useToast();
  const episodes: EpisodeCard[] = stepData.episodeRoadmap || [];
  const scripts: Record<string, EpisodeScript> = stepData.episodeScripts || {};
  const config: PodcastScriptsConfig = stepData.podcastConfig || {};
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [generating, setGenerating] = useState(false);

  const selectedEp = episodes[selectedIdx];
  const selectedScript = selectedEp ? scripts[selectedEp.id] : null;

  const generateScript = async (ep: EpisodeCard) => {
    setGenerating(true);
    try {
      const { data: manuscript } = await supabase
        .from("generated_assets")
        .select("content")
        .eq("book_id", bookId)
        .eq("asset_type", "source_material")
        .maybeSingle();

      const excerpt = manuscript?.content?.slice(0, 6000) || "";

      const resp = await supabase.functions.invoke("business-consultant", {
        body: {
          messages: [
            {
              role: "system",
              content: `You are a podcast script writer. Generate a full episode script for "${ep.title}" (Episode ${ep.episodeNumber}) of "${config.podcastName || bookTitle} Podcast". Format: ${config.format || "solo"}, Length: ${config.episodeLength || "20-30"} minutes. Key topic: ${ep.keyTopic}. Source chapters: ${ep.sourceChapters.join(", ")}. Return JSON: { sections: [{ id, label, timeMarker (e.g. "0:00"), durationSeconds, scriptText, speakerNotes, bookQuotes: string[], actionItem?, cta? }], showNotes: "markdown string", wordCount: number, estimatedMinutes: number }. Include sections: Cold Open/Hook, Intro, Main Content (2-3 blocks), Listener Action Item, CTA, Outro. Highlight key book quotes. Only return JSON.`,
            },
            { role: "user", content: `Manuscript excerpt:\n${excerpt}\n\nGenerate the episode script.` },
          ],
          bookId,
          isPremium: true,
        },
      });

      if (resp.error) throw resp.error;
      const text = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid response");
      const parsed: EpisodeScript = { ...JSON.parse(jsonMatch[0]), episodeId: ep.id };

      setStepData(prev => ({
        ...prev,
        episodeScripts: { ...(prev.episodeScripts || {}), [ep.id]: parsed },
      }));
      toast({ title: `Script for Ep ${ep.episodeNumber} generated!` });
    } catch (err) {
      console.error("Script generation error:", err);
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const updateSection = (sectionId: string, field: string, value: string) => {
    if (!selectedEp || !selectedScript) return;
    const updated = {
      ...selectedScript,
      sections: selectedScript.sections.map(s => s.id === sectionId ? { ...s, [field]: value } : s),
    };
    setStepData(prev => ({
      ...prev,
      episodeScripts: { ...(prev.episodeScripts || {}), [selectedEp.id]: updated },
    }));
    onMarkEdited("script");
  };

  if (episodes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Go back to Step 2 and generate your episode roadmap first.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Episode navigator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {episodes.map((ep, i) => (
          <button
            key={ep.id}
            onClick={() => setSelectedIdx(i)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              i === selectedIdx
                ? "bg-secondary text-secondary-foreground"
                : scripts[ep.id]
                ? "bg-accent/10 text-accent"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Ep {ep.episodeNumber}: {ep.title.slice(0, 20)}
            {ep.title.length > 20 && "…"}
          </button>
        ))}
      </div>

      {/* Script content */}
      {selectedEp && !selectedScript && (
        <Card className="p-8 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">Generate Script for Ep {selectedEp.episodeNumber}</h3>
          <p className="text-sm text-muted-foreground mb-1 font-medium">{selectedEp.title}</p>
          <p className="text-xs text-muted-foreground mb-6">{selectedEp.keyTopic}</p>
          <Button onClick={() => generateScript(selectedEp)} disabled={generating} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {generating ? "Writing script..." : "Generate Script"}
          </Button>
        </Card>
      )}

      {selectedEp && selectedScript && (
        <ResizablePanelGroup direction="horizontal" className="min-h-[500px] rounded-lg border">
          {/* Script panel */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="p-4 space-y-4 overflow-y-auto h-full">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-sm">Script</h3>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> ~{selectedScript.estimatedMinutes} min
                  <span>•</span>
                  <FileText className="h-3 w-3" /> {selectedScript.wordCount?.toLocaleString()} words
                </div>
              </div>

              {selectedScript.sections.map(section => (
                <Card key={section.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] font-mono">{section.timeMarker}</Badge>
                      <span className="text-sm font-semibold">{section.label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{Math.round(section.durationSeconds / 60)} min</span>
                  </div>
                  <Textarea
                    value={section.scriptText}
                    onChange={e => updateSection(section.id, "scriptText", e.target.value)}
                    className="text-sm min-h-[100px] border-muted"
                  />
                  {section.bookQuotes?.length > 0 && (
                    <div className="space-y-1">
                      {section.bookQuotes.map((q, i) => (
                        <div key={i} className="flex gap-2 p-2 bg-secondary/5 rounded text-xs italic">
                          <BookOpen className="h-3 w-3 text-secondary shrink-0 mt-0.5" />
                          <span>"{q}"</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {section.speakerNotes && (
                    <p className="text-[10px] text-muted-foreground italic">📝 {section.speakerNotes}</p>
                  )}
                  {section.cta && (
                    <Badge className="text-[9px] bg-accent/10 text-accent">CTA: {section.cta}</Badge>
                  )}
                </Card>
              ))}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Show Notes panel */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="p-4 overflow-y-auto h-full bg-muted/20">
              <h3 className="font-heading font-bold text-sm mb-3">Show Notes</h3>
              <Card className="p-4">
                <MarkdownRenderer content={selectedScript.showNotes || ""} />
              </Card>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {/* Episode navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          disabled={selectedIdx === 0}
          onClick={() => setSelectedIdx(selectedIdx - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous Episode
        </Button>
        <span className="text-xs text-muted-foreground">
          {Object.keys(scripts).length} / {episodes.length} scripts generated
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={selectedIdx >= episodes.length - 1}
          onClick={() => setSelectedIdx(selectedIdx + 1)}
        >
          Next Episode <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
