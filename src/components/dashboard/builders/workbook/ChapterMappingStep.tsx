import { useMemo, useState } from "react";
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
const DEFAULT_CONTENT_TYPES: ContentType[] = ["reflection", "exercise", "checklist"];

function getArrayPayload(raw: string): WorkbookSection[] {
  const cleaned = raw
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) return [];

  const jsonCandidate = match[0];
  const attempts = [
    jsonCandidate,
    jsonCandidate.replace(/,\s*([}\]])/g, "$1"),
    jsonCandidate.replace(/}\s*{/g, "},{"),
    jsonCandidate.replace(/,\s*([}\]])/g, "$1").replace(/}\s*{/g, "},{"),
  ];

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      // continue
    }
  }

  return [];
}

export default function ChapterMappingStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, generationState, setGenerationState }: WorkbookStepProps) {
  const sections: WorkbookSection[] = stepData.sections || [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hadGenerationError, setHadGenerationError] = useState(false);

  const globalContentTypes: ContentType[] = useMemo(() => {
    const fromState = stepData.globalContentTypes as ContentType[] | undefined;
    return Array.isArray(fromState) && fromState.length > 0 ? fromState : DEFAULT_CONTENT_TYPES;
  }, [stepData.globalContentTypes]);

  const syncGlobalContentTypes = (nextTypes: ContentType[]) => {
    setStepData(prev => ({
      ...prev,
      globalContentTypes: nextTypes,
      sections: (prev.sections || []).map((s: WorkbookSection) => ({ ...s, contentTypes: nextTypes })),
    }));
    onMarkEdited("mapping");
  };

  const toggleGlobalContentType = (type: ContentType) => {
    const hasType = globalContentTypes.includes(type);
    const next = hasType ? globalContentTypes.filter(t => t !== type) : [...globalContentTypes, type];
    if (next.length === 0) {
      toast.error("Select at least one content type.");
      return;
    }
    syncGlobalContentTypes(next);
  };

  const handleGenerate = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setHadGenerationError(false);
    setGenerationState("queued");

    try {
      setGenerationState("analyzing");
      const prompt = `You are an expert workbook designer. Given a book titled "${bookTitle}" (book_id: ${bookId}), generate a whole-book workbook structure. Return a JSON array only (no markdown) with 10-14 sections. Each section must have: id, title, position. Do NOT include chapter mapping fields.`;

      setGenerationState("generating");
      const rawText = await generateWithAI(prompt, {
        bookId,
        isPremium: true,
        builderMode: true,
        builderId: "workbook",
        builderLabel: "Workbook Builder",
        builderStep: "Workbook Structure",
      });

      let parsed = getArrayPayload(rawText);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        parsed = Array.from({ length: 12 }, (_, i) => ({
          id: `section-${i + 1}`,
          title: `Section ${i + 1}: Core Concepts & Practice`,
          position: i,
        })) as WorkbookSection[];
      }

      const normalized: WorkbookSection[] = parsed.map((section: any, idx) => ({
        id: section.id || `section-${idx + 1}`,
        title: section.title || `Section ${idx + 1}`,
        position: typeof section.position === "number" ? section.position : idx,
        contentTypes: globalContentTypes,
        intro: section.intro || "",
        elements: Array.isArray(section.elements) ? section.elements : [],
        takeaway: section.takeaway || "",
      }));

      setStepData(prev => ({
        ...prev,
        globalContentTypes,
        sections: normalized,
      }));
      onMarkEdited("mapping");
      setGenerationState("complete");
      toast.success(`Built a ${normalized.length}-section workbook structure!`);
    } catch (err: any) {
      setHadGenerationError(true);
      setGenerationState("error");
      toast.error(err?.message || "Failed to generate workbook structure");
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
      title: "New Section",
      position: sections.length,
      contentTypes: globalContentTypes,
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
        <h3 className="font-heading text-lg font-semibold mb-2">Build Your Workbook Structure</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          AI will create a full-book section structure; you choose content types once for the whole workbook.
        </p>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
          ) : hadGenerationError || generationState === "error" ? (
            <><Wand2 className="h-4 w-4 mr-2" /> Retry Structure Generation</>
          ) : (
            <><Wand2 className="h-4 w-4 mr-2" /> Generate Workbook Structure</>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StepInstructions
        summary="Create the workbook structure first, then apply one content-type set across the whole workbook."
        items={[
          { label: "Content type selector", description: "choose the interactive content mix once; it applies to every section." },
          { label: "Add Section", description: "manually create additional sections if you want to expand the workbook." },
          { label: "Regenerate", description: "re-run AI to create a fresh section structure." },
          { label: "Expand a section", description: "edit section titles and remove sections you don't need." },
        ]}
      />

      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Content Types for Entire Workbook</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_CONTENT_TYPES.map(type => (
            <Badge
              key={type}
              variant={globalContentTypes.includes(type) ? "default" : "outline"}
              className="text-[10px] cursor-pointer"
              onClick={() => toggleGlobalContentType(type)}
              title={CONTENT_TYPE_DESCRIPTIONS[type]}
            >
              {CONTENT_TYPE_LABELS[type]}
            </Badge>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 italic">Hover a badge to see what it means</p>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sections.length} sections in workbook structure</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Section
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
            <Wand2 className="h-3.5 w-3.5 mr-1" /> Regenerate
          </Button>
        </div>
      </div>

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
                <Badge variant="outline" className="text-[9px] shrink-0">{globalContentTypes.length} global types</Badge>
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                  <div>
                    <label className="text-[10px] font-medium block mb-1">Section Title</label>
                    <Input value={s.title} onChange={e => updateSection(s.id, { title: e.target.value })} className="h-8 text-xs" />
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
  );
}
