import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Loader2, BookOpen, Wand2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateJSONWithAI } from "@/lib/ai-generate";
import type { CourseStepProps, CourseModule, CourseQuiz } from "./types";

export default function LessonContentStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, generationState, setGenerationState }: CourseStepProps) {
  const { toast } = useToast();
  const modules: CourseModule[] = stepData.curriculum?.modules || [];
  const [selectedModIdx, setSelectedModIdx] = useState(0);
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0);

  if (modules.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">Complete Step 2 First</h3>
        <p className="text-sm text-muted-foreground">Generate your curriculum in the previous step before adding lesson content.</p>
      </div>
    );
  }

  const currentModule = modules[selectedModIdx];
  const currentLesson = currentModule?.lessons?.[selectedLessonIdx];

  const updateLesson = (field: string, value: any) => {
    if (!currentModule || !currentLesson) return;
    const newModules = modules.map((m, mi) =>
      mi === selectedModIdx
        ? { ...m, lessons: (m.lessons || []).map((l, li) => li === selectedLessonIdx ? { ...l, [field]: value } : l) }
        : m
    );
    setStepData(prev => ({
      ...prev,
      curriculum: { ...prev.curriculum, modules: newModules },
    }));
    onMarkEdited("content");
  };

  const addQuiz = () => {
    const quizzes = currentLesson?.quiz || [];
    updateLesson("quiz", [...quizzes, { question: "", options: ["", "", "", ""], correctAnswer: 0, explanation: "" }]);
  };

  const updateQuiz = (idx: number, field: string, value: any) => {
    const quizzes = [...(currentLesson?.quiz || [])];
    quizzes[idx] = { ...quizzes[idx], [field]: value };
    updateLesson("quiz", quizzes);
  };

  const removeQuiz = (idx: number) => {
    updateLesson("quiz", (currentLesson?.quiz || []).filter((_: any, i: number) => i !== idx));
  };

  const handleGenerateContent = async () => {
    setGenerationState("queued");
    try {
      setGenerationState("analyzing");

      const result = await generateJSONWithAI(
        `Generate lesson content for a course lesson titled "${currentLesson?.title}" in module "${currentModule?.title}" from the book "${bookTitle}".

Return a JSON object with:
- "script": string (markdown lesson script, 400-600 words, with sections for Key Concepts, Practical Application, and Summary)
- "summary": string[] (4 key takeaway bullet points)
- "exercise": string (a practical exercise, 100-150 words with numbered steps)
- "quiz": array of 3 objects each with {"question": string, "options": string[] (4 options), "correctAnswer": number (0-3), "explanation": string}

Make the content specific to the lesson topic, not generic.
Return ONLY valid JSON, no markdown fences.`,
        { bookId, isPremium: true }
      );

      setGenerationState("generating");

      updateLesson("script", result.script);
      updateLesson("summary", result.summary);
      updateLesson("exercise", result.exercise);
      updateLesson("quiz", result.quiz);

      setGenerationState("complete");
      toast({ title: "Lesson content generated!", description: "Review the script, exercises, and quiz below." });
    } catch (err) {
      console.error(err);
      setGenerationState("error");
      toast({ title: "Generation failed", variant: "destructive" });
    }
  };

  if (generationState !== "idle" && generationState !== "complete" && generationState !== "error") {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-secondary mx-auto mb-4" />
        <p className="text-sm font-medium">
          {generationState === "queued" && "Preparing to generate lesson content..."}
          {generationState === "analyzing" && `Analyzing chapter content for "${currentLesson?.title}"...`}
          {generationState === "generating" && "Writing script, exercises, and quiz questions..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Lesson selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {modules.map((mod, mi) => (
          <div key={mod.id} className="flex gap-1">
            {(mod.lessons || []).map((lesson, li) => (
              <button
                key={lesson.id}
                onClick={() => { setSelectedModIdx(mi); setSelectedLessonIdx(li); }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
                  mi === selectedModIdx && li === selectedLessonIdx
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                M{mi + 1}.L{li + 1}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{currentModule?.title}</p>
          <h3 className="font-heading text-lg font-bold">{currentLesson?.title}</h3>
        </div>
        {!currentLesson?.script && (
          <Button
            onClick={handleGenerateContent}
            size="sm"
            className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Generate Content
          </Button>
        )}
      </div>

      {/* Tabbed editor */}
      <Tabs defaultValue="script" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="script" className="text-xs">Script</TabsTrigger>
          <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
          <TabsTrigger value="exercise" className="text-xs">Exercise</TabsTrigger>
          <TabsTrigger value="quiz" className="text-xs">Quiz ({currentLesson?.quiz?.length || 0})</TabsTrigger>
          <TabsTrigger value="resources" className="text-xs">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="script">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground">Lesson Script</p>
              {currentLesson?.script && (
                <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600">
                  <Wand2 className="h-2.5 w-2.5 mr-1" /> AI Generated
                </Badge>
              )}
            </div>
            <Textarea
              value={currentLesson?.script || ""}
              onChange={(e) => updateLesson("script", e.target.value)}
              placeholder="The lesson script — what the student reads or you narrate in video. Click 'Generate Content' to auto-create."
              rows={16}
              className="font-mono text-sm"
            />
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Key Points (3-5 bullet points)</p>
            {(currentLesson?.summary || [""]).map((point: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                <Input
                  value={point}
                  onChange={(e) => {
                    const newSummary = [...(currentLesson?.summary || [])];
                    newSummary[i] = e.target.value;
                    updateLesson("summary", newSummary);
                  }}
                  placeholder="Key takeaway..."
                  className="text-sm"
                />
                <button onClick={() => updateLesson("summary", (currentLesson?.summary || []).filter((_: any, j: number) => j !== i))}>
                  <Trash2 className="h-3 w-3 text-destructive/50" />
                </button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => updateLesson("summary", [...(currentLesson?.summary || []), ""])} className="text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Point
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="exercise">
          <Card className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Exercise / Action Item</p>
            <Textarea
              value={currentLesson?.exercise || ""}
              onChange={(e) => updateLesson("exercise", e.target.value)}
              placeholder="A practical exercise for the student to apply what they learned..."
              rows={8}
            />
          </Card>
        </TabsContent>

        <TabsContent value="quiz">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">Quiz Questions</p>
              <Button variant="outline" size="sm" onClick={addQuiz} className="text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add Question
              </Button>
            </div>
            {(currentLesson?.quiz || []).map((q: CourseQuiz, qi: number) => (
              <div key={qi} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <Badge variant="secondary" className="text-[10px]">Q{qi + 1}</Badge>
                  <button onClick={() => removeQuiz(qi)}><Trash2 className="h-3 w-3 text-destructive/50" /></button>
                </div>
                <Input
                  value={q.question}
                  onChange={(e) => updateQuiz(qi, "question", e.target.value)}
                  placeholder="Question..."
                  className="font-medium"
                />
                <div className="space-y-1.5">
                  {q.options.map((opt: string, oi: number) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuiz(qi, "correctAnswer", oi)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          q.correctAnswer === oi ? "border-accent bg-accent text-accent-foreground" : "border-muted-foreground/30"
                        }`}
                      >
                        {q.correctAnswer === oi && <span className="text-[8px]">✓</span>}
                      </button>
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...q.options];
                          newOpts[oi] = e.target.value;
                          updateQuiz(qi, "options", newOpts);
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
                <Input
                  value={q.explanation}
                  onChange={(e) => updateQuiz(qi, "explanation", e.target.value)}
                  placeholder="Explanation (shown after answer)"
                  className="text-xs"
                />
              </div>
            ))}
            {(!currentLesson?.quiz || currentLesson.quiz.length === 0) && (
              <p className="text-center text-xs text-muted-foreground py-4">
                No quiz questions yet. Click "Add Question" or generate content with AI.
              </p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <Card className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Downloadable Resources</p>
            {(currentLesson?.resources || [""]).map((res: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={res}
                  onChange={(e) => {
                    const newRes = [...(currentLesson?.resources || [])];
                    newRes[i] = e.target.value;
                    updateLesson("resources", newRes);
                  }}
                  placeholder="Resource name or URL..."
                  className="text-sm"
                />
                <button onClick={() => updateLesson("resources", (currentLesson?.resources || []).filter((_: any, j: number) => j !== i))}>
                  <Trash2 className="h-3 w-3 text-destructive/50" />
                </button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => updateLesson("resources", [...(currentLesson?.resources || []), ""])} className="text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Resource
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
