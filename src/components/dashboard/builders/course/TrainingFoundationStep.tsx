import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, Trash2, BookOpen, Users, Target, Palette, FileText, Presentation } from "lucide-react";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import type { CourseStepProps } from "./types";

const FORMAT_OPTIONS = [
  { label: "2-Day Intensive", value: "2_day", desc: "6 hours/day, 12 hours total", badge: "Most popular" },
  { label: "3-Day Workshop", value: "3_day", desc: "4 hours/day, 12 hours total", badge: "Recommended" },
  { label: "2.5-Day Hybrid", value: "2_5_day", desc: "Day 1-2 content, Day 3 half-day implementation", badge: "" },
];

const THREE_ACT_STEPS = [
  {
    act: "ACT 1 — ANALYSE",
    color: "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    items: [
      { icon: <BookOpen className="h-3.5 w-3.5" />, label: "Manuscript Analysis", desc: "Abby reads your book to extract frameworks, mental models, and transformation arcs" },
      { icon: <Users className="h-3.5 w-3.5" />, label: "Author Profile Review", desc: "Your credentials, speaking style, and authority level shape the training design" },
      { icon: <Target className="h-3.5 w-3.5" />, label: "Market & Audience Research", desc: "Competitive pricing, target audience pain points, and learning objectives" },
    ],
  },
  {
    act: "ACT 2 — BUILD",
    color: "border-secondary/20 bg-secondary/5",
    iconColor: "text-secondary",
    badgeColor: "bg-secondary/10 text-secondary",
    items: [
      { icon: <BookOpen className="h-3.5 w-3.5" />, label: "7-Module Curriculum", desc: "Learning objectives mapped to Bloom's Taxonomy + experiential activities via Kolb's Cycle" },
      { icon: <Palette className="h-3.5 w-3.5" />, label: "Training Design & Activities", desc: "Facilitator activities, debrief questions, breakout exercises, and capstone project" },
      { icon: <FileText className="h-3.5 w-3.5" />, label: "Course Workbook", desc: "Printable workbook with activity pages, reflection prompts, and frameworks worksheets" },
      { icon: <Presentation className="h-3.5 w-3.5" />, label: "Course Slides", desc: "Professional slide deck with key concepts, activity instructions, and visual frameworks" },
    ],
  },
  {
    act: "ACT 3 — BRIDGE",
    color: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    items: [
      { icon: <FileText className="h-3.5 w-3.5" />, label: "Trainer's Manual", desc: "Speaking notes, activity setups, timing cues, energy management, and Zoom configuration" },
      { icon: <Target className="h-3.5 w-3.5" />, label: "Sales Page & Email Sequence", desc: "High-converting sales page + 7-email nurture sequence to launch your training" },
      { icon: <Sparkles className="h-3.5 w-3.5" />, label: "Workshop Schedule & Publish", desc: "Day-by-day timeline, preview experience, and publish to your microsite" },
    ],
  },
];

