import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Download, Presentation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WebinarSlide, ScriptSection } from "./types";
import { SLIDE_TYPE_LABELS } from "./types";

interface Props {
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookTitle: string;
}

export default function SlideDeckStep({ stepData, setStepData, onMarkEdited, bookTitle }: Props) {
  const { toast } = useToast();
  const sections: ScriptSection[] = stepData["script"]?.sections || [];
  const slides: WebinarSlide[] = stepData["slides"]?.slides || [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const generateSlides = () => {
    setGenerating(true);
    // Generate slides from script sections
    setTimeout(() => {
      const generated: WebinarSlide[] = [
        { id: "s1", type: "title", title: stepData["configure"]?.config?.title || bookTitle, body: "A live masterclass with the author", imagePrompt: "Professional webinar title slide", sectionRef: "hook" },
        ...sections.map((sec, idx) => ({
          id: `s${idx + 2}`,
          type: (idx === sections.length - 2 ? "cta" : idx === sections.length - 1 ? "pricing" : idx % 3 === 0 ? "quote" : "content") as WebinarSlide["type"],
          title: sec.label,
          body: sec.script?.slice(0, 120) + "..." || "",
          imagePrompt: sec.slideRef || `Visual for ${sec.label}`,
          sectionRef: sec.id,
        })),
        // Add extra slides for content sections
        ...sections.filter(s => s.id.startsWith("content")).map((sec, idx) => ({
          id: `extra-${idx}`,
          type: "content" as const,
          title: `Key Insight from ${sec.label}`,
          body: sec.script?.slice(100, 220) + "..." || "",
          imagePrompt: `Supporting visual for ${sec.label}`,
          sectionRef: sec.id,
        })),
      ];
      setStepData(prev => ({ ...prev, slides: { ...prev.slides, slides: generated } }));
      onMarkEdited("slides");
      setGenerating(false);
      toast({ title: `${generated.length} slides generated!` });
    }, 2000);
  };

  const updateSlide = (slideId: string, patch: Partial<WebinarSlide>) => {
    setStepData(prev => ({
      ...prev,
      slides: {
        ...prev.slides,
        slides: slides.map(s => s.id === slideId ? { ...s, ...patch } : s),
      },
    }));
    onMarkEdited("slides");
  };

  const selected = slides.find(s => s.id === selectedId);

  if (slides.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed border-2">
        <Presentation className="h-10 w-10 text-secondary/40 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">Generate Slide Deck</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          AI will create {sections.length > 0 ? `slides matching your ${sections.length} script sections` : "a complete slide deck from your webinar script"}.
        </p>
        <Button
          onClick={generateSlides}
          disabled={generating || sections.length === 0}
          className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generate Slides
        </Button>
        {sections.length === 0 && (
          <p className="text-xs text-muted-foreground mt-3">Generate your script first (Step 2)</p>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">{slides.length} slides</Badge>
        <Button size="sm" variant="outline" onClick={() => toast({ title: "Export coming soon" })}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export PDF
        </Button>
      </div>

      <div className="flex gap-4">
        {/* Thumbnail strip */}
        <div className="w-40 shrink-0 space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {slides.map((slide, idx) => {
            const typeInfo = SLIDE_TYPE_LABELS[slide.type] || SLIDE_TYPE_LABELS.content;
            return (
              <button
                key={slide.id}
                onClick={() => setSelectedId(slide.id)}
                className={`w-full rounded-lg border p-2 text-left transition-all ${
                  selectedId === slide.id
                    ? "border-secondary ring-2 ring-secondary/20"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="aspect-video bg-muted/50 rounded flex items-center justify-center mb-1.5">
                  <span className="text-lg">{typeInfo.emoji}</span>
                </div>
                <p className="text-[10px] font-medium truncate">{slide.title}</p>
                <p className="text-[9px] text-muted-foreground">{idx + 1}. {typeInfo.label}</p>
              </button>
            );
          })}
        </div>

        {/* Slide editor */}
        <div className="flex-1">
          {selected ? (
            <Card className="p-5 space-y-4">
              <div className="aspect-video bg-muted/30 rounded-lg border border-border flex flex-col items-center justify-center p-8 text-center">
                <span className="text-3xl mb-3">{SLIDE_TYPE_LABELS[selected.type]?.emoji}</span>
                <h3 className="font-heading text-lg font-bold">{selected.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">{selected.body}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Title</label>
                  <Input
                    value={selected.title}
                    onChange={e => updateSlide(selected.id, { title: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Slide Type</label>
                  <Select
                    value={selected.type}
                    onValueChange={v => updateSlide(selected.id, { type: v as WebinarSlide["type"] })}
                  >
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SLIDE_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">Body Text</label>
                <Textarea
                  value={selected.body}
                  onChange={e => updateSlide(selected.id, { body: e.target.value })}
                  rows={3}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">Image Concept</label>
                <Input
                  value={selected.imagePrompt}
                  onChange={e => updateSlide(selected.id, { imagePrompt: e.target.value })}
                  className="text-sm"
                  placeholder="Describe the visual for this slide"
                />
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center border-dashed">
              <Presentation className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Click a slide thumbnail to edit it</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
