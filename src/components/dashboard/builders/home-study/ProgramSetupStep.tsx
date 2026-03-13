import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Sparkles, Wand2, Loader2, CalendarDays, Coffee,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateJSONWithAI } from "@/lib/ai-generate";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import StaleContentBanner from "./StaleContentBanner";
import type { HomeStudyStepProps, StudyDay } from "./types";

function generateId() { return crypto.randomUUID(); }

const DURATIONS = [
  { label: "7 Days", value: 7, desc: "Quick challenge — great for lead magnets" },
  { label: "14 Days", value: 14, desc: "Short program — focused transformation" },
  { label: "21 Days", value: 21, desc: "Habit-builder — ideal for self-help" },
  { label: "30 Days", value: 30, desc: "Deep program — highest perceived value" },
];

const COMMITMENTS = [
  { label: "15 min/day", value: 15 },
  { label: "30 min/day", value: 30 },
  { label: "45 min/day", value: 45 },
  { label: "60 min/day", value: 60 },
];

const LEVELS = [
  { label: "Beginner", value: "beginner", desc: "No prior knowledge required" },
  { label: "Intermediate", value: "intermediate", desc: "Some familiarity expected" },
  { label: "Advanced", value: "advanced", desc: "Deep prior knowledge assumed" },
];

const FORMATS = [
  { label: "PDF + Audio", value: "pdf-audio", desc: "PDF guide with audio prompts for each day" },
  { label: "PDF Only", value: "pdf", desc: "Clean printable study guide" },
  { label: "Digital Interactive", value: "interactive", desc: "Online experience with progress tracking" },
];

