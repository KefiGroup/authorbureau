import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Sparkles, Loader2, BookOpen, CalendarDays, ChevronRight,
  Coffee, Wand2, GripVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateJSONWithAI } from "@/lib/ai-generate";
import type { HomeStudyStepProps, StudyDay } from "./types";
import StaleContentBanner from "./StaleContentBanner";

function generateId() { return crypto.randomUUID(); }

function normalizeSchedulePayload(payload: any): Array<{
  dayNumber: number;
  weekNumber: number;
  theme: string;
  chapterRef: string;
  reading: string;
  exercise: string;
  reflection: string;
  isCatchUp: boolean;
}> {
  const rawDays = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.days)
    ? payload.days
    : Array.isArray(payload?.daily_schedule)
    ? payload.daily_schedule
    : [];

  return rawDays.map((d: any, idx: number) => ({
    dayNumber: Number(d?.dayNumber ?? idx + 1),
    weekNumber: Number(d?.weekNumber ?? Math.floor(idx / 7) + 1),
    theme: String(d?.theme ?? ""),
    chapterRef: String(d?.chapterRef ?? ""),
    reading: String(d?.reading ?? ""),
    exercise: String(d?.exercise ?? ""),
    reflection: String(d?.reflection ?? ""),
    isCatchUp: Boolean(d?.isCatchUp ?? ((idx + 1) % 7 === 0)),
  }));
}

export default function DailyScheduleStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, generationState, setGenerationState }: HomeStudyStepProps) {
  const { toast } = useToast();
  const setup = stepData.setup || {};
  const duration = setup.duration || 30;
  const days: StudyDay[] = stepData.schedule?.days || [];
  const generatedSetup = stepData.schedule?._generatedFromSetup;
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  // Reset stuck generation state on mount (e.g. if user navigated away mid-generation)
  useEffect(() => {
    const isStuck = generationState !== "idle" && generationState !== "complete" && generationState !== "error";
    if (isStuck && days.length === 0) {
      setGenerationState("idle");
    }
  }, []);

  const updateDays = (newDays: StudyDay[]) => {
    setStepData(prev => ({ ...prev, schedule: { ...prev.schedule, days: newDays } }));
    onMarkEdited("schedule");
  };

  const updateDay = (dayId: string, field: string, value: any) => {
    updateDays(days.map(d => d.id === dayId ? { ...d, [field]: value } : d));
  };

  const handleGenerate = async () => {
    setGenerationState("queued");
    try {
      setGenerationState("analyzing");

      const basePrompt = `Generate a ${duration}-day home study schedule for the book "${bookTitle}".
Organize into weeks of 7 days. Day 7 of each week should be a catch-up/review day.

Each day needs a specific theme, chapter reference from the book, reading assignment, exercise, and reflection prompt.
Make weekly themes progress from Awareness → Skills → Practice → Integration → Mastery.

Return a JSON array of ${duration} objects, each with:
- "dayNumber": number
- "weekNumber": number
- "theme": string
- "chapterRef": string
- "reading": string
- "exercise": string
- "reflection": string
- "isCatchUp": boolean

Return ONLY valid JSON.`;

      const opts = {
        bookId,
        isPremium: true,
        builderMode: true,
        builderId: "home-study-course",
        builderLabel: "Home Study Course",
        builderStep: "Daily Schedule",
      } as const;

      let parsedDays = normalizeSchedulePayload(await generateJSONWithAI<any>(basePrompt, opts));

      if (parsedDays.length === 0) {
        parsedDays = normalizeSchedulePayload(
          await generateJSONWithAI<any>(
            `${basePrompt}\n\nSTRICT FORMAT: Start response with [ and end with ]. Do not include any prose, heading, or markdown.`,
            opts,
          ),
        );
      }

      if (parsedDays.length === 0) {
        throw new Error("No schedule data returned. Please retry.");
      }

      setGenerationState("generating");

      const generated: StudyDay[] = parsedDays.slice(0, duration).map((d, idx) => ({
        id: generateId(),
        dayNumber: d.dayNumber || idx + 1,
        weekNumber: d.weekNumber || Math.floor(idx / 7) + 1,
        theme: d.theme,
        chapterRef: d.chapterRef,
        reading: d.reading,
        concept: "",
        exercise: d.exercise,
        reflection: d.reflection,
        audioScript: undefined,
        isCatchUp: d.isCatchUp,
      }));

      if (generated.length === 0) {
        throw new Error("Generated schedule was empty.");
      }

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
    } catch (err: any) {
      console.error(err);
      setGenerationState("error");
      toast({ title: "Generation failed", description: err?.message || "Please try again.", variant: "destructive" });
    }
  };

  if (days.length === 0 && (generationState === "idle" || generationState === "complete" || generationState === "error")) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">Generate Your {duration}-Day Schedule</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          AI will create a day-by-day plan with weekly themes, reading assignments, exercises, and reflection prompts.
        </p>
        <Button onClick={handleGenerate} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Sparkles className="h-4 w-4 mr-2" /> Generate {duration}-Day Schedule
        </Button>
      </div>
    );
  }

  if (generationState !== "idle" && generationState !== "complete" && generationState !== "error") {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-secondary mx-auto mb-4" />
        <p className="text-sm font-medium">
          {generationState === "queued" && "Preparing to analyze your manuscript..."}
          {generationState === "analyzing" && "Mapping chapters to daily themes..."}
          {generationState === "generating" && `Building ${duration}-day schedule...`}
        </p>
      </div>
    );
  }

  const weeks = Array.from(new Set(days.map(d => d.weekNumber))).sort((a, b) => a - b);
  const selectedDay = days.find(d => d.id === selectedDayId);

  return (
    <div className="space-y-4">
      <StaleContentBanner
        currentSetup={setup}
        generatedSetup={generatedSetup}
        onRegenerate={handleGenerate}
        isGenerating={generationState !== "idle" && generationState !== "complete" && generationState !== "error"}
      />
      {/* Horizontal timeline */}
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

      {/* Selected day editor */}
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
              <Input
                value={selectedDay.theme}
                onChange={(e) => updateDay(selectedDay.id, "theme", e.target.value)}
                className="font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Chapter Reference</label>
              <Input
                value={selectedDay.chapterRef}
                onChange={(e) => updateDay(selectedDay.id, "chapterRef", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">📖 Reading Assignment</label>
              <Input
                value={selectedDay.reading}
                onChange={(e) => updateDay(selectedDay.id, "reading", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">🏋️ Exercise</label>
              <Input
                value={selectedDay.exercise}
                onChange={(e) => updateDay(selectedDay.id, "exercise", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">🪞 Reflection Prompt</label>
              <Input
                value={selectedDay.reflection}
                onChange={(e) => updateDay(selectedDay.id, "reflection", e.target.value)}
              />
            </div>
          </div>
        </Card>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Click a day above to view and edit its content
        </div>
      )}
    </div>
  );
}
