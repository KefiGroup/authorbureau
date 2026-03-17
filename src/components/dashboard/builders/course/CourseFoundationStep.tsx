import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import ProductDistinctionCard from "../shared/ProductDistinctionCard";
import type { CourseStepProps } from "./types";

export default function CourseFoundationStep({ stepData, setStepData, onMarkEdited, plan, onStartGeneration, builderAct }: CourseStepProps) {
  const data = stepData.foundation || {};

  const update = (field: string, value: any) => {
    setStepData(prev => ({
      ...prev,
      foundation: { ...prev.foundation, [field]: value },
    }));
    onMarkEdited("foundation");
  };

  const canGenerate = builderAct === "idle" || !builderAct;

  const titleOptions: string[] = data.titleOptions || [];
  const selectedTitleIdx: number | null = data.selectedTitleIdx ?? null;

  const addTitleOption = () => update("titleOptions", [...titleOptions, ""]);
  const removeTitleOption = (idx: number) => {
    const next = titleOptions.filter((_: string, i: number) => i !== idx);
    update("titleOptions", next);
    if (selectedTitleIdx === idx) update("selectedTitleIdx", null);
    else if (selectedTitleIdx !== null && selectedTitleIdx > idx) update("selectedTitleIdx", selectedTitleIdx - 1);
  };
  const updateTitleOption = (idx: number, val: string) => {
    const next = [...titleOptions];
    next[idx] = val;
    update("titleOptions", next);
  };

  const promises: string[] = data.transformationPromises || [];
  const addPromise = () => update("transformationPromises", [...promises, ""]);
  const removePromise = (idx: number) => update("transformationPromises", promises.filter((_: string, i: number) => i !== idx));
  const updatePromise = (idx: number, val: string) => {
    const next = [...promises];
    next[idx] = val;
    update("transformationPromises", next);
  };

  return (
    <div className="space-y-6">
      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed">
          Online courses are <strong>self-paced learning experiences</strong> — students enroll and learn on their own schedule with recorded video lessons, exercises, and quizzes. Ideal price range: <strong>$97–$297</strong>. For live facilitated workshops at $497+, use the <strong>Training Program</strong> builder instead.
        </p>
      </AbbyRecommendationCard>

      <ProductDistinctionCard highlight="online-course" />

      {/* Abby Generate CTA */}
      {canGenerate && onStartGeneration && (
        <Card className="p-5 border-secondary/30 bg-secondary/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Let Abby design your course</p>
              <p className="text-xs text-muted-foreground">
                Abby will analyze your manuscript and structure a self-paced online course with modules, lessons, exercises, and quizzes.
              </p>
            </div>
            <Button
              onClick={onStartGeneration}
              className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0"
            >
              <Sparkles className="h-4 w-4 mr-2" /> Analyze with Abby
            </Button>
          </div>
        </Card>
      )}

      {/* Show editable fields only after Abby has generated content */}
      {(data.title || data.subtitle || data.description || titleOptions.length > 0 || promises.length > 0 || data.targetStudent || data.price) && (
        <>
          {/* Review & Edit Header */}
          <div className="flex items-center gap-2 pt-2">
            <Sparkles className="h-4 w-4 text-secondary" />
            <p className="text-sm font-semibold text-secondary">Review & Edit Abby's Output</p>
          </div>

          {/* Title Options */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              Course Title
              {titleOptions.length > 0 && <Badge variant="outline" className="text-[10px]">{titleOptions.length} options</Badge>}
            </h3>
            {titleOptions.length > 0 ? (
              <div className="space-y-2">
                {titleOptions.map((opt: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      onClick={() => update("selectedTitleIdx", i)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedTitleIdx === i ? "border-secondary bg-secondary text-secondary-foreground" : "border-muted-foreground/30"
                      }`}
                    >
                      {selectedTitleIdx === i && <span className="text-[8px]">✓</span>}
                    </button>
                    <Input value={opt} onChange={(e) => updateTitleOption(i, e.target.value)} placeholder={`Title option ${i + 1}`} className={`text-base ${selectedTitleIdx === i ? "font-semibold" : ""}`} />
                    <button onClick={() => removeTitleOption(i)} className="text-destructive/50 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={addTitleOption} className="text-xs"><Plus className="h-3 w-3 mr-1" /> Add Title Option</Button>
              </div>
            ) : (
              <Input value={data.title || ""} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Mastering Value Investing: The Complete Course" className="text-base font-medium" />
            )}
          </Card>

          {/* Subtitle */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Subtitle</Label>
            <Input value={data.subtitle || ""} onChange={(e) => update("subtitle", e.target.value)} placeholder='e.g. "Learn at your own pace with video lessons, exercises, and quizzes"' />
          </div>

          {/* Target Student */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Target Student</Label>
            <Textarea value={data.targetStudent || ""} onChange={(e) => update("targetStudent", e.target.value)} placeholder="Who is this course for? What skill level, goals, and pain points do they have?" rows={3} />
          </div>

          {/* Course Description */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Course Description</Label>
              {data.description && <span className="text-[10px] text-muted-foreground">{data.description.length} chars</span>}
            </div>
            <Textarea value={data.description || ""} onChange={(e) => update("description", e.target.value)} placeholder='Write 2-3 paragraphs describing what students will learn. Focus on outcomes ("You will...").' rows={5} />
          </Card>

          {/* Learning Outcomes */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">What Students Will Learn</h3>
                <p className="text-[10px] text-muted-foreground">Key learning outcomes — what skills or knowledge will they gain?</p>
              </div>
              <Badge variant="outline" className="text-[10px]">{promises.length}/5</Badge>
            </div>
            <div className="space-y-2">
              {promises.map((p: string, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">{i + 1}.</span>
                  <Input value={p} onChange={(e) => updatePromise(i, e.target.value)} placeholder={`e.g. "Build a complete investment portfolio strategy"`} className="text-sm" />
                  <button onClick={() => removePromise(i)} className="text-destructive/50 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              {promises.length < 7 && (
                <Button variant="ghost" size="sm" onClick={addPromise} className="text-xs"><Plus className="h-3 w-3 mr-1" /> Add Outcome</Button>
              )}
            </div>
          </Card>

          {/* Pricing */}
          <Card className="p-5 space-y-3">
            <Label className="text-sm font-semibold">Pricing</Label>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-muted-foreground">$</span>
              <Input type="number" value={data.price || ""} onChange={(e) => update("price", parseInt(e.target.value) || 0)} className="max-w-[200px]" placeholder="197" />
            </div>
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span>📕 Workbook ($27-47)</span>
              <span className="text-secondary font-semibold">🎬 Online Course ($97-$297)</span>
              <span>🎓 Training Program ($497+)</span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
