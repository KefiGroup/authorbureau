import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Wand2, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import StepInstructions from "../shared/StepInstructions";
import { CONTENT_TYPE_LABELS, type WorkbookSection, type WorkbookElement, type ContentType } from "./types";
import type { WorkbookStepProps } from "./types";
import { toast } from "sonner";
import { generateWithAI } from "@/lib/ai-generate";

const DEFAULT_CONTENT_TYPES: ContentType[] = ["reflection", "exercise", "checklist"];

function parseSectionPayload(rawText: string) {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  const jsonCandidate = match[0];
  const attempts = [
    jsonCandidate,
    jsonCandidate.replace(/,\s*([}\]])/g, "$1"),
    jsonCandidate.replace(/}\s*{/g, "},{"),
    jsonCandidate.replace(/,\s*([}\]])/g, "$1").replace(/}\s*{/g, "},{"),
  ];

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch {
      // continue
    }
  }

  return null;
}

export default function ContentGeneratorStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, setGenerationState }: WorkbookStepProps) {
  const sections: WorkbookSection[] = stepData.sections || [];
  const globalContentTypes = useMemo(() => {
    const fromState = stepData.globalContentTypes as ContentType[] | undefined;
    return Array.isArray(fromState) && fromState.length > 0 ? fromState : DEFAULT_CONTENT_TYPES;
  }, [stepData.globalContentTypes]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const section = sections[activeIdx];
  const effectiveTypes = section?.contentTypes?.length ? section.contentTypes : globalContentTypes;

  const updateSection = (updates: Partial<WorkbookSection>) => {
    setStepData(prev => ({
      ...prev,
      sections: (prev.sections || []).map((s: WorkbookSection, i: number) =>
        i === activeIdx ? { ...s, ...updates } : s
      ),
    }));
    onMarkEdited("content");
  };

  const updateElement = (elIdx: number, updates: Partial<WorkbookElement>) => {
    const elements = [...(section?.elements || [])];
    elements[elIdx] = { ...elements[elIdx], ...updates, edited: true };
    updateSection({ elements });
  };

  const addElement = (type: ContentType) => {
    const el: WorkbookElement = {
      id: `el-${Date.now()}`,
      type,
      title: `New ${CONTENT_TYPE_LABELS[type]}`,
      content: "",
    };
    updateSection({ elements: [...(section?.elements || []), el] });
  };

  const removeElement = (elIdx: number) => {
    updateSection({ elements: (section?.elements || []).filter((_: any, i: number) => i !== elIdx) });
  };

  const buildFallbackElements = (types: ContentType[]): WorkbookElement[] =>
    types.slice(0, 4).map((type, idx) => ({
      id: `el-fallback-${Date.now()}-${idx}`,
      type,
      title: `${CONTENT_TYPE_LABELS[type]}: ${section?.title || "Workbook Section"}`,
      content: `Apply the main idea of this section in your own context. Write your response clearly and add one next action you will complete this week.`,
    }));

  const handleGenerateSection = async () => {
    if (!section || isGenerating) return;

    setIsGenerating(true);
    setGenerationState("generating");

    try {
      const rawText = await generateWithAI(
        `Generate workbook content for the section "${section.title}" of a workbook for the book "${bookTitle}". Content types to include: ${effectiveTypes.join(", ")}. Return STRICT VALID JSON only with shape: {"intro": string, "elements": [{"id": string, "type": string, "title": string, "content": string}], "takeaway": string}. Rules: output plain JSON only; no markdown fences; escape quotes inside strings; ensure commas between all array objects. Keep each element concise (60-100 words). CRITICAL FOR CHECKLISTS: Checklists must be ASSESSMENT-ONLY — a self-diagnosis tool where readers tick what feels true for them. Do NOT include "Next-step plan", action items, or "choose ONE" prompts inside checklists. The checklist's purpose is to reveal where the reader stands; the natural next step is purchasing the full workbook, home study course, or online course. End checklists with a brief interpretive note like "The more items you checked, the more this section's deeper work will benefit you."`,
        {
          bookId,
          isPremium: true,
          builderMode: true,
          builderId: "workbook",
          builderLabel: "Workbook Builder",
          builderStep: "Content Generator",
        }
      );

      const parsed = parseSectionPayload(rawText);

      if (!parsed) {
        const fallbackElements = buildFallbackElements(effectiveTypes);
        updateSection({
          intro: section.intro || `This section helps you apply the key concepts in ${section.title}.`,
          elements: fallbackElements,
          takeaway: section.takeaway || "Choose one exercise and complete it today to build momentum.",
          contentTypes: effectiveTypes,
        });
        setGenerationState("complete");
        toast.warning("AI returned malformed JSON, so we generated a safe draft you can edit.");
        return;
      }

      updateSection({
        intro: parsed.intro || section.intro,
        elements: (parsed.elements || []).map((el: any, i: number) => ({
          id: el.id || `el-${i}`,
          type: el.type || effectiveTypes[0] || "exercise",
          title: el.title || "",
          content: el.content || "",
        })),
        takeaway: parsed.takeaway || section.takeaway,
        contentTypes: effectiveTypes,
      });

      setGenerationState("complete");
      toast.success("Section content generated!");
    } catch (err: any) {
      setGenerationState("error");
      toast.error(err?.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!section) {
    return <p className="text-sm text-muted-foreground text-center py-8">No sections found. Go back and generate the workbook structure first.</p>;
  }

  return (
    <div className="space-y-5">
      <StepInstructions
        summary="Generate and edit interactive content for each workbook section."
        items={[
          { label: "Section navigator", description: "use arrows to move between sections in your workbook structure." },
          { label: "Generate Content", description: "AI creates an introduction, interactive elements, and a key takeaway for the current section." },
          { label: "Add element buttons", description: "manually add a specific content type to the section." },
          { label: "Element editor", description: "edit titles and content directly. The 'Edited' badge marks custom edits." },
          { label: "Delete element", description: "remove any element you don't need." },
        ]}
      />
      {/* Section navigator */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={activeIdx === 0} onClick={() => setActiveIdx(activeIdx - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-xs text-muted-foreground">Section {activeIdx + 1} of {sections.length}</p>
          <p className="text-sm font-semibold">{section.title}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={activeIdx === sections.length - 1} onClick={() => setActiveIdx(activeIdx + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-center">
        <Button size="sm" onClick={handleGenerateSection} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
          Generate Content for This Section
        </Button>
      </div>

      <Card className="p-3 bg-muted/20">
        <p className="text-[11px] font-medium text-muted-foreground mb-2">Global content types for this workbook</p>
        <div className="flex flex-wrap gap-1.5">
          {effectiveTypes.map(type => (
            <Badge key={type} variant="outline" className="text-[10px]">{CONTENT_TYPE_LABELS[type]}</Badge>
          ))}
        </div>
      </Card>

      <div>
        <label className="text-xs font-medium block mb-1">Section Introduction</label>
        <Textarea
          value={section.intro || ""}
          onChange={e => updateSection({ intro: e.target.value })}
          placeholder="Connecting this section to the workbook's transformation..."
          rows={3}
          className="text-sm"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Interactive Elements ({(section.elements || []).length})
          </p>
          <div className="flex gap-1">
            {effectiveTypes.map(type => (
              <Button key={type} variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={() => addElement(type)}>
                <Plus className="h-2.5 w-2.5 mr-0.5" /> {CONTENT_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>
        </div>

        {(section.elements || []).map((el: WorkbookElement, i: number) => (
          <Card key={el.id} className="p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Badge variant={el.edited ? "secondary" : "outline"} className="text-[9px]">
                {el.edited ? "Edited" : <><Wand2 className="h-2 w-2 mr-0.5" /> AI</>}
              </Badge>
              <Badge variant="outline" className="text-[9px]">{CONTENT_TYPE_LABELS[el.type] || el.type}</Badge>
              <Input
                value={el.title}
                onChange={e => updateElement(i, { title: e.target.value })}
                className="h-7 text-xs font-medium flex-1"
              />
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeElement(i)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <Textarea
              value={el.content}
              onChange={e => updateElement(i, { content: e.target.value })}
              rows={4}
              className="text-xs"
              placeholder="Element content..."
            />
          </Card>
        ))}
      </div>

      <div>
        <label className="text-xs font-medium block mb-1">Key Takeaway Summary</label>
        <Textarea
          value={section.takeaway || ""}
          onChange={e => updateSection({ takeaway: e.target.value })}
          placeholder="The main insight from this section..."
          rows={2}
          className="text-sm"
        />
      </div>
    </div>
  );
}
