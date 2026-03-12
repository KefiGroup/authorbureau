import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Wand2, GripVertical, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import StepInstructions from "../shared/StepInstructions";
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_DESCRIPTIONS, type ContentType, type WorkbookSection } from "./types";
import type { WorkbookStepProps } from "./types";
import { toast } from "sonner";
import { generateWithAI } from "@/lib/ai-generate";

const ALL_CONTENT_TYPES: ContentType[] = ["reflection", "exercise", "checklist", "action-plan", "template", "self-assessment", "goal-setting"];

export default function ChapterMappingStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, generationState, setGenerationState, userId }: WorkbookStepProps) {
  const sections: WorkbookSection[] = stepData.sections || [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hadGenerationError, setHadGenerationError] = useState(false);

  const handleGenerate = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setHadGenerationError(false);
    setGenerationState("queued");

    try {
      setGenerationState("analyzing");
      const prompt = `You are an expert workbook designer. Given a book titled "${bookTitle}" (book_id: ${bookId}), generate a workbook chapter mapping. Return a JSON array of sections, each with: id, chapterRef (which book chapter it maps to), title, position, contentTypes (array from: reflection, exercise, checklist, action-plan, template, self-assessment, goal-setting). Generate 12-15 sections mapping to the book chapters. Return ONLY the JSON array, no other text.`;

      setGenerationState("generating");
      const rawText = await generateWithAI(prompt, { bookId, isPremium: true });

      let parsed: WorkbookSection[] = [];
      try {
        const cleaned = rawText
          .replace(/^```(?:json)?\s*\n?/i, "")
          .replace(/\n?```\s*$/i, "")
          .trim();
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) parsed = JSON.parse(match[0]);
      } catch {
        parsed = [];
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
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

      const normalized: WorkbookSection[] = parsed.map((section, idx) => ({
        id: section.id || `section-${idx + 1}`,
        chapterRef: section.chapterRef || `Chapter ${idx + 1}`,
        title: section.title || `Section ${idx + 1}`,
        position: typeof section.position === "number" ? section.position : idx,
        contentTypes: Array.isArray(section.contentTypes) && section.contentTypes.length > 0
          ? section.contentTypes.filter((type): type is ContentType => ALL_CONTENT_TYPES.includes(type as ContentType))
          : (["reflection", "exercise", "checklist"] as ContentType[]),
        intro: section.intro || "",
        elements: Array.isArray(section.elements) ? section.elements : [],
        takeaway: section.takeaway || "",
      }));

      setStepData(prev => ({ ...prev, sections: normalized }));
      onMarkEdited("mapping");
      setGenerationState("complete");
      toast.success(`Mapped ${normalized.length} workbook sections!`);
    } catch (err: any) {
      setHadGenerationError(true);
      setGenerationState("error");
      toast.error(err?.message || "Failed to generate chapter mapping");
    } finally {
      setIsGenerating(false);
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
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
          ) : hadGenerationError || generationState === "error" ? (
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
      <StepInstructions
        summary="Each book chapter is mapped to a workbook section. Sections define which content types (reflections, exercises, checklists, etc.) will be generated for that chapter in the next step."
        items={[
          { label: "Add Section", description: "manually create a new workbook section for content not tied to a specific chapter." },
          { label: "Regenerate", description: "re-run AI to create a fresh mapping, replacing all current sections." },
          { label: "Expand a section", description: "click any workbook section to edit its title, chapter reference, and toggle content types on/off." },
          { label: "Content type badges", description: "click to include or exclude that type from the section's generated content. Hover to see what each type means." },
          { label: "Remove Section", description: "permanently delete a section you don't need." },
        ]}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sections.length} sections mapped</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Section
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
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
                        <label className="text-[10px] font-medium block mb-1.5">Content Types <span className="font-normal text-muted-foreground">(click to toggle)</span></label>
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_CONTENT_TYPES.map(type => (
                            <Badge
                              key={type}
                              variant={s.contentTypes.includes(type) ? "default" : "outline"}
                              className="text-[9px] cursor-pointer"
                              onClick={() => toggleContentType(s.id, type)}
                              title={CONTENT_TYPE_DESCRIPTIONS[type]}
                            >
                              {CONTENT_TYPE_LABELS[type]}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5 italic">Hover over a badge to see what it means</p>
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