export default function ProgramSetupStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, onStartGeneration, builderAct, generationState, setGenerationState }: HomeStudyStepProps) {
  const { toast } = useToast();
  const data = stepData.setup || {};
  const isEmpty = !data.title && !data.duration && !data.commitment;
  const isIdle = !builderAct || builderAct === "idle";

  const days: StudyDay[] = stepData.schedule?.days || [];
  const generatedSetup = stepData.schedule?._generatedFromSetup;
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const duration = data.duration || 30;

  const update = (field: string, value: any) => {
    setStepData(prev => ({ ...prev, setup: { ...prev.setup, [field]: value } }));
    onMarkEdited("setup");
  };

  const updateDays = (newDays: StudyDay[]) => {
    setStepData(prev => ({ ...prev, schedule: { ...prev.schedule, days: newDays } }));
    onMarkEdited("schedule");
  };

  const updateDay = (dayId: string, field: string, value: any) => {
    updateDays(days.map(d => d.id === dayId ? { ...d, [field]: value } : d));
  };

  const handleGenerateSchedule = async () => {
    setGenerationState("queued");
    try {
      setGenerationState("analyzing");
      const result = await generateJSONWithAI<Array<{
        dayNumber: number;
        weekNumber: number;
        theme: string;
        chapterRef: string;
        reading: string;
        exercise: string;
        reflection: string;
        isCatchUp: boolean;
      }>>(
        `Generate a ${duration}-day home study schedule for the book "${bookTitle}".
Organize into weeks of 7 days. Day 7 of each week should be a catch-up/review day.

Each day needs a specific theme, chapter reference from the book, reading assignment, exercise, and reflection prompt.
Make weekly themes progress from Awareness → Skills → Practice → Integration → Mastery.

Return a JSON array of ${duration} objects, each with:
- "dayNumber": number
- "weekNumber": number
- "theme": string (specific to that day's learning focus)
- "chapterRef": string (e.g. "Chapter 3")
- "reading": string (specific reading assignment)
- "exercise": string (short exercise description)
- "reflection": string (journal prompt)
- "isCatchUp": boolean (true only for day 7 of each week)

Return ONLY valid JSON.`,
        { bookId, isPremium: true }
      );

      setGenerationState("generating");
      const generated: StudyDay[] = result.map(d => ({
        id: generateId(),
        ...d,
        concept: "",
        audioScript: undefined,
      }));

      setStepData(prev => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          days: generated,
          _generatedFromSetup: { ...prev.setup },
        },
      }));
      onMarkEdited("schedule");
      setSelectedDayId(generated[0]?.id || null);
      setGenerationState("complete");
      const weeks = Math.ceil(duration / 7);
      toast({ title: "Schedule generated!", description: `${duration}-day program with ${weeks} weekly themes.` });
    } catch (err) {
      console.error(err);
      setGenerationState("error");
      toast({ title: "Generation failed", variant: "destructive" });
    }
  };

  const isScheduleGenerating = generationState !== "idle" && generationState !== "complete" && generationState !== "error";

  // Show prominent AI CTA when form is empty
  if (isEmpty && isIdle) {
    return (
      <div className="space-y-6">
        <Card className="p-8 border-secondary/30 bg-gradient-to-br from-secondary/5 to-secondary/10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary/15 flex items-center justify-center mx-auto mb-5">
            <Sparkles className="h-8 w-8 text-secondary" />
          </div>
          <h3 className="font-heading text-xl font-bold mb-2">
            Let Abby Design Your Home Study Program
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
            Abby will analyze your manuscript, propose a complete program structure with title options, 
            optimal duration, pricing, and a day-by-day curriculum — all tailored to your book's content.
          </p>
          <Button
            onClick={onStartGeneration}
            className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold h-12 px-8 text-sm"
          >
            <Sparkles className="h-4 w-4 mr-2" /> Let Abby Design This Program
          </Button>
          <p className="text-[10px] text-muted-foreground/60 mt-4">
            You'll review and edit Abby's proposal before anything is generated
          </p>
        </Card>

        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-2">Or set up manually:</p>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => update("_manualMode", true)}
          >
            <Wand2 className="h-3 w-3 mr-1" /> I'll configure it myself
          </Button>
        </div>
      </div>
    );
  }

  const weeks = Array.from(new Set(days.map(d => d.weekNumber))).sort((a, b) => a - b);
  const selectedDay = days.find(d => d.id === selectedDayId);
  const hasRequiredSetup = data.duration && data.title;

  return (
    <div className="space-y-6">
      {/* Abby can still be triggered if form has some data */}
      {isIdle && onStartGeneration && (
        <AbbyRecommendationCard>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-foreground leading-relaxed">
              Want Abby to propose the optimal program design? She'll analyze your manuscript and suggest title, 
              duration, pricing, and a full curriculum.
            </p>
            <Button
              onClick={onStartGeneration}
              size="sm"
              className="shrink-0 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Design with AI
            </Button>
          </div>
        </AbbyRecommendationCard>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Program Title</Label>
        <Input
          value={data.title || ""}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. 30-Day Value Investing Mastery Program"
          className="text-base font-medium"
        />
        {plan && !data.title && (
          <p className="text-[10px] text-secondary flex items-center gap-1">
            <Wand2 className="h-3 w-3" /> Abby will pre-populate from your business plan
          </p>
        )}
      </div>

      {/* Duration */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Program Duration</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => update("duration", d.value)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                data.duration === d.value
                  ? "border-secondary bg-secondary/5"
                  : "border-border hover:border-secondary/30"
              }`}
            >
              <p className="text-sm font-bold">{d.label}</p>
              <p className="text-[10px] text-muted-foreground">{d.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Daily commitment */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Daily Time Commitment</Label>
        <div className="grid grid-cols-4 gap-2">
          {COMMITMENTS.map((c) => (
            <button
              key={c.value}
              onClick={() => update("commitment", c.value)}
              className={`p-3 rounded-lg border-2 text-center transition-colors ${
                data.commitment === c.value
                  ? "border-secondary bg-secondary/5"
                  : "border-border hover:border-secondary/30"
              }`}
            >
              <p className="text-sm font-bold">{c.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Difficulty Level</Label>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => update("level", l.value)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                data.level === l.value
                  ? "border-secondary bg-secondary/5"
                  : "border-border hover:border-secondary/30"
              }`}
            >
              <p className="text-sm font-bold">{l.label}</p>
              <p className="text-[10px] text-muted-foreground">{l.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Format</Label>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              onClick={() => update("format", f.value)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                data.format === f.value
                  ? "border-secondary bg-secondary/5"
                  : "border-border hover:border-secondary/30"
              }`}
            >
              <p className="text-sm font-bold">{f.label}</p>
              <p className="text-[10px] text-muted-foreground">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Pricing</Label>
        <div className="flex items-center gap-3">
          <div className="relative w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              value={data.price || ""}
              onChange={(e) => update("price", e.target.value)}
              className="pl-7"
              placeholder="37"
            />
          </div>
          <span className="text-xs text-muted-foreground">Recommended: $27–$47 for self-paced programs</span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Program Description</Label>
        <Textarea
          value={data.description || ""}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Brief description of what students will achieve..."
          rows={3}
        />
      </div>

      {/* ── Schedule Section ── */}
      <div className="border-t border-border pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-bold">Daily Schedule</h3>
            <p className="text-xs text-muted-foreground">AI generates a day-by-day plan from your manuscript</p>
          </div>
          {days.length > 0 && (
            <Button
              onClick={handleGenerateSchedule}
              size="sm"
              variant="outline"
              disabled={isScheduleGenerating}
              className="rounded-full text-xs"
            >
              <Sparkles className="h-3 w-3 mr-1" /> Regenerate
            </Button>
          )}
        </div>

        <StaleContentBanner
          currentSetup={data}
          generatedSetup={generatedSetup}
          onRegenerate={handleGenerateSchedule}
          isGenerating={isScheduleGenerating}
        />

        {/* Loading state */}
        {isScheduleGenerating && (
          <div className="text-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-secondary mx-auto mb-4" />
            <p className="text-sm font-medium">
              {generationState === "queued" && "Preparing to analyze your manuscript..."}
              {generationState === "analyzing" && "Mapping chapters to daily themes..."}
              {generationState === "generating" && `Building ${duration}-day schedule...`}
            </p>
          </div>
        )}

        {/* Empty state — generate CTA */}
        {days.length === 0 && !isScheduleGenerating && (
          <Card className="p-8 text-center border-dashed">
            <CalendarDays className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <h4 className="font-heading text-sm font-semibold mb-1">Generate Your {duration}-Day Schedule</h4>
            <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
              AI will create a day-by-day plan with weekly themes, reading assignments, exercises, and reflection prompts.
            </p>
            <Button
              onClick={handleGenerateSchedule}
              disabled={!hasRequiredSetup}
              className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <Sparkles className="h-4 w-4 mr-2" /> Generate {duration}-Day Schedule
            </Button>
            {!hasRequiredSetup && (
              <p className="text-[10px] text-muted-foreground mt-2">Fill in title and duration above first</p>
            )}
          </Card>
        )}

        {/* Timeline + Day Editor */}
        {days.length > 0 && !isScheduleGenerating && (
          <>
            <div className="border border-border rounded-lg bg-card">
              <div className="px-3 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Timeline — {days.length} Days · {weeks.length} Weeks
                </p>
                <Badge variant="secondary" className="text-[10px]">
                  {days.filter(d => d.isCatchUp).length} catch-up days
                </Badge>
              </div>
              <ScrollArea className="w-full">
                <div className="p-3 space-y-3">
                  {weeks.map(weekNum => (
                    <div key={weekNum}>
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1.5">
                        Week {weekNum}
                      </p>
                      <div className="flex gap-1.5">
                        {days.filter(d => d.weekNumber === weekNum).map(day => (
                          <button
                            key={day.id}
                            onClick={() => setSelectedDayId(day.id)}
                            className={`shrink-0 w-16 rounded-lg border-2 p-2 text-center transition-all ${
                              day.id === selectedDayId
                                ? "border-secondary bg-secondary/10 shadow-sm"
                                : day.isCatchUp
                                ? "border-dashed border-muted-foreground/20 bg-muted/30 hover:border-secondary/30"
                                : "border-border hover:border-secondary/30"
                            }`}
                          >
                            {day.isCatchUp ? (
                              <Coffee className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-0.5" />
                            ) : (
                              <span className={`text-sm font-bold ${day.id === selectedDayId ? "text-secondary" : ""}`}>
                                {day.dayNumber}
                              </span>
                            )}
                            <p className="text-[8px] text-muted-foreground truncate mt-0.5">
                              {day.isCatchUp ? "Review" : day.chapterRef}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            {selectedDay ? (
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedDay.isCatchUp ? "outline" : "secondary"} className="text-[10px]">
                    {selectedDay.isCatchUp ? "☕ Catch-up Day" : `Day ${selectedDay.dayNumber}`}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">Week {selectedDay.weekNumber}</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Theme</label>
                    <Input value={selectedDay.theme} onChange={(e) => updateDay(selectedDay.id, "theme", e.target.value)} className="font-medium" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Chapter Reference</label>
                    <Input value={selectedDay.chapterRef} onChange={(e) => updateDay(selectedDay.id, "chapterRef", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">📖 Reading Assignment</label>
                    <Input value={selectedDay.reading} onChange={(e) => updateDay(selectedDay.id, "reading", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">🏋️ Exercise</label>
                    <Input value={selectedDay.exercise} onChange={(e) => updateDay(selectedDay.id, "exercise", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">🪞 Reflection Prompt</label>
                    <Input value={selectedDay.reflection} onChange={(e) => updateDay(selectedDay.id, "reflection", e.target.value)} />
                  </div>
                </div>
              </Card>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Click a day above to view and edit its content
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
