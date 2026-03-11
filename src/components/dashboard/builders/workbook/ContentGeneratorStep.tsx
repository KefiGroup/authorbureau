import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Wand2, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { CONTENT_TYPE_LABELS, type WorkbookSection, type WorkbookElement, type ContentType } from "./types";
import type { WorkbookStepProps } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ContentGeneratorStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, generationState, setGenerationState }: WorkbookStepProps) {
  const sections: WorkbookSection[] = stepData.sections || [];
  const [activeIdx, setActiveIdx] = useState(0);
  const section = sections[activeIdx];

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

  const handleGenerateSection = async () => {
    if (!section) return;
    setGenerationState("generating");
    try {
      const { data: session } = await supabase.auth.getSession();
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
                content: `Generate workbook content for the section "${section.title}" (mapped to "${section.chapterRef}") of a workbook for the book "${bookTitle}". Content types to include: ${section.contentTypes.join(", ")}. Return JSON with: intro (string), elements (array of {id, type, title, content}), takeaway (string). Each element should be 100-200 words. Return ONLY JSON.`,
              },
            ],
            bookId,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }

      // Handle SSE stream
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

      const match = fullText.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        updateSection({
          intro: parsed.intro || section.intro,
          elements: (parsed.elements || []).map((el: any, i: number) => ({
            id: el.id || `el-${i}`,
            type: el.type || "exercise",
            title: el.title || "",
            content: el.content || "",
          })),
          takeaway: parsed.takeaway || section.takeaway,
        });
        toast.success("Section content generated!");
      } else {
        throw new Error("Could not parse AI response");
      }
    } catch (err: any) {
      toast.error(err?.message || "Generation failed");
    }
    setGenerationState("complete");
  };

  if (!section) {
    return <p className="text-sm text-muted-foreground text-center py-8">No sections found. Go back and generate the chapter mapping first.</p>;
  }

  return (
    <div className="space-y-5">
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

      {/* Generate button */}
      <div className="flex justify-center">
        <Button size="sm" onClick={handleGenerateSection} disabled={generationState === "generating"}>
          {generationState === "generating" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
          Generate Content for This Section
        </Button>
      </div>

      {/* Section intro */}
      <div>
        <label className="text-xs font-medium block mb-1">Section Introduction</label>
        <Textarea
          value={section.intro || ""}
          onChange={e => updateSection({ intro: e.target.value })}
          placeholder="Connecting this section back to the book chapter..."
          rows={3}
          className="text-sm"
        />
      </div>

      {/* Elements */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Interactive Elements ({(section.elements || []).length})
          </p>
          <div className="flex gap-1">
            {section.contentTypes.map(type => (
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

      {/* Key takeaway */}
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
