import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Loader2, BookOpen, Wand2, Plus, Trash2, RotateCcw, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateJSONWithAI } from "@/lib/ai-generate";
import type { CourseStepProps, CourseModule, CourseQuiz, CourseLesson, CourseResource } from "./types";

interface GeneratedLessonContent {
  script?: string;
  summary?: string[];
  exercise?: string;
  quiz?: Array<{
    question?: string;
    options?: string[];
    correctAnswer?: number;
    explanation?: string;
  }>;
  resources?: Array<{ title?: string; url?: string } | string>;
}

export default function LessonContentStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, generationState, setGenerationState }: CourseStepProps) {
  const { toast } = useToast();
  const modules: CourseModule[] = stepData.curriculum?.modules || [];
  const [selectedModIdx, setSelectedModIdx] = useState(0);
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0);
  const [lastGenerated, setLastGenerated] = useState<Record<string, any>>({});

  const getModuleLessonsForDisplay = (mod: CourseModule): CourseLesson[] => {
    if (Array.isArray(mod.lessons) && mod.lessons.length > 0) return mod.lessons;
    return [{
      id: `${mod.id}-lesson-1`,
      title: `${mod.title || "Module"} — Lesson 1`,
      description: "",
      keyTakeaway: "",
      estimatedMinutes: 15,
      position: 0,
      summary: [],
      quiz: [],
      resources: [],
    }];
  };

  useEffect(() => {
    if (selectedModIdx > modules.length - 1) {
      setSelectedModIdx(Math.max(0, modules.length - 1));
      setSelectedLessonIdx(0);
    }
  }, [modules.length, selectedModIdx]);

  useEffect(() => {
    const current = modules[selectedModIdx];
    if (!current) return;
    const lessonCount = getModuleLessonsForDisplay(current).length;
    if (selectedLessonIdx > lessonCount - 1) {
      setSelectedLessonIdx(0);
    }
  }, [modules, selectedModIdx, selectedLessonIdx]);

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
  const currentModuleLessons = currentModule ? getModuleLessonsForDisplay(currentModule) : [];
  const activeLessonIdx = Math.min(selectedLessonIdx, Math.max(0, currentModuleLessons.length - 1));
  const currentLesson = currentModuleLessons[activeLessonIdx];
  const isLastModule = selectedModIdx === modules.length - 1;

  const buildFallbackLesson = (moduleTitle: string, lessonIndex: number) => ({
    id: crypto.randomUUID(),
    title: `${moduleTitle || "Module"} — Lesson ${lessonIndex + 1}`,
    description: "",
    keyTakeaway: "",
    estimatedMinutes: 15,
    position: lessonIndex,
    summary: [] as string[],
    quiz: [] as CourseQuiz[],
    resources: [] as string[],
  });

  const upsertLessonField = (moduleIndex: number, lessonIndex: number, field: string, value: any) => {
    setStepData((prev) => {
      const prevModules: CourseModule[] = Array.isArray(prev.curriculum?.modules) ? prev.curriculum.modules : [];
      const nextModules = prevModules.map((mod, mi) => {
        if (mi !== moduleIndex) return mod;

        const lessons = Array.isArray(mod.lessons) ? [...mod.lessons] : [];
        while (lessons.length <= lessonIndex) {
          lessons.push(buildFallbackLesson(mod.title || `Module ${mi + 1}`, lessons.length) as any);
        }

        const existingLesson = lessons[lessonIndex] as any;
        lessons[lessonIndex] = {
          ...existingLesson,
          [field]: value,
          position: Number(existingLesson?.position ?? lessonIndex),
        };

        return { ...mod, lessons };
      });

      return {
        ...prev,
        curriculum: { ...prev.curriculum, modules: nextModules },
      };
    });
    onMarkEdited("content");
  };

  const ensureSelectedLesson = () => {
    if (!currentModule) return null;

    const lessons = Array.isArray(currentModule.lessons) ? currentModule.lessons : [];
    const existingLesson = lessons[selectedLessonIdx];
    if (existingLesson) {
      return { lesson: existingLesson, lessonIndex: selectedLessonIdx };
    }

    const lessonIndex = lessons.length;
    const fallbackLesson = buildFallbackLesson(currentModule.title || `Module ${selectedModIdx + 1}`, lessonIndex);

    setStepData((prev) => {
      const prevModules: CourseModule[] = Array.isArray(prev.curriculum?.modules) ? prev.curriculum.modules : [];
      const nextModules = prevModules.map((mod, mi) => {
        if (mi !== selectedModIdx) return mod;
        const existing = Array.isArray(mod.lessons) ? mod.lessons : [];
        return { ...mod, lessons: [...existing, fallbackLesson as any] };
      });

      return {
        ...prev,
        curriculum: { ...prev.curriculum, modules: nextModules },
      };
    });

    setSelectedLessonIdx(lessonIndex);
    onMarkEdited("content");

    return { lesson: fallbackLesson, lessonIndex };
  };

  const updateLesson = (field: string, value: any) => {
    const ensured = ensureSelectedLesson();
    if (!ensured) return;
    upsertLessonField(selectedModIdx, ensured.lessonIndex, field, value);
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

  const normalizeResourcesInput = (value: unknown): CourseResource[] => {
    if (!value) return [];

    const items = Array.isArray(value) ? value : typeof value === "string"
      ? value.split(/\n|;/).map(s => s.trim()).filter(Boolean)
      : [];

    return items
      .map((item): CourseResource | null => {
        if (typeof item === "string") {
          const urlMatch = item.match(/https?:\/\/[^\s)]+/);
          if (urlMatch) {
            const title = item.replace(urlMatch[0], "").replace(/[-–—:|]+/g, " ").trim() || urlMatch[0];
            return { title, url: urlMatch[0] };
          }
          return { title: item.trim(), url: "" };
        }
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          return {
            title: String(record.title || record.name || record.label || "").trim(),
            url: String(record.url || record.link || record.href || "").trim(),
          };
        }
        return null;
      })
      .filter((r): r is CourseResource => r !== null && r.title.length > 0)
      .slice(0, 5);
  };

  const buildFallbackResources = (lessonTitle: string, objectives: string[]): CourseResource[] => {
    const seeds = objectives.filter(Boolean).slice(0, 3);
    const generated = seeds.map((objective, idx) => {
      if (idx === 0) return { title: `Worksheet: ${objective}`, url: "" };
      if (idx === 1) return { title: `Checklist: ${objective}`, url: "" };
      return { title: `Template: ${objective}`, url: "" };
    });

    while (generated.length < 3) {
      generated.push({ title: `Action guide for ${lessonTitle}`, url: "" });
    }

    return generated.slice(0, 5);
  };

  const handleGenerateContent = async () => {
    if (!currentModule) {
      toast({ title: "Select a module first", variant: "destructive" });
      return;
    }

    const ensured = ensureSelectedLesson();
    if (!ensured) {
      toast({ title: "No lesson selected", variant: "destructive" });
      return;
    }

    const lessonTitle = ensured.lesson?.title || `Lesson ${ensured.lessonIndex + 1}`;
    const moduleTitle = currentModule.title || `Module ${selectedModIdx + 1}`;
    const learningObjectives = Array.isArray(currentModule.learningObjectives)
      ? currentModule.learningObjectives.map((obj) => String(obj || "").trim()).filter(Boolean)
      : [];
    const objectivesContext = learningObjectives.length > 0
      ? `Learning objectives for this module: ${learningObjectives.join("; ")}.`
      : "";

    setGenerationState("queued");
    try {
      setGenerationState("analyzing");

      const basePrompt = `Generate lesson content for a course lesson titled "${lessonTitle}" in module "${moduleTitle}" from the book "${bookTitle}".
${objectivesContext}

Return a JSON object with:
- "script": string (plain text, 400-600 words, with sections for Key Concepts, Practical Application, and Summary)
- "summary": string[] (4 key takeaway bullet points)
- "exercise": string (a practical exercise, 100-150 words with numbered steps)
- "quiz": array of 3 objects each with {"question": string, "options": string[] (4 options), "correctAnswer": number (0-3), "explanation": string}
- "resources": array of 3-5 objects each with {"title": string, "url": string} — suggest REAL external URLs to free tools, articles, templates, or reference materials that support this lesson. Use well-known sites like Harvard Business Review, TED, Coursera, Google Docs templates, Notion templates, Canva, Medium articles, Wikipedia, etc. Each resource must have a descriptive title and a valid https URL.

Make the content specific to the lesson topic, not generic.
Return ONLY valid JSON.`;

      const aiOptions = {
        bookId,
        isPremium: true,
        builderMode: true,
        builderId: "online-course",
        builderLabel: "Online Course",
        builderStep: "Lesson Content",
      };

      let result: GeneratedLessonContent;
      try {
        result = await generateJSONWithAI<GeneratedLessonContent>(basePrompt, aiOptions);
      } catch {
        result = await generateJSONWithAI<GeneratedLessonContent>(
          `${basePrompt}\n\nSTRICT FORMAT: Start with { and end with }. No markdown, no prose, no code fences, no comments.`,
          aiOptions,
        );
      }

      setGenerationState("generating");

      const normalizedSummary = Array.isArray(result.summary)
        ? result.summary.map((point) => String(point || "").trim()).filter(Boolean)
        : [];

      const normalizedQuiz: CourseQuiz[] = Array.isArray(result.quiz)
        ? result.quiz.map((q) => {
            const options = Array.isArray(q?.options)
              ? q.options.map((opt) => String(opt || "").trim()).slice(0, 4)
              : [];

            while (options.length < 4) options.push("");

            const rawAnswer = Number(q?.correctAnswer);
            const safeCorrectAnswer = Number.isFinite(rawAnswer) ? Math.min(3, Math.max(0, rawAnswer)) : 0;

            return {
              question: String(q?.question || "").trim(),
              options,
              correctAnswer: safeCorrectAnswer,
              explanation: String(q?.explanation || "").trim(),
            };
          })
        : [];

      let normalizedResources = normalizeResourcesInput(result.resources);

      if (normalizedResources.length === 0) {
        try {
          const resourceResult = await generateJSONWithAI<{ resources?: Array<{ title?: string; url?: string } | string> }>(
            `Return ONLY JSON: {"resources": [{"title": string, "url": string}, ...]}.
Generate 3-5 resources with REAL external URLs for lesson "${lessonTitle}" in module "${moduleTitle}" from book "${bookTitle}".
${objectivesContext}
Use well-known sites (HBR, TED, Coursera, Google Docs, Notion, Canva, Wikipedia, etc). Each must have title + valid https URL.`,
            aiOptions,
          );
          normalizedResources = normalizeResourcesInput(resourceResult.resources);
        } catch {
          // Fallback below
        }
      }

      if (normalizedResources.length === 0) {
        normalizedResources = buildFallbackResources(lessonTitle, learningObjectives);
      }

      const snapshot = {
        script: String(result.script || ""),
        summary: normalizedSummary,
        exercise: String(result.exercise || ""),
        quiz: normalizedQuiz,
        resources: normalizedResources,
      };

      const snapshotKey = `${selectedModIdx}-${ensured.lessonIndex}`;
      setLastGenerated((prev) => ({ ...prev, [snapshotKey]: snapshot }));

      upsertLessonField(selectedModIdx, ensured.lessonIndex, "script", snapshot.script);
      upsertLessonField(selectedModIdx, ensured.lessonIndex, "summary", snapshot.summary);
      upsertLessonField(selectedModIdx, ensured.lessonIndex, "exercise", snapshot.exercise);
      upsertLessonField(selectedModIdx, ensured.lessonIndex, "quiz", snapshot.quiz);
      upsertLessonField(selectedModIdx, ensured.lessonIndex, "resources", snapshot.resources);

      setGenerationState("complete");
      toast({ title: "Lesson content generated!", description: "Review the script, exercises, and quiz below." });
    } catch (err) {
      console.error("Lesson content generation failed:", err);
      setGenerationState("error");
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
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
            {getModuleLessonsForDisplay(mod).map((lesson, li) => (
              <button
                key={lesson.id}
                onClick={() => { setSelectedModIdx(mi); setSelectedLessonIdx(li); }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
                  mi === selectedModIdx && li === activeLessonIdx
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
        <div className="flex items-center gap-2">
          {lastGenerated[`${selectedModIdx}-${activeLessonIdx}`] && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => {
                const snapshot = lastGenerated[`${selectedModIdx}-${activeLessonIdx}`];
                if (!snapshot) return;
                upsertLessonField(selectedModIdx, activeLessonIdx, "script", snapshot.script);
                upsertLessonField(selectedModIdx, activeLessonIdx, "summary", snapshot.summary);
                upsertLessonField(selectedModIdx, activeLessonIdx, "exercise", snapshot.exercise);
                upsertLessonField(selectedModIdx, activeLessonIdx, "quiz", snapshot.quiz);
                upsertLessonField(selectedModIdx, activeLessonIdx, "resources", snapshot.resources);
                toast({ title: "Restored last AI-generated content" });
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Undo Edits
            </Button>
          )}
          <Button
            onClick={handleGenerateContent}
            size="sm"
            className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            {currentLesson?.script ? (
              <><RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5 mr-1" /> Generate Content</>
            )}
          </Button>
        </div>
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
                  {(q.options || ["", "", "", ""]).map((opt: string, oi: number) => (
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
                          const newOpts = [...(q.options || ["", "", "", ""])];
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
          <Card className="p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Suggested Resources (with URLs)</p>
            {(currentLesson?.resources || [{ title: "", url: "" }]).map((res: any, i: number) => {
              const resource: CourseResource = typeof res === "string"
                ? { title: res, url: "" }
                : { title: res?.title || "", url: res?.url || "" };
              return (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={resource.title}
                    onChange={(e) => {
                      const newRes = [...(currentLesson?.resources || [])].map((r: any) =>
                        typeof r === "string" ? { title: r, url: "" } : { title: r?.title || "", url: r?.url || "" }
                      );
                      while (newRes.length <= i) newRes.push({ title: "", url: "" });
                      newRes[i] = { ...newRes[i], title: e.target.value };
                      updateLesson("resources", newRes);
                    }}
                    placeholder="Resource title..."
                    className="text-sm flex-1"
                  />
                  <Input
                    value={resource.url}
                    onChange={(e) => {
                      const newRes = [...(currentLesson?.resources || [])].map((r: any) =>
                        typeof r === "string" ? { title: r, url: "" } : { title: r?.title || "", url: r?.url || "" }
                      );
                      while (newRes.length <= i) newRes.push({ title: "", url: "" });
                      newRes[i] = { ...newRes[i], url: e.target.value };
                      updateLesson("resources", newRes);
                    }}
                    placeholder="https://..."
                    className="text-sm flex-1"
                  />
                  <button onClick={() => {
                    const newRes = (currentLesson?.resources || []).filter((_: any, j: number) => j !== i);
                    updateLesson("resources", newRes);
                  }}>
                    <Trash2 className="h-3 w-3 text-destructive/50" />
                  </button>
                </div>
              );
            })}
            <Button variant="ghost" size="sm" onClick={() => updateLesson("resources", [...(currentLesson?.resources || []), { title: "", url: "" }])} className="text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Resource
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
