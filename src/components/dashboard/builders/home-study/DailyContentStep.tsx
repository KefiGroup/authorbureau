import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Loader2, BookOpen, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { HomeStudyStepProps, StudyDay } from "./types";

export default function DailyContentStep({ stepData, setStepData, onMarkEdited, bookTitle, generationState, setGenerationState }: HomeStudyStepProps) {
  const { toast } = useToast();
  const days: StudyDay[] = stepData.schedule?.days || [];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const hasAudio = stepData.setup?.format === "pdf-audio";

  if (days.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">Complete Step 2 First</h3>
        <p className="text-sm text-muted-foreground">Generate your daily schedule before adding detailed content.</p>
      </div>
    );
  }

  const currentDay = days[selectedIdx];

  const updateDay = (field: string, value: any) => {
    const newDays = days.map((d, i) => i === selectedIdx ? { ...d, [field]: value } : d);
    setStepData(prev => ({ ...prev, schedule: { ...prev.schedule, days: newDays } }));
    onMarkEdited("content");
  };

  const handleGenerate = () => {
    setGenerationState("queued");
    setTimeout(() => setGenerationState("analyzing"), 1500);
    setTimeout(() => setGenerationState("generating"), 4000);
    setTimeout(() => {
      updateDay("concept", `## Day ${currentDay.dayNumber}: ${currentDay.theme}\n\nToday we explore a foundational concept from "${bookTitle}" that will shift how you approach this topic.\n\n### The Core Idea\n\nThe author explains that the key to mastery lies in understanding the underlying principles rather than memorizing techniques. When you grasp the "why," the "how" becomes intuitive.\n\n### Why This Matters\n\nMost people skip this foundational step and jump straight to action. But without understanding the principle behind the practice, results are inconsistent and short-lived.\n\n### Today's Focus\n\nAs you read today's assignment, pay attention to the specific examples the author uses. Notice how each example reinforces the central principle.`);
      updateDay("exercise", `### Today's Exercise (${stepData.setup?.commitment || 15} minutes)\n\n**Step 1:** Review today's reading and highlight the 3 most important sentences.\n\n**Step 2:** In your own words, explain the core concept to an imaginary friend in 2-3 sentences.\n\n**Step 3:** Identify one area in your life where this concept applies right now.\n\n**Step 4:** Write down one specific action you'll take today based on this concept.\n\n**Bonus:** Share your insight in the community forum for feedback.`);
      updateDay("reflection", `### Evening Reflection 🪞\n\nTake 5 minutes before bed to answer these questions:\n\n1. **What surprised me most** about today's reading?\n2. **What resistance** did I notice in myself?\n3. **What's one thing** I'll do differently tomorrow based on today's lesson?\n4. **Rate my engagement** today: 1-5 ⭐\n\n_Remember: honest reflection accelerates growth._`);
      if (hasAudio) {
        updateDay("audioScript", `[INTRO MUSIC - 3 seconds]\n\nGood morning! Welcome to Day ${currentDay.dayNumber} of your study program.\n\nToday's theme is "${currentDay.theme}" — and I'm excited about this one because it's where everything starts to click.\n\nBefore we dive in, take a deep breath. Set your intention for today's learning.\n\n[PAUSE - 3 seconds]\n\nNow, open your book to ${currentDay.chapterRef} and let's begin...\n\n[READING GUIDANCE - 5 minutes]\n\n[OUTRO]\nGreat work today. Complete your exercise and reflection in your study guide, and I'll see you tomorrow for Day ${currentDay.dayNumber + 1}.\n\n[OUTRO MUSIC - 3 seconds]`);
      }
      setGenerationState("complete");
      toast({ title: "Day content generated!", description: `Content for Day ${currentDay.dayNumber} is ready.` });
    }, 6000);
  };

  return (
    <div className="space-y-4">
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
