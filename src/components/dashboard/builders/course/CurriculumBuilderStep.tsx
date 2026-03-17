import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  ChevronDown, ChevronRight, Plus, Trash2,
  Sparkles, Loader2, BookOpen, Clock, Brain, Lightbulb, MessageSquare, FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CourseStepProps, CourseModule } from "./types";

function generateId() {
  return crypto.randomUUID();
}

const BLOOM_COLORS: Record<string, string> = {
  "Remember": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Understand": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "Apply": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Analyze": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "Evaluate": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "Create": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

const KOLB_COLORS: Record<string, string> = {
  "Concrete Experience": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "Reflective Observation": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  "Abstract Conceptualization": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "Active Experimentation": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

function getBloomColor(level: string) {
  for (const [key, cls] of Object.entries(BLOOM_COLORS)) {
    if (level?.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  return "bg-muted text-muted-foreground";
}

function getKolbColor(stage: string) {
  for (const [key, cls] of Object.entries(KOLB_COLORS)) {
    if (stage?.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  return "bg-muted text-muted-foreground";
}

export default function CurriculumBuilderStep({ stepData, setStepData, onMarkEdited, bookId, bookTitle, generationState, setGenerationState, userId, onStartGeneration, builderAct }: CourseStepProps) {
  const { toast } = useToast();
  const modules: CourseModule[] = Array.isArray(stepData.curriculum?.modules) ? stepData.curriculum.modules : [];
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(modules.map((m) => m.id)));

  const getLearningObjectives = (mod: CourseModule): string[] =>
    Array.isArray(mod.learningObjectives) ? mod.learningObjectives : [];

  const getDebriefPoints = (mod: CourseModule): string[] =>
    Array.isArray(mod.debriefPoints) ? mod.debriefPoints : [];

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

  const updateModuleField = (id: string, field: string, value: any) => {
    updateModules(modules.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const addModule = () => {
    if (modules.length >= 10) {
      toast({ title: "Maximum 10 modules", variant: "destructive" });
      return;
    }
    const newModule: CourseModule = {
      id: generateId(),
      moduleNumber: modules.length + 1,
      title: `Module ${modules.length + 1}`,
      description: "",
      bloomsLevel: "",
      kolbsStage: "",
      learningObjectives: [""],
      contentSummary: "",
      facilitatorActivity: "",
      debriefPoints: ["", "", ""],
      workbookPageDescription: "",
      durationMinutes: 60,
      sourceChapters: [],
      position: modules.length,
    };
    updateModules([...modules, newModule]);
    setExpandedModules(prev => new Set([...prev, newModule.id]));
  };

  const removeModule = (id: string) => {
    updateModules(modules.filter(m => m.id !== id).map((m, i) => ({ ...m, moduleNumber: i + 1, position: i })));
  };

  const addObjective = (moduleId: string) => {
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;
    updateModuleField(moduleId, "learningObjectives", [...getLearningObjectives(mod), ""]);
  };

  const removeObjective = (moduleId: string, idx: number) => {
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;
    updateModuleField(moduleId, "learningObjectives", getLearningObjectives(mod).filter((_, i) => i !== idx));
  };

  const updateObjective = (moduleId: string, idx: number, val: string) => {
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;
    const next = [...getLearningObjectives(mod)];
    next[idx] = val;
    updateModuleField(moduleId, "learningObjectives", next);
  };

  const updateDebrief = (moduleId: string, idx: number, val: string) => {
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;
    const next = [...getDebriefPoints(mod)];
    next[idx] = val;
    updateModuleField(moduleId, "debriefPoints", next);
  };

  if (modules.length === 0 && generationState === "idle") {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">Design Your 7-Module Workshop</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Abby will analyze your manuscript and create 7 pedagogically-structured modules using Bloom's Taxonomy and Kolb's Learning Cycle.
        </p>
        <Button
          onClick={onStartGeneration}
          className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          <Sparkles className="h-4 w-4 mr-2" /> Analyze with Abby
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
          {generationState === "analyzing" && "Mapping chapters to pedagogical modules..."}
          {generationState === "generating" && "Designing activities, debriefs, and workbook pages..."}
        </p>
      </div>
    );
  }

  const totalMinutes = modules.reduce((a, m) => a + (m.durationMinutes || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Badge variant="secondary" className="text-[10px]">{modules.length} modules</Badge>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.round(totalMinutes / 60)}h {totalMinutes % 60}m total</span>
        {modules.length < 7 && <span className="text-amber-600">(Recommended: 7 modules)</span>}
      </div>

      <div className="space-y-2">
        {modules.map((mod) => {
          const objectives = getLearningObjectives(mod);
          const debriefPoints = getDebriefPoints(mod);

          return (
            <Card key={mod.id} className="overflow-hidden">
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
              >
                {expandedModules.has(mod.id) ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{mod.moduleNumber}</span>
                <span className="text-sm font-semibold flex-1 truncate">{mod.title}</span>
                {mod.bloomsLevel && (
                  <Badge className={`text-[9px] shrink-0 ${getBloomColor(mod.bloomsLevel)}`}>
                    {mod.bloomsLevel}
                  </Badge>
                )}
                {mod.kolbsStage && (
                  <Badge className={`text-[9px] shrink-0 ${getKolbColor(mod.kolbsStage)}`}>
                    {mod.kolbsStage}
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground shrink-0">{mod.durationMinutes}m</span>
              </button>

              {expandedModules.has(mod.id) && (
                <div className="px-4 pb-4 pt-0 space-y-4 border-t border-border">
                  <div className="space-y-1 pt-3">
                    <Label className="text-xs font-semibold">Module Title</Label>
                    <Input
                      value={mod.title || ""}
                      onChange={(e) => updateModuleField(mod.id, "title", e.target.value)}
                      className="text-base font-medium"
                    />
                  </div>

                  {(mod.bloomsLevel || mod.kolbsStage) && (
                    <div className="grid grid-cols-2 gap-3">
                      {mod.bloomsLevel && (
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold flex items-center gap-1">
                            <Brain className="h-3 w-3" /> Bloom's Level
                          </Label>
                          <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getBloomColor(mod.bloomsLevel)}`}>
                            {mod.bloomsLevel}
                          </div>
                        </div>
                      )}
                      {mod.kolbsStage && (
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold flex items-center gap-1">
                            <Lightbulb className="h-3 w-3" /> Kolb's Stage
                          </Label>
                          <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getKolbColor(mod.kolbsStage)}`}>
                            {mod.kolbsStage}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {objectives.some(o => o.trim()) && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        📋 Learning Objectives
                      </Label>
                      {objectives.map((obj, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-mono w-4">{i + 1}.</span>
                          <Input
                            value={obj}
                            onChange={(e) => updateObjective(mod.id, i, e.target.value)}
                            placeholder="e.g. Identify key frameworks from the book..."
                            className="text-sm"
                          />
                          {objectives.length > 1 && (
                            <button onClick={() => removeObjective(mod.id, i)} className="text-destructive/50 hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      {objectives.length < 5 && (
                        <Button variant="ghost" size="sm" onClick={() => addObjective(mod.id)} className="text-[10px]">
                          <Plus className="h-2.5 w-2.5 mr-1" /> Add Objective
                        </Button>
                      )}
                    </div>
                  )}

                  {(mod.contentSummary || mod.description) && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Content Summary</Label>
                      <Textarea
                        value={mod.contentSummary || mod.description || ""}
                        onChange={(e) => updateModuleField(mod.id, "contentSummary", e.target.value)}
                        placeholder="What does this module cover?"
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  )}

                  {mod.facilitatorActivity && (
                    <div className="space-y-1 bg-secondary/5 rounded-lg p-3 border border-secondary/20">
                      <Label className="text-xs font-semibold flex items-center gap-1 text-secondary">
                        🎯 Facilitator Activity
                      </Label>
                      <Textarea
                        value={mod.facilitatorActivity || ""}
                        onChange={(e) => updateModuleField(mod.id, "facilitatorActivity", e.target.value)}
                        placeholder="Describe the hands-on activity..."
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  )}

                  {debriefPoints.some(p => p.trim()) && (
                    <div className="space-y-2 bg-accent/5 rounded-lg p-3 border border-accent/20">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Debrief Questions
                      </Label>
                      {debriefPoints.map((point, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-mono w-4">Q{i + 1}</span>
                          <Input
                            value={point}
                            onChange={(e) => updateDebrief(mod.id, i, e.target.value)}
                            placeholder="Guided debrief question..."
                            className="text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {mod.workbookPageDescription && (
                    <div className="space-y-1 bg-primary/5 rounded-lg p-3 border border-primary/20">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Workbook Page
                      </Label>
                      <Textarea
                        value={mod.workbookPageDescription || ""}
                        onChange={(e) => updateModuleField(mod.id, "workbookPageDescription", e.target.value)}
                        placeholder='e.g. "My Starting Point" — self-assessment worksheet...'
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  )}

                  {(mod.durationMinutes ?? 0) > 0 && (
                    <div className="flex items-center gap-3">
                      <Label className="text-xs font-semibold">Duration</Label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          value={mod.durationMinutes ?? 0}
                          onChange={(e) => updateModuleField(mod.id, "durationMinutes", parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="text-xs text-muted-foreground">minutes</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border">
                    <Button variant="ghost" size="sm" onClick={() => removeModule(mod.id)} className="text-xs text-destructive">
                      <Trash2 className="h-3 w-3 mr-1" /> Remove Module
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {modules.length < 10 && (
        <Button variant="outline" onClick={addModule} className="w-full text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add Module (max 10)
        </Button>
      )}
    </div>
  );
}
