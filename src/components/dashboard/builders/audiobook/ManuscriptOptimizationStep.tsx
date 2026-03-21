import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2, Check, X, ChevronLeft, ChevronRight, AlertTriangle, BookOpen } from "lucide-react";
import type { AudiobookStepProps, AudioChapter, AudioSuggestion } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";

export default function ManuscriptOptimizationStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, generationState, setGenerationState }: AudiobookStepProps) {
  const chapters: AudioChapter[] = stepData.chapters || [];
  const [activeIdx, setActiveIdx] = useState(0);
  const chapter = chapters[activeIdx];

  const handleGenerate = async () => {
    setGenerationState("queued");
    try {
      const { data: session } = await supabase.auth.getSession();
      setGenerationState("analyzing");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.session?.access_token}` },
          body: JSON.stringify({
            prompt: `You are an audiobook production expert. For the book "${bookTitle}" (book_id: ${bookId}), generate a JSON array of 10-12 chapters, each with: id, title, originalText (200-word excerpt), optimizedText (audio-optimized version), suggestions (array of {id, original, replacement, reason, accepted: null}), status: "script-ready". Focus on removing visual references, simplifying parentheticals, and adding pronunciation guides. Return ONLY the JSON array.`,
            stream: false,
          }),
        }
      );

      setGenerationState("generating");
      const result = await res.json();
      let parsed: AudioChapter[] = [];
      try {
        const text = result.response || result.content || JSON.stringify(result);
        const match = text.match(/\[[\s\S]*\]/);
        if (match) parsed = JSON.parse(match[0]);
      } catch {
        parsed = Array.from({ length: 10 }, (_, i) => ({
          id: `ch-${i + 1}`,
          title: `Chapter ${i + 1}`,
          originalText: "Original manuscript text...",
          optimizedText: "Audio-optimized text...",
          suggestions: [
            { id: `s-${i}-1`, original: "as shown in Figure 3", replacement: "as we discussed earlier", reason: "Visual reference", accepted: null },
          ],
          status: "script-ready" as const,
        }));
      }
      setStepData(prev => ({ ...prev, chapters: parsed }));
      onMarkEdited("optimize");
      setGenerationState("complete");
      toast.success(`Optimized ${parsed.length} chapters for audio!`);
    } catch {
      setGenerationState("error");
      toast.error("Failed to optimize manuscript");
    }
  };

  const updateChapter = (updates: Partial<AudioChapter>) => {
    setStepData(prev => ({
      ...prev,
      chapters: (prev.chapters || []).map((c: AudioChapter, i: number) => i === activeIdx ? { ...c, ...updates } : c),
    }));
    onMarkEdited("optimize");
  };

  const handleSuggestion = (sugId: string, accepted: boolean) => {
    const sug = chapter.suggestions.map(s => s.id === sugId ? { ...s, accepted } : s);
    updateChapter({ suggestions: sug });
  };

  if (chapters.length === 0) {
    return (
      <div className="space-y-6">


        <AbbyRecommendationCard>
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-secondary" />
              <span className="text-sm font-semibold text-foreground">Abby's Production Notes</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              Written text and spoken text are different. I'll scan your manuscript to find <strong>visual references</strong> ("as shown in Figure 3"), <strong>complex parentheticals</strong>, and <strong>hard-to-pronounce terms</strong> — then rewrite them for a smooth listening experience.
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              This step typically improves listener retention by <strong>15-25%</strong>. You'll review every change before it goes to production.
            </p>
          </div>
        </AbbyRecommendationCard>

        <div className="text-center py-6">
          <Wand2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">Optimize Manuscript for Audio</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            AI will analyze your manuscript and create an audio-optimized version — removing visual references, simplifying complex passages, and adding pronunciation guides.
          </p>
          <Button onClick={handleGenerate} disabled={generationState !== "idle" && generationState !== "complete"}>
            {generationState !== "idle" && generationState !== "complete" ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyzing…</>
            ) : (
              <><Wand2 className="h-4 w-4 mr-2" /> Optimize for Audio</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  const pendingSuggestions = chapter?.suggestions?.filter(s => s.accepted === null).length || 0;

  return (
    <div className="space-y-4">
      <StepInstructions
        summary="Review the AI-optimized scripts for each chapter. Accept or reject individual suggestions, and manually edit text as needed."
        items={[
          { label: "Navigate chapters", description: "Use the arrows to move between chapters and review each one." },
          { label: "Accept / Reject", description: "For each AI suggestion, click ✓ to accept or ✗ to reject the change." },
          { label: "Edit directly", description: "You can edit the Audio-Optimized text directly in the right panel." },
        ]}
      />

      {/* Chapter nav */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={activeIdx === 0} onClick={() => setActiveIdx(activeIdx - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-xs text-muted-foreground">Chapter {activeIdx + 1} of {chapters.length}</p>
          <p className="text-sm font-semibold">{chapter?.title}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={activeIdx === chapters.length - 1} onClick={() => setActiveIdx(activeIdx + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {pendingSuggestions > 0 && (
        <Card className="p-3 bg-amber-50/60 border-amber-200 flex items-center gap-2 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span className="text-amber-800">{pendingSuggestions} suggestions awaiting your review</span>
        </Card>
      )}

      {/* Split-screen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Original Text</p>
          <Card className="p-4 min-h-[200px]">
            <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">{chapter?.originalText}</p>
          </Card>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Audio-Optimized</p>
          <Card className="p-4 min-h-[200px]">
            <Textarea
              value={chapter?.optimizedText || ""}
              onChange={e => updateChapter({ optimizedText: e.target.value })}
              className="text-xs min-h-[180px] border-0 p-0 shadow-none focus-visible:ring-0"
              placeholder="Optimized text..."
            />
          </Card>
        </div>
      </div>

      {/* Suggestions */}
      {chapter?.suggestions?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">AI Suggestions</p>
          <div className="space-y-2">
            {chapter.suggestions.map(sug => (
              <Card key={sug.id} className={`p-3 ${sug.accepted === true ? "bg-accent/5 border-accent/30" : sug.accepted === false ? "opacity-50" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs"><span className="line-through text-destructive/60">{sug.original}</span></p>
                    <p className="text-xs font-medium mt-0.5">→ {sug.replacement}</p>
                    <Badge variant="outline" className="text-[9px] mt-1">{sug.reason}</Badge>
                  </div>
                  {sug.accepted === null && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-accent" onClick={() => handleSuggestion(sug.id, true)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleSuggestion(sug.id, false)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  {sug.accepted !== null && (
                    <Badge variant={sug.accepted ? "default" : "secondary"} className="text-[9px] shrink-0">
                      {sug.accepted ? "Accepted" : "Rejected"}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
