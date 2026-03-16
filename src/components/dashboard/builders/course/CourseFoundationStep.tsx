import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, Trash2, GripVertical } from "lucide-react";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import ProductDistinctionCard from "../shared/ProductDistinctionCard";
import type { CourseStepProps } from "./types";

const FORMAT_OPTIONS = [
  { label: "2-Day Intensive", value: "2_day", desc: "6 hours/day, 12 hours total", badge: "Most popular" },
  { label: "3-Day Workshop", value: "3_day", desc: "4 hours/day, 12 hours total", badge: "Recommended" },
  { label: "2.5-Day Hybrid", value: "2_5_day", desc: "Day 1-2 content, Day 3 half-day implementation", badge: "" },
];

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

  // Title options management
  const titleOptions: string[] = data.titleOptions || [];
  const selectedTitleIdx: number | null = data.selectedTitleIdx ?? null;

  const addTitleOption = () => {
    update("titleOptions", [...titleOptions, ""]);
  };

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

  // Transformation promises
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
          Online courses are <strong>facilitated workshops</strong> — you lead the transformation live or via recorded sessions over <strong>2–3 intensive days</strong> via Zoom. Each module uses <strong>Bloom's Taxonomy</strong> for learning objectives and <strong>Kolb's Learning Cycle</strong> for activity design. I recommend the <strong>$297+ price point</strong> for this premium experience.
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
              <p className="text-sm font-bold">Let Abby design your entire workshop</p>
              <p className="text-xs text-muted-foreground">
                Abby will analyze your manuscript and design a complete 7-module facilitated workshop with activities, debriefs, workbook pages, and a framework mindmap.
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

      {/* Card 1: Title Options */}
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
                <Input
                  value={opt}
                  onChange={(e) => updateTitleOption(i, e.target.value)}
                  placeholder={`Title option ${i + 1}`}
                  className={`text-base ${selectedTitleIdx === i ? "font-semibold" : ""}`}
                />
                <button onClick={() => removeTitleOption(i)} className="text-destructive/50 hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addTitleOption} className="text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Title Option
            </Button>
          </div>
        ) : (
          <>
            <Input
              value={data.title || ""}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Master Value Investing: A 2-Day Workshop"
              className="text-base font-medium"
            />
            <p className="text-[10px] text-muted-foreground">Abby will generate 3 title options when you run the analysis.</p>
          </>
        )}
      </Card>

      {/* Subtitle */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Subtitle (Transformation-focused)</Label>
        <Input
          value={data.subtitle || ""}
          onChange={(e) => update("subtitle", e.target.value)}
          placeholder='e.g. "You will design a personalized investment strategy in just 2 days"'
        />
      </div>

      {/* Course Format */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Workshop Format</Label>
        <div className="grid grid-cols-3 gap-2">
          {FORMAT_OPTIONS.map((fmt) => (
            <button
              key={fmt.value}
              onClick={() => update("format", fmt.value)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                data.format === fmt.value
                  ? "border-secondary bg-secondary/5 shadow-sm"
                  : "border-border hover:border-secondary/30"
              }`}
            >
              <p className="text-sm font-bold">{fmt.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{fmt.desc}</p>
              {fmt.badge && <Badge variant="outline" className="mt-1.5 text-[10px]">{fmt.badge}</Badge>}
            </button>
          ))}
        </div>
      </div>

      {/* Target Student */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Target Student</Label>
        <Textarea
          value={data.targetStudent || ""}
          onChange={(e) => update("targetStudent", e.target.value)}
          placeholder="Define your ideal participant: demographics, current pain points, goals, what they've tried before, and what's holding them back."
          rows={4}
        />
      </div>

      {/* Course Description */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Course Description</Label>
          {data.description && <span className="text-[10px] text-muted-foreground">{data.description.length} chars</span>}
        </div>
        <Textarea
          value={data.description || ""}
          onChange={(e) => update("description", e.target.value)}
          placeholder='Write 2-3 paragraphs selling the transformation in second person ("You will..."). Focus on outcomes, not features.'
          rows={6}
        />
      </Card>

      {/* Transformation Promises */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Transformation Promises</h3>
            <p className="text-[10px] text-muted-foreground">5 specific, measurable outcomes starting with Bloom's action verbs (design, evaluate, create, analyze, implement)</p>
          </div>
          <Badge variant="outline" className="text-[10px]">{promises.length}/5</Badge>
        </div>
        <div className="space-y-2">
          {promises.map((p: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">{i + 1}.</span>
              <Input
                value={p}
                onChange={(e) => updatePromise(i, e.target.value)}
                placeholder={`e.g. "Design a personalized 90-day implementation roadmap based on the [Framework]"`}
                className="text-sm"
              />
              <button onClick={() => removePromise(i)} className="text-destructive/50 hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {promises.length < 7 && (
            <Button variant="ghost" size="sm" onClick={addPromise} className="text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Promise
            </Button>
          )}
        </div>
      </Card>

      {/* Pricing */}
      <Card className="p-5 space-y-3">
        <Label className="text-sm font-semibold">Pricing</Label>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-muted-foreground">$</span>
          <Input
            type="number"
            value={data.price || ""}
            onChange={(e) => update("price", parseInt(e.target.value) || 0)}
            className="max-w-[200px]"
            placeholder="297"
          />
        </div>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">📕 Workbook = Entry ($27-47)</span>
          <span className="flex items-center gap-1">📘 Home Study = Mid ($97-197)</span>
          <span className="flex items-center gap-1 text-secondary font-semibold">🎓 Workshop = Premium ($297+)</span>
        </div>
      </Card>
    </div>
  );
}
