import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Wand2, GripVertical, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { CONTENT_TYPE_LABELS, type ContentType, type WorkbookSection } from "./types";
import type { WorkbookStepProps } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ALL_CONTENT_TYPES: ContentType[] = ["reflection", "exercise", "checklist", "action-plan", "template", "self-assessment", "goal-setting"];

export default function ChapterMappingStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, generationState, setGenerationState, userId }: WorkbookStepProps) {
  const sections: WorkbookSection[] = stepData.sections || [];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerationState("queued");
    try {
      const { data: session } = await supabase.auth.getSession();
      setGenerationState("analyzing");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `You are an expert workbook designer. Given a book titled "${bookTitle}" (book_id: ${bookId}), generate a workbook chapter mapping. Return a JSON array of sections, each with: id, chapterRef (which book chapter it maps to), title, position, contentTypes (array from: reflection, exercise, checklist, action-plan, template, self-assessment, goal-setting). Generate 12-15 sections mapping to the book chapters. Return ONLY the JSON array, no other text.`,
              },
            ],
            bookId,
          }),
        }
      );

      setGenerationState("generating");

      // The edge function returns SSE stream — collect all chunks
      let fullText = "";
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) fullText += delta;
            } catch {
              // skip malformed chunks
            }
          }
        }
      }

      let parsed: WorkbookSection[] = [];
      try {
        const match = fullText.match(/\[[\s\S]*\]/);
        if (match) parsed = JSON.parse(match[0]);
      } catch {
        // Generate default sections
        parsed = Array.from({ length: 12 }, (_, i) => ({
          id: `section-${i + 1}`,
          chapterRef: `Chapter ${i + 1}`,
          title: `Section ${i + 1}: Key Concepts & Exercises`,
          position: i,
          contentTypes: ["reflection", "exercise", "checklist"] as ContentType[],
          intro: "",
          elements: [],
          takeaway: "",
        }));
      }

      setStepData(prev => ({ ...prev, sections: parsed }));
      onMarkEdited("mapping");
      setGenerationState("complete");
      toast.success(`Mapped ${parsed.length} workbook sections!`);
    } catch {
      setGenerationState("error");
      toast.error("Failed to generate chapter mapping");
    }
  };

  const updateSection = (id: string, updates: Partial<WorkbookSection>) => {
    setStepData(prev => ({
      ...prev,
      sections: (prev.sections || []).map((s: WorkbookSection) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
    onMarkEdited("mapping");
  };

  const toggleContentType = (sectionId: string, type: ContentType) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    const types = section.contentTypes.includes(type)
      ? section.contentTypes.filter(t => t !== type)
      : [...section.contentTypes, type];
    updateSection(sectionId, { contentTypes: types });
  };

  const removeSection = (id: string) => {
    setStepData(prev => ({
      ...prev,
      sections: (prev.sections || []).filter((s: WorkbookSection) => s.id !== id),
    }));
    onMarkEdited("mapping");
  };

  const addSection = () => {
    const newSection: WorkbookSection = {
      id: `section-${Date.now()}`,
      chapterRef: "",
      title: "New Section",
      position: sections.length,
      contentTypes: ["exercise", "reflection"],
      intro: "",
      elements: [],
      takeaway: "",
    };
    setStepData(prev => ({ ...prev, sections: [...(prev.sections || []), newSection] }));
    onMarkEdited("mapping");
  };

  if (sections.length === 0) {
    return (
      <div className="text-center py-12">
        <Wand2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">Map Book Chapters to Workbook Sections</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          AI will analyze your manuscript and create a section-by-section mapping with recommended content types.
        </p>
        <Button onClick={handleGenerate} disabled={generationState === "queued" || generationState === "analyzing" || generationState === "generating"}>
          {generationState === "queued" || generationState === "analyzing" || generationState === "generating" ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
          ) : generationState === "error" ? (
            <><Wand2 className="h-4 w-4 mr-2" /> Retry Chapter Mapping</>
          ) : (
            <><Wand2 className="h-4 w-4 mr-2" /> Generate Chapter Mapping</>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sections.length} sections mapped</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Section
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerate}>
            <Wand2 className="h-3.5 w-3.5 mr-1" /> Regenerate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Book chapters */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Book Chapters</p>
          <div className="space-y-1.5">
            {sections.map(s => (
              <Card key={s.id} className="p-2.5 text-xs flex items-center gap-2 bg-muted/30">
                <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                <span className="font-medium truncate">{s.chapterRef || `Chapter ${s.position + 1}`}</span>
                <Badge variant="outline" className="text-[9px] ml-auto shrink-0">{s.contentTypes.length} types</Badge>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Workbook sections */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Workbook Sections</p>
          <div className="space-y-2">
            {sections.map(s => {
              const isExpanded = expandedId === s.id;
              return (
                <Card key={s.id} className="overflow-hidden">
                  <button
                    className="w-full p-3 flex items-center gap-2 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                    <span className="text-sm font-medium flex-1 truncate">{s.title}</span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                      <div>
                        <label className="text-[10px] font-medium block mb-1">Section Title</label>
                        <Input value={s.title} onChange={e => updateSection(s.id, { title: e.target.value })} className="h-8 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium block mb-1">Maps to Chapter</label>
                        <Input value={s.chapterRef} onChange={e => updateSection(s.id, { chapterRef: e.target.value })} className="h-8 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium block mb-1.5">Content Types</label>
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_CONTENT_TYPES.map(type => (
                            <Badge
                              key={type}
                              variant={s.contentTypes.includes(type) ? "default" : "outline"}
                              className="text-[9px] cursor-pointer"
                              onClick={() => toggleContentType(s.id, type)}
                            >
                              {CONTENT_TYPE_LABELS[type]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => removeSection(s.id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Remove Section
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
