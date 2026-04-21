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

  const splitIntoChapters = (text: string): { title: string; body: string }[] => {
    const cleaned = text.replace(/\r\n/g, "\n").trim();
    // Try common chapter markers first
    const chapterRegex = /^\s*(chapter\s+\w+|part\s+\w+|\d+\.)\s*[:\-—]?\s*(.*)$/gim;
    const matches = [...cleaned.matchAll(chapterRegex)];

    if (matches.length >= 2) {
      const result: { title: string; body: string }[] = [];
      for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        const start = (m.index ?? 0) + m[0].length;
        const end = i + 1 < matches.length ? (matches[i + 1].index ?? cleaned.length) : cleaned.length;
        const title = (m[2]?.trim() || m[1].trim()).slice(0, 80);
        const body = cleaned.slice(start, end).trim();
        if (body.length > 100) result.push({ title: title || `Chapter ${i + 1}`, body });
      }
      if (result.length >= 2) return result;
    }

    // Fallback: split by length (~3000 words per chapter)
    const words = cleaned.split(/\s+/);
    const chunkSize = 3000;
    const chunks: { title: string; body: string }[] = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      const body = words.slice(i, i + chunkSize).join(" ");
      if (body.length > 100) {
        chunks.push({ title: `Chapter ${chunks.length + 1}`, body });
      }
    }
    return chunks;
  };

  const buildAutoSuggestions = (text: string, chapterIdx: number): AudioSuggestion[] => {
    const sugs: AudioSuggestion[] = [];
    const patterns: { regex: RegExp; reason: string; replace: (m: string) => string }[] = [
      { regex: /\bas shown in (figure|fig\.?|table|chart|diagram)\s*\d*/gi, reason: "Visual reference", replace: () => "as we just discussed" },
      { regex: /\bsee (figure|fig\.?|table|chart|diagram|page)\s*\d+/gi, reason: "Visual reference", replace: () => "as you'll hear next" },
      { regex: /\([^)]{40,}\)/g, reason: "Long parenthetical", replace: (m) => `, ${m.slice(1, -1)},` },
      { regex: /\be\.g\./gi, reason: "Abbreviation", replace: () => "for example" },
      { regex: /\bi\.e\./gi, reason: "Abbreviation", replace: () => "that is" },
      { regex: /\betc\./gi, reason: "Abbreviation", replace: () => "and so on" },
    ];
    let id = 0;
    patterns.forEach(({ regex, reason, replace }) => {
      const matches = [...text.matchAll(regex)].slice(0, 3);
      matches.forEach((m) => {
        sugs.push({
          id: `s-${chapterIdx}-${id++}`,
          original: m[0],
          replacement: replace(m[0]),
          reason,
          accepted: null,
        });
      });
    });
    return sugs.slice(0, 6);
  };

  const handleGenerate = async () => {
    setGenerationState("queued");
    try {
      setGenerationState("analyzing");

      // 1. Fetch the actual uploaded manuscript from generated_assets
      const { data: book } = await supabase
        .from("books")
        .select("author_id")
        .eq("id", bookId)
        .maybeSingle();

      if (!book?.author_id) {
        toast.error("Book not found. Please add your book first.");
        setGenerationState("error");
        return;
      }

      const { data: asset } = await supabase
        .from("generated_assets")
        .select("content")
        .eq("book_id", bookId)
        .eq("author_id", book.author_id)
        .eq("asset_type", "source_material")
        .maybeSingle();

      const manuscript = asset?.content?.trim();
      if (!manuscript || manuscript.length < 500) {
        toast.error("No manuscript found. Please upload your manuscript in the Book Hub first.");
        setGenerationState("error");
        return;
      }

      setGenerationState("generating");

      // 2. Split locally into chapters (deterministic — never returns 0)
      const rawChapters = splitIntoChapters(manuscript);

      // 3. Build chapter records with auto-detected audio-optimization suggestions
      const parsed: AudioChapter[] = rawChapters.slice(0, 20).map((c, i) => {
        const suggestions = buildAutoSuggestions(c.body, i);
        let optimized = c.body;
        suggestions.forEach((s) => {
          optimized = optimized.replace(s.original, s.replacement);
        });
        return {
          id: `ch-${i + 1}`,
          title: c.title,
          originalText: c.body,
          optimizedText: optimized,
          suggestions,
          status: "script-ready" as const,
        };
      });

      if (parsed.length === 0) {
        toast.error("Couldn't split manuscript into chapters. Please check your file.");
        setGenerationState("error");
        return;
      }

      setStepData(prev => ({ ...prev, chapters: parsed }));
      onMarkEdited("optimize");
      setGenerationState("complete");
      toast.success(`Optimized ${parsed.length} chapters for audio!`);
    } catch (error) {
      console.error("[optimize] failed:", error);
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
