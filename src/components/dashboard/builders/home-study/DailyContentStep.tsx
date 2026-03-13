import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Loader2, BookOpen, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateJSONWithAI } from "@/lib/ai-generate";
import type { HomeStudyStepProps, StudyDay } from "./types";
import StaleContentBanner from "./StaleContentBanner";

export default function DailyContentStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, generationState, setGenerationState }: HomeStudyStepProps) {
  const { toast } = useToast();
  const days: StudyDay[] = stepData.schedule?.days || [];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const hasAudio = stepData.setup?.format === "pdf-audio";

  if (days.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">Generate Your Schedule First</h3>
        <p className="text-sm text-muted-foreground">Go back to Program Setup and generate your daily schedule before adding detailed content.</p>
      </div>
    );
  }

  const currentDay = days[selectedIdx];

  const updateDay = (field: string, value: any) => {
    setStepData(prev => {
      const prevDays: StudyDay[] = prev.schedule?.days || [];
      const newDays = prevDays.map((d, i) => i === selectedIdx ? { ...d, [field]: value } : d);
      return { ...prev, schedule: { ...prev.schedule, days: newDays } };
    });
    onMarkEdited("content");
  };

  const updateDayBatch = (fields: Partial<StudyDay>) => {
    setStepData(prev => {
      const prevDays: StudyDay[] = prev.schedule?.days || [];
      const newDays = prevDays.map((d, i) => i === selectedIdx ? { ...d, ...fields } : d);
      return { ...prev, schedule: { ...prev.schedule, days: newDays } };
    });
    onMarkEdited("content");
  };

  const handleGenerate = async () => {
    setGenerationState("queued");
    try {
      setGenerationState("analyzing");

      const commitment = stepData.setup?.commitment || 15;

      const result = await generateJSONWithAI<{
        concept: string;
        exercise: string;
        reflection: string;
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
${hasAudio ? '- "audioScript": string (narration script with [INTRO MUSIC], [PAUSE], [OUTRO] markers, 200 words)' : ""}

Make content specific to the book topic and day theme. Return ONLY valid JSON.`,
        { bookId, isPremium: true }
      );

      setGenerationState("generating");

      updateDay("concept", result.concept);
      updateDay("exercise", result.exercise);
      updateDay("reflection", result.reflection);
      if (hasAudio && result.audioScript) {
        updateDay("audioScript", result.audioScript);
      }

      setGenerationState("complete");
      toast({ title: "Day content generated!", description: `Content for Day ${currentDay.dayNumber} is ready.` });
    } catch (err) {
      console.error(err);
      setGenerationState("error");
      toast({ title: "Generation failed", variant: "destructive" });
    }
  };

  const generatedSetup = stepData.schedule?._generatedFromSetup;

  return (
    <div className="space-y-4">
      <StaleContentBanner
        currentSetup={stepData.setup || {}}
        generatedSetup={generatedSetup}
      />
      {/* Day selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {days.map((day, i) => (
          <button
            key={day.id}
            onClick={() => setSelectedIdx(i)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
              i === selectedIdx
                ? "bg-secondary text-secondary-foreground"
                : day.concept
                ? "bg-accent/10 text-accent"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {day.isCatchUp ? `☕${day.dayNumber}` : `D${day.dayNumber}`}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Week {currentDay.weekNumber} · {currentDay.chapterRef}</p>
          <h3 className="font-heading text-lg font-bold">Day {currentDay.dayNumber}: {currentDay.theme}</h3>
        </div>
        {!currentDay.concept && (
          <Button onClick={handleGenerate} size="sm" className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Generate Content
          </Button>
        )}
      </div>

      {generationState !== "idle" && generationState !== "complete" && generationState !== "error" ? (
        <div className="text-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-secondary mx-auto mb-4" />
          <p className="text-sm font-medium">
            {generationState === "queued" && "Preparing content..."}
            {generationState === "analyzing" && `Analyzing chapter for Day ${currentDay.dayNumber}...`}
            {generationState === "generating" && "Writing readings, exercises, and reflections..."}
          </p>
        </div>
      ) : (
        <Tabs defaultValue="concept" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="concept" className="text-xs">📖 Reading</TabsTrigger>
            <TabsTrigger value="exercise" className="text-xs">🏋️ Exercise</TabsTrigger>
            <TabsTrigger value="reflection" className="text-xs">🪞 Reflection</TabsTrigger>
            {hasAudio && <TabsTrigger value="audio" className="text-xs">🎙️ Audio Script</TabsTrigger>}
          </TabsList>

          <TabsContent value="concept">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground">Key Concept (200-300 words)</p>
                {currentDay.concept && (
                  <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600">
                    <Wand2 className="h-2.5 w-2.5 mr-1" /> AI Generated
                  </Badge>
                )}
              </div>
              <Textarea
                value={currentDay.concept || ""}
                onChange={(e) => updateDay("concept", e.target.value)}
                placeholder="Key concept explanation for this day..."
                rows={12}
                className="font-mono text-sm"
              />
            </Card>
          </TabsContent>

          <TabsContent value="exercise">
            <Card className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Practical Exercise</p>
              <Textarea
                value={currentDay.exercise || ""}
                onChange={(e) => updateDay("exercise", e.target.value)}
                placeholder="Step-by-step exercise instructions..."
                rows={10}
                className="font-mono text-sm"
              />
            </Card>
          </TabsContent>

          <TabsContent value="reflection">
            <Card className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Reflection Journal Prompt</p>
              <Textarea
                value={currentDay.reflection || ""}
                onChange={(e) => updateDay("reflection", e.target.value)}
                placeholder="Journal prompts and reflection questions..."
                rows={8}
                className="font-mono text-sm"
              />
            </Card>
          </TabsContent>

          {hasAudio && (
            <TabsContent value="audio">
              <Card className="p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Audio Prompt Script</p>
                <Textarea
                  value={currentDay.audioScript || ""}
                  onChange={(e) => updateDay("audioScript", e.target.value)}
                  placeholder="Audio narration script for this day..."
                  rows={12}
                  className="font-mono text-sm"
                />
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
