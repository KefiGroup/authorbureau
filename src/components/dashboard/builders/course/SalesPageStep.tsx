import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wand2, Loader2, ChevronDown, ChevronRight, User } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { generateJSONWithAI } from "@/lib/ai-generate";
import type { CourseStepProps } from "./types";

export default function SalesPageStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, generationState, setGenerationState }: CourseStepProps) {
  const { toast } = useToast();
  const data = stepData.salesPage || {};
  const [expandedModule, setExpandedModule] = useState<number | null>(null);

  const update = (field: string, value: any) => {
    setStepData(prev => ({
      ...prev,
      salesPage: { ...prev.salesPage, [field]: value },
    }));
    onMarkEdited("sales-page");
  };

  const handleGenerate = async () => {
    setGenerationState("queued");
    try {
      setGenerationState("generating");

      const title = stepData.foundation?.title || "Your Course";
      const transformation = stepData.foundation?.transformation || "transform your life";
      const moduleCount = stepData.curriculum?.modules?.length || 8;

      const result = await generateJSONWithAI(
        `Generate a high-converting sales page for an online course called "${title}" based on the book "${bookTitle}".
The course has ${moduleCount} modules and promises to help students ${transformation}.

Return a JSON object with these fields:
- "headline": string (compelling main headline)
- "subheadline": string (supporting subheadline)
- "painPoints": string[] (4 pain points the audience faces)
- "transformationText": string (1-2 paragraph transformation promise)
- "faqs": array of {"q": string, "a": string} (4 FAQs with answers)

Return ONLY valid JSON, no markdown fences.`,
        {
          bookId,
          isPremium: true,
          builderMode: true,
          builderId: "online-course",
          builderLabel: "Online Course",
          builderStep: "Sales Page",
        }
      );

      update("headline", result.headline);
      update("subheadline", result.subheadline);
      update("painPoints", result.painPoints);
      update("transformationText", result.transformationText);
      update("testimonials", [
        { name: "", text: "Add a student testimonial here..." },
        { name: "", text: "Add another testimonial here..." },
      ]);
      update("faqs", result.faqs);

      setGenerationState("complete");
      toast({ title: "Sales page generated!" });
    } catch (err) {
      console.error(err);
      setGenerationState("error");
      toast({ title: "Generation failed", variant: "destructive" });
    }
  };

  if (!data.headline && generationState === "idle") {
    return (
      <div className="text-center py-12">
        <Sparkles className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">Generate Sales Page Copy</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Abby will create a complete, high-converting sales page based on your course content and target audience.
        </p>
        <Button onClick={handleGenerate} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Wand2 className="h-4 w-4 mr-2" /> Generate Sales Page
        </Button>
      </div>
    );
  }

  if (generationState !== "idle" && generationState !== "complete" && generationState !== "error") {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-secondary mx-auto mb-4" />
        <p className="text-sm font-medium">Creating your high-converting sales page...</p>
      </div>
    );
  }

  const modules = stepData.curriculum?.modules || [];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Headline */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Headline</label>
        <Input
          value={data.headline || ""}
          onChange={(e) => update("headline", e.target.value)}
          className="text-xl font-bold"
        />
      </div>

      {/* Subheadline */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subheadline</label>
        <Input
          value={data.subheadline || ""}
          onChange={(e) => update("subheadline", e.target.value)}
          className="text-base"
        />
      </div>

      {/* Pain Points */}
      <Card className="p-4 space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pain Points</label>
        {(data.painPoints || []).map((point: string, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-destructive text-sm">✗</span>
            <Input
              value={point}
              onChange={(e) => {
                const updated = [...(data.painPoints || [])];
                updated[i] = e.target.value;
                update("painPoints", updated);
              }}
              className="text-sm"
            />
          </div>
        ))}
      </Card>

      {/* Transformation */}
      <Card className="p-4 space-y-2 border-secondary/20 bg-secondary/5">
        <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Transformation Promise</label>
        <Textarea
          value={data.transformationText || ""}
          onChange={(e) => update("transformationText", e.target.value)}
          rows={3}
          className="border-secondary/20"
        />
      </Card>

      {/* Module Breakdown Accordion */}
      <Card className="p-4 space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Module-by-Module Breakdown</label>
        <div className="space-y-1">
          {modules.map((mod: any, i: number) => (
            <div key={i} className="border border-border rounded-md">
              <button
                onClick={() => setExpandedModule(expandedModule === i ? null : i)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm font-medium">Module {i + 1}: {mod.title}</span>
                {expandedModule === i ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {expandedModule === i && (
                <div className="px-3 pb-3 space-y-1">
                  {(mod.lessons || []).map((l: any, li: number) => (
                    <p key={li} className="text-xs text-muted-foreground pl-4">• {l.title}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Testimonials */}
      <Card className="p-4 space-y-3">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Testimonials</label>
        {(data.testimonials || []).map((t: { name: string; text: string }, i: number) => (
          <div key={i} className="border border-dashed border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                value={t.name}
                onChange={(e) => {
                  const updated = [...(data.testimonials || [])];
                  updated[i] = { ...updated[i], name: e.target.value };
                  update("testimonials", updated);
                }}
                placeholder="Student name"
                className="text-sm font-medium"
              />
            </div>
            <Textarea
              value={t.text}
              onChange={(e) => {
                const updated = [...(data.testimonials || [])];
                updated[i] = { ...updated[i], text: e.target.value };
                update("testimonials", updated);
              }}
              placeholder="Testimonial text..."
              rows={2}
              className="text-sm italic"
            />
          </div>
        ))}
      </Card>

      {/* FAQs */}
      <Card className="p-4 space-y-3">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">FAQ Section</label>
        {(data.faqs || []).map((faq: { q: string; a: string }, i: number) => (
          <div key={i} className="space-y-1">
            <Input
              value={faq.q}
              onChange={(e) => {
                const updated = [...(data.faqs || [])];
                updated[i] = { ...updated[i], q: e.target.value };
                update("faqs", updated);
              }}
              placeholder="Question..."
              className="text-sm font-semibold"
            />
            <Textarea
              value={faq.a}
              onChange={(e) => {
                const updated = [...(data.faqs || [])];
                updated[i] = { ...updated[i], a: e.target.value };
                update("faqs", updated);
              }}
              placeholder="Answer..."
              rows={2}
              className="text-sm"
            />
          </div>
        ))}
      </Card>
    </div>
  );
}
