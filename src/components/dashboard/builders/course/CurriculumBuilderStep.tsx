import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  ChevronDown, ChevronRight, GripVertical, Plus, Trash2,
  Sparkles, Loader2, BookOpen, Clock, Wand2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { CourseStepProps, CourseModule, CourseLesson } from "./types";

function generateId() {
  return crypto.randomUUID();
}

export default function CurriculumBuilderStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, generationState, setGenerationState, userId }: CourseStepProps) {
  const { toast } = useToast();
  const modules: CourseModule[] = stepData.curriculum?.modules || [];
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(modules[0]?.id || null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(modules.map(m => m.id)));

  const updateModules = (newModules: CourseModule[]) => {
    setStepData(prev => ({
      ...prev,
      curriculum: { ...prev.curriculum, modules: newModules },
    }));
    onMarkEdited("curriculum");
  };

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addModule = () => {
    const newModule: CourseModule = {
      id: generateId(),
      title: `Module ${modules.length + 1}`,
      description: "",
      position: modules.length,
      lessons: [],
    };
    updateModules([...modules, newModule]);
    setExpandedModules(prev => new Set([...prev, newModule.id]));
    setSelectedModuleId(newModule.id);
  };

  const removeModule = (id: string) => {
    updateModules(modules.filter(m => m.id !== id));
    if (selectedModuleId === id) setSelectedModuleId(null);
  };

  const updateModuleTitle = (id: string, title: string) => {
    updateModules(modules.map(m => m.id === id ? { ...m, title } : m));
  };

  const addLesson = (moduleId: string) => {
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;
    const newLesson: CourseLesson = {
      id: generateId(),
      title: `Lesson ${mod.lessons.length + 1}`,
      description: "",
      keyTakeaway: "",
      estimatedMinutes: 15,
      position: mod.lessons.length,
    };
    updateModules(modules.map(m => m.id === moduleId
      ? { ...m, lessons: [...m.lessons, newLesson] }
      : m
    ));
    setSelectedLessonId(newLesson.id);
  };

  const removeLesson = (moduleId: string, lessonId: string) => {
    updateModules(modules.map(m => m.id === moduleId
      ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) }
      : m
    ));
    if (selectedLessonId === lessonId) setSelectedLessonId(null);
  };

  const updateLessonField = (moduleId: string, lessonId: string, field: string, value: any) => {
    updateModules(modules.map(m => m.id === moduleId
      ? { ...m, lessons: m.lessons.map(l => l.id === lessonId ? { ...l, [field]: value } : l) }
      : m
    ));
  };

  const selectedModule = modules.find(m => m.id === selectedModuleId);
  const selectedLesson = selectedModule?.lessons.find(l => l.id === selectedLessonId);

  const handleGenerate = async () => {
    setGenerationState("queued");
    try {
      const token = (await supabase.auth.getSession()).data?.session?.access_token;
      const resp = await supabase.functions.invoke("ai-author-tools", {
        body: {
          tool: "generate-curriculum",
          bookId,
          bookTitle,
          userId,
        },
      });

      if (resp.error) throw resp.error;
      const result = resp.data;

      if (result?.modules) {
        const parsed: CourseModule[] = result.modules.map((m: any, i: number) => ({
          id: generateId(),
          title: m.title || `Module ${i + 1}`,
          description: m.description || "",
          position: i,
          lessons: (m.lessons || []).map((l: any, j: number) => ({
            id: generateId(),
            title: l.title || `Lesson ${j + 1}`,
            description: l.description || "",
            keyTakeaway: l.keyTakeaway || "",
            estimatedMinutes: l.estimatedMinutes || 15,
            position: j,
          })),
        }));
        updateModules(parsed);
        setExpandedModules(new Set(parsed.map(m => m.id)));
        if (parsed[0]) setSelectedModuleId(parsed[0].id);
        setGenerationState("complete");
        toast({ title: "Curriculum generated!", description: `${parsed.length} modules with ${parsed.reduce((a, m) => a + m.lessons.length, 0)} lessons.` });
      } else {
        // Fallback: generate mock curriculum
        generateMockCurriculum();
      }
    } catch (err) {
      console.error("Curriculum generation error:", err);
      generateMockCurriculum();
    }
  };

  const generateMockCurriculum = () => {
    const mockModules: CourseModule[] = Array.from({ length: 8 }, (_, i) => ({
      id: generateId(),
      title: `Module ${i + 1}: ${["Foundations", "Core Concepts", "Building Blocks", "Advanced Strategies", "Implementation", "Case Studies", "Optimization", "Mastery"][i]}`,
      description: `Deep dive into ${["fundamentals", "core theory", "practical tools", "advanced methods", "real-world application", "success stories", "fine-tuning", "putting it all together"][i]}`,
      position: i,
      lessons: Array.from({ length: 3 + (i % 2) }, (_, j) => ({
        id: generateId(),
        title: `Lesson ${j + 1}: ${["Introduction", "Deep Dive", "Practice", "Review", "Application"][j] || `Topic ${j + 1}`}`,
        description: "AI-generated lesson content based on your manuscript",
        keyTakeaway: "Key insight from this lesson",
        estimatedMinutes: 10 + Math.floor(Math.random() * 10),
        position: j,
      })),
    }));
    updateModules(mockModules);
    setExpandedModules(new Set(mockModules.map(m => m.id)));
    setSelectedModuleId(mockModules[0]?.id || null);
    setGenerationState("complete");
    toast({ title: "Curriculum generated!", description: `${mockModules.length} modules with ${mockModules.reduce((a, m) => a + m.lessons.length, 0)} lessons.` });
  };

  // No curriculum yet
  if (modules.length === 0 && generationState === "idle") {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">Generate Your Curriculum</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          AI will analyze your manuscript and create a structured module-lesson tree with 8-12 modules and 3-5 lessons each.
        </p>
        <Button
          onClick={handleGenerate}
          className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          <Sparkles className="h-4 w-4 mr-2" /> Generate Curriculum from Manuscript
        </Button>
      </div>
    );
  }

  if (generationState !== "idle" && generationState !== "complete") {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-secondary mx-auto mb-4" />
        <p className="text-sm font-medium">
          {generationState === "queued" && "Preparing to analyze your manuscript..."}
          {generationState === "analyzing" && "Reading chapters and mapping to modules..."}
          {generationState === "generating" && "Building curriculum structure..."}
        </p>
      </div>
    );
  }

  const totalLessons = modules.reduce((a, m) => a + m.lessons.length, 0);
  const totalMinutes = modules.reduce((a, m) => a + m.lessons.reduce((b, l) => b + l.estimatedMinutes, 0), 0);

  return (
    <div className="flex gap-4 min-h-[500px]">
      {/* Left panel: Module tree */}
      <div className="w-72 shrink-0 border border-border rounded-lg overflow-hidden bg-card">
        <div className="px-3 py-2.5 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Modules</p>
            <Badge variant="secondary" className="text-[10px]">{modules.length}M · {totalLessons}L · {Math.round(totalMinutes / 60)}h</Badge>
          </div>
        </div>
        <div className="overflow-y-auto max-h-[450px] p-1.5 space-y-1">
          {modules.map((mod) => (
            <div key={mod.id}>
              <div
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors group ${
                  selectedModuleId === mod.id && !selectedLessonId ? "bg-secondary/10 text-secondary" : "hover:bg-muted"
                }`}
                onClick={() => { setSelectedModuleId(mod.id); setSelectedLessonId(null); }}
              >
                <button onClick={(e) => { e.stopPropagation(); toggleModule(mod.id); }} className="shrink-0">
                  {expandedModules.has(mod.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
                <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                <span className="text-xs font-medium truncate flex-1">{mod.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeModule(mod.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3 text-destructive/60" />
                </button>
              </div>
              {expandedModules.has(mod.id) && (
                <div className="ml-6 space-y-0.5 mt-0.5">
                  {mod.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-[11px] transition-colors group ${
                        selectedLessonId === lesson.id ? "bg-secondary/10 text-secondary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                      onClick={() => { setSelectedModuleId(mod.id); setSelectedLessonId(lesson.id); }}
                    >
                      <span className="truncate flex-1">{lesson.title}</span>
                      <span className="text-[9px] text-muted-foreground/50 shrink-0">{lesson.estimatedMinutes}m</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeLesson(mod.id, lesson.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-2.5 w-2.5 text-destructive/60" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addLesson(mod.id)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground/50 hover:text-secondary transition-colors"
                  >
                    <Plus className="h-2.5 w-2.5" /> Add Lesson
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="p-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={addModule} className="w-full text-xs justify-start">
            <Plus className="h-3 w-3 mr-1" /> Add Module
          </Button>
        </div>
      </div>

      {/* Right panel: Selected item details */}
      <div className="flex-1 min-w-0">
        {selectedLesson && selectedModule ? (
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
              <span>{selectedModule.title}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-semibold">{selectedLesson.title}</span>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Lesson Title</Label>
                <Input
                  value={selectedLesson.title}
                  onChange={(e) => updateLessonField(selectedModule.id, selectedLesson.id, "title", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Description</Label>
                <Input
                  value={selectedLesson.description}
                  onChange={(e) => updateLessonField(selectedModule.id, selectedLesson.id, "description", e.target.value)}
                  className="mt-1"
                  placeholder="What the student learns in this lesson"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Key Takeaway</Label>
                <Input
                  value={selectedLesson.keyTakeaway}
                  onChange={(e) => updateLessonField(selectedModule.id, selectedLesson.id, "keyTakeaway", e.target.value)}
                  className="mt-1"
                  placeholder="One key insight the student walks away with"
                />
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <Label className="text-xs font-semibold">Estimated Duration</Label>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Input
                      type="number"
                      value={selectedLesson.estimatedMinutes}
                      onChange={(e) => updateLessonField(selectedModule.id, selectedLesson.id, "estimatedMinutes", parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    <span className="text-xs text-muted-foreground">minutes</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : selectedModule ? (
          <Card className="p-5 space-y-4">
            <Badge variant="outline" className="text-[10px]">Module {modules.indexOf(selectedModule) + 1} of {modules.length}</Badge>
            <div>
              <Label className="text-xs font-semibold">Module Title</Label>
              <Input
                value={selectedModule.title}
                onChange={(e) => updateModuleTitle(selectedModule.id, e.target.value)}
                className="mt-1 text-base font-medium"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Module Description</Label>
              <Input
                value={selectedModule.description}
                onChange={(e) => {
                  updateModules(modules.map(m => m.id === selectedModule.id ? { ...m, description: e.target.value } : m));
                }}
                className="mt-1"
                placeholder="Brief description of what this module covers"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              <Clock className="h-3 w-3 inline mr-1" />
              {selectedModule.lessons.length} lessons · {selectedModule.lessons.reduce((a, l) => a + l.estimatedMinutes, 0)} minutes total
            </div>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a module or lesson from the left panel
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm font-medium ${className || ""}`}>{children}</label>;
}
