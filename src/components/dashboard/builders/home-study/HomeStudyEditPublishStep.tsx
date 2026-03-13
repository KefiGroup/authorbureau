import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Sparkles, Loader2, BookOpen, Wand2, Coffee,
  ChevronLeft, ChevronRight, CalendarDays, Award, CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateJSONWithAI } from "@/lib/ai-generate";
import type { HomeStudyStepProps, StudyDay } from "./types";

export default function HomeStudyEditPublishStep({
  stepData, setStepData, onMarkEdited, bookId, bookTitle,
  generationState, setGenerationState,
}: HomeStudyStepProps) {
  const { toast } = useToast();
  const days: StudyDay[] = stepData.schedule?.days || [];
  const setup = stepData.setup || {};
  const hasAudio = setup.format === "pdf-audio";
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (days.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">No Program Generated Yet</h3>
        <p className="text-sm text-muted-foreground">
          Go back to Program Setup and let Abby generate your home study program first.
        </p>
      </div>
    );
  }

  const currentDay = days[selectedIdx];
  const weeks = Array.from(new Set(days.map(d => d.weekNumber))).sort((a, b) => a - b);

  const updateDay = (field: string, value: any) => {
    setStepData(prev => {
      const prevDays: StudyDay[] = prev.schedule?.days || [];
      const newDays = prevDays.map((d, i) => i === selectedIdx ? { ...d, [field]: value } : d);
      return { ...prev, schedule: { ...prev.schedule, days: newDays } };
    });
    onMarkEdited("edit");
  };

  const updateDayBatch = (fields: Partial<StudyDay>) => {
    setStepData(prev => {
      const prevDays: StudyDay[] = prev.schedule?.days || [];
      const newDays = prevDays.map((d, i) => i === selectedIdx ? { ...d, ...fields } : d);
      return { ...prev, schedule: { ...prev.schedule, days: newDays } };
    });
    onMarkEdited("edit");
  };

  const handleGenerateDay = async () => {
    if (!currentDay) return;
    setGenerationState("queued");
    try {
      setGenerationState("analyzing");
      const commitment = setup.commitment || 15;

      const result = await generateJSONWithAI<{
        concept: string;
        exercise: string;
        reflection: string;
        actionPlan: string;
        audioScript?: string;
      }>(
        `Generate detailed daily content for Day ${currentDay.dayNumber} of a home study program based on the book "${bookTitle}".
Day theme: "${currentDay.theme}"
Chapter reference: "${currentDay.chapterRef}"
Daily commitment: ${commitment} minutes
${currentDay.isCatchUp ? "This is a catch-up/review day." : ""}

Return a JSON object with:
- "concept": string (markdown, 200-300 words, with sections: Core Idea, Why This Matters, Today's Focus)
- "exercise": string (markdown, practical exercise with numbered steps, ${commitment} minutes)
- "reflection": string (markdown, evening journal prompts, 4 questions)
- "actionPlan": string (markdown, 3-5 concrete action items using "- [ ]" checkbox syntax)
${hasAudio ? '- "audioScript": string (narration script with [INTRO MUSIC], [PAUSE], [OUTRO] markers, 200 words)' : ""}

Make content specific to the book topic and day theme. Return ONLY valid JSON.`,
        { bookId, isPremium: true },
      );

      setGenerationState("generating");

      const batch: Partial<StudyDay> = {
        concept: result.concept,
        exercise: result.exercise,
        reflection: result.reflection,
        actionPlan: result.actionPlan,
      };
      if (hasAudio && result.audioScript) batch.audioScript = result.audioScript;
      updateDayBatch(batch);

      setGenerationState("complete");
      toast({ title: "Day content generated!", description: `Day ${currentDay.dayNumber} is ready.` });
    } catch (err) {
      console.error(err);
      setGenerationState("error");
      toast({ title: "Generation failed", variant: "destructive" });
    }
  };

  const isGenerating = generationState !== "idle" && generationState !== "complete" && generationState !== "error";

  return (
    <div className="space-y-5">
      {/* Program summary */}
      <Card className="p-4 bg-muted/30 border-border/60">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="secondary" className="text-[10px]">
            <CalendarDays className="h-2.5 w-2.5 mr-1" />
            {days.length} Days
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {weeks.length} Weeks
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {setup.commitment || 15} min/day
          </Badge>
          {setup.price && (
            <Badge variant="outline" className="text-[10px]">
              ${setup.price}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">
            {days.filter(d => d.concept || d.exercise || d.reflection).length}/{days.length} days have content
          </span>
        </div>
      </Card>

      {/* Week/Day navigator */}
      <div className="border border-border rounded-lg bg-card">
        <ScrollArea className="w-full">
          <div className="p-3 space-y-2.5">
            {weeks.map(weekNum => (
              <div key={weekNum}>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">
                  Week {weekNum}
                </p>
                <div className="flex gap-1.5">
                  {days.map((day, globalIdx) => {
                    if (day.weekNumber !== weekNum) return null;
                    const hasContent = Boolean(day.concept || day.exercise || day.reflection);
                    return (
                      <button
                        key={day.id}
                        onClick={() => setSelectedIdx(globalIdx)}
                        className={`shrink-0 w-14 rounded-lg border-2 p-1.5 text-center transition-all ${
                          globalIdx === selectedIdx
                            ? "border-secondary bg-secondary/10 shadow-sm"
                            : day.isCatchUp
                            ? "border-dashed border-muted-foreground/20 bg-muted/30 hover:border-secondary/30"
                            : hasContent
                            ? "border-accent/30 bg-accent/5 hover:border-secondary/30"
                            : "border-border hover:border-secondary/30"
                        }`}
                      >
                        {day.isCatchUp ? (
                          <Coffee className="h-3 w-3 text-muted-foreground mx-auto" />
                        ) : (
                          <span className={`text-xs font-bold ${globalIdx === selectedIdx ? "text-secondary" : hasContent ? "text-accent" : ""}`}>
                            {day.dayNumber}
                          </span>
                        )}
                        <p className="text-[7px] text-muted-foreground truncate mt-0.5">
                          {day.isCatchUp ? "Review" : day.chapterRef?.slice(0, 8) || day.theme?.slice(0, 8)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Day header & generate */}
      {currentDay && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={selectedIdx === 0}
                onClick={() => setSelectedIdx(selectedIdx - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-[10px] text-muted-foreground">
                  Week {currentDay.weekNumber} · {currentDay.chapterRef}
                </p>
                <h3 className="font-heading text-base font-bold">
                  Day {currentDay.dayNumber}: {currentDay.theme}
                </h3>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={selectedIdx === days.length - 1}
                onClick={() => setSelectedIdx(selectedIdx + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {!currentDay.concept && !isGenerating && (
              <Button onClick={handleGenerateDay} size="sm"
                className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Generate Content
              </Button>
            )}
          </div>

          {/* Day metadata (editable) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Theme</label>
              <Input value={currentDay.theme} onChange={e => updateDay("theme", e.target.value)} className="text-sm h-8" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Chapter Ref</label>
              <Input value={currentDay.chapterRef} onChange={e => updateDay("chapterRef", e.target.value)} className="text-sm h-8" />
            </div>
          </div>

          {/* Loading state */}
          {isGenerating ? (
            <div className="text-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-secondary mx-auto mb-3" />
              <p className="text-sm font-medium">
                {generationState === "queued" && "Preparing content..."}
                {generationState === "analyzing" && `Analyzing chapter for Day ${currentDay.dayNumber}...`}
                {generationState === "generating" && "Writing content..."}
              </p>
            </div>
          ) : (
            /* Content tabs */
            <Tabs defaultValue="concept" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="concept" className="text-xs">📖 Reading</TabsTrigger>
                <TabsTrigger value="exercise" className="text-xs">🏋️ Exercise</TabsTrigger>
                <TabsTrigger value="reflection" className="text-xs">🪞 Reflection</TabsTrigger>
                <TabsTrigger value="actionPlan" className="text-xs">🎯 Action Plan</TabsTrigger>
                {hasAudio && <TabsTrigger value="audio" className="text-xs">🎙️ Audio</TabsTrigger>}
              </TabsList>

              <TabsContent value="concept">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground">Key Concept (200-300 words)</p>
                    {currentDay.concept && (
                      <Badge variant="outline" className="text-[9px]"><Wand2 className="h-2 w-2 mr-0.5" /> AI</Badge>
                    )}
                  </div>
                  <Textarea
                    value={currentDay.concept || ""}
                    onChange={e => updateDay("concept", e.target.value)}
                    placeholder="Key concept explanation..."
                    rows={10} className="font-mono text-sm"
                  />
                </Card>
              </TabsContent>

              <TabsContent value="exercise">
                <Card className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Practical Exercise</p>
                  <Textarea
                    value={currentDay.exercise || ""}
                    onChange={e => updateDay("exercise", e.target.value)}
                    placeholder="Step-by-step exercise..."
                    rows={8} className="font-mono text-sm"
                  />
                </Card>
              </TabsContent>

              <TabsContent value="reflection">
                <Card className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Reflection Journal Prompt</p>
                  <Textarea
                    value={currentDay.reflection || ""}
                    onChange={e => updateDay("reflection", e.target.value)}
                    placeholder="Journal prompts..."
                    rows={6} className="font-mono text-sm"
                  />
                </Card>
              </TabsContent>

              <TabsContent value="actionPlan">
                <Card className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Action Plan (Today's Tasks)</p>
                  <Textarea
                    value={currentDay.actionPlan || ""}
                    onChange={e => updateDay("actionPlan", e.target.value)}
                    placeholder="Concrete action items..."
                    rows={6} className="font-mono text-sm"
                  />
                </Card>
              </TabsContent>

              {hasAudio && (
                <TabsContent value="audio">
                  <Card className="p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Audio Narration Script</p>
                    <Textarea
                      value={currentDay.audioScript || ""}
                      onChange={e => updateDay("audioScript", e.target.value)}
                      placeholder="Audio narration script..."
                      rows={10} className="font-mono text-sm"
                    />
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          )}
        </>
      )}

      {/* Completion summary */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-bold text-secondary mb-1">Ready to Publish?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your <strong>{days.length}-day</strong> study program has{" "}
              <strong>{days.filter(d => d.concept || d.exercise || d.reflection).length}</strong> days with content.
              {setup.price && ` Priced at $${setup.price}.`}
              {" "}Click <strong>Publish</strong> in the bottom bar when you're ready to go live.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