export default function TrainingFoundationStep({ stepData, setStepData, onMarkEdited, plan, onStartGeneration, builderAct }: CourseStepProps) {
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
          Training Programs are <strong>premium facilitated workshops</strong> — you lead the transformation live or via recorded sessions over <strong>2–3 intensive days</strong>. I'll analyze your <strong>manuscript</strong>, your <strong>author profile</strong>, and <strong>market data</strong> to design a complete training program with learning objectives, experiential activities, workbook, slides, and trainer's manual. Price range: <strong>$497–$2,997</strong>.
        </p>
      </AbbyRecommendationCard>

      {/* 3-Act Workflow Guide */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-secondary" />
          How Abby Builds Your Training Program — 3 Acts
        </h3>
        <p className="text-xs text-muted-foreground">
          Click <strong>"Analyze with Abby"</strong> below and Abby will guide you through each act automatically.
        </p>
        <div className="space-y-3">
          {THREE_ACT_STEPS.map((act) => (
            <div key={act.act} className={`rounded-xl border p-3.5 ${act.color}`}>
              <Badge className={`text-[10px] font-bold mb-2 ${act.badgeColor} border-0`}>{act.act}</Badge>
              <div className="space-y-2 mt-1">
                {act.items.map((item) => (
                  <div key={item.label} className="flex items-start gap-2.5">
                    <span className={`mt-0.5 shrink-0 ${act.iconColor}`}>{item.icon}</span>
                    <div>
                      <p className="text-xs font-semibold">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Abby Generate CTA */}
      {canGenerate && onStartGeneration && (
        <Card className="p-5 border-secondary/30 bg-secondary/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Let Abby design your entire training program</p>
              <p className="text-xs text-muted-foreground">
                Abby will analyze your manuscript, author profile, and market data to design a complete 7-module facilitated training with activities, workbook, slides, and trainer's manual.
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

      {/* Title Options */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          Training Program Title
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
          <>
            <Input value={data.title || ""} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Leadership Mastery: A 2-Day Intensive Workshop" className="text-base font-medium" />
            <p className="text-[10px] text-muted-foreground">Abby will generate 3 title options when you run the analysis.</p>
          </>
        )}
      </Card>

      {/* Subtitle */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Subtitle (Transformation-focused)</Label>
        <Input value={data.subtitle || ""} onChange={(e) => update("subtitle", e.target.value)} placeholder='e.g. "Transform your leadership approach in just 2 intensive days"' />
      </div>

      {/* Workshop Format */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Workshop Format</Label>
        <div className="grid grid-cols-3 gap-2">
          {FORMAT_OPTIONS.map((fmt) => (
            <button key={fmt.value} onClick={() => update("format", fmt.value)} className={`p-3 rounded-xl border-2 text-left transition-all ${data.format === fmt.value ? "border-secondary bg-secondary/5 shadow-sm" : "border-border hover:border-secondary/30"}`}>
              <p className="text-sm font-bold">{fmt.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{fmt.desc}</p>
              {fmt.badge && <Badge variant="outline" className="mt-1.5 text-[10px]">{fmt.badge}</Badge>}
            </button>
          ))}
        </div>
      </div>

      {/* Target Participant */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Target Participant</Label>
        <Textarea value={data.targetStudent || ""} onChange={(e) => update("targetStudent", e.target.value)} placeholder="Define your ideal participant: demographics, current pain points, goals, what they've tried before, and what's holding them back." rows={4} />
        <p className="text-[10px] text-muted-foreground">💡 Abby will research your niche and recommend a target audience based on your book's content and market demand.</p>
      </div>

      {/* Description */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Program Description</Label>
          {data.description && <span className="text-[10px] text-muted-foreground">{data.description.length} chars</span>}
        </div>
        <Textarea value={data.description || ""} onChange={(e) => update("description", e.target.value)} placeholder='Write 2-3 paragraphs selling the transformation. Focus on outcomes and the premium facilitated experience.' rows={6} />
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
              <Input value={p} onChange={(e) => updatePromise(i, e.target.value)} placeholder={`e.g. "Design a personalized 90-day implementation roadmap"`} className="text-sm" />
              <button onClick={() => removePromise(i)} className="text-destructive/50 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {promises.length < 7 && (
            <Button variant="ghost" size="sm" onClick={addPromise} className="text-xs"><Plus className="h-3 w-3 mr-1" /> Add Promise</Button>
          )}
        </div>
      </Card>

      {/* Pricing */}
      <Card className="p-5 space-y-3">
        <Label className="text-sm font-semibold">Pricing</Label>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-muted-foreground">$</span>
          <Input type="number" value={data.price || ""} onChange={(e) => update("price", parseInt(e.target.value) || 0)} className="max-w-[200px]" placeholder="997" />
        </div>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">📕 Workbook ($27-47)</span>
          <span className="flex items-center gap-1">📘 Online Course ($97-$297)</span>
          <span className="flex items-center gap-1 text-secondary font-semibold">🎓 Training = Premium ($497-$2,997)</span>
        </div>
        <p className="text-[10px] text-muted-foreground">💡 Abby will benchmark comparable training programs in your niche to recommend the optimal price point.</p>
      </Card>
    </div>
  );
}
