import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Sparkles, Wand2, Check, BookOpen, ArrowRight, Coffee,
  ChevronLeft, ChevronRight, CalendarDays, Pencil, Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mdToHtml } from "@/lib/md-to-html";
import type { HomeStudyStepProps, StudyDay } from "./types";

const stripMarkdownForEditing = (content?: string | null): string => {
  if (!content) return "";
  return content
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^---+$/gm, "")
    .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^\s*[-•*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/`{1,3}/g, "");
};

type EditableDayField = "concept" | "exercise" | "reflection" | "actionPlan";

export default function ProgramSetupStep({ stepData, setStepData, onMarkEdited, plan, onStartGeneration, builderAct, bookId, onNavigate }: HomeStudyStepProps) {
  const data = stepData.setup || {};
  const days: StudyDay[] = stepData.schedule?.days || [];
  const isIdle = !builderAct || builderAct === "idle";
  const isComplete = builderAct === "act3_complete";
  const hasContent = days.length > 0 && days.some(d => d.concept || d.exercise);

  const [workbookExists, setWorkbookExists] = useState<boolean | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editingTab, setEditingTab] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;
    (async () => {
      const { data: wbs, error } = await supabase
        .from("workbooks" as any)
        .select("id")
        .eq("book_id", bookId)
        .limit(1);
      setWorkbookExists(!error && Array.isArray(wbs) && wbs.length > 0);
    })();
  }, [bookId]);

  const currentDay = days[selectedIdx] || null;
  const weeks = Array.from(new Set(days.map(d => d.weekNumber))).sort((a, b) => a - b);
  const contentCount = days.filter(d => d.concept || d.exercise || d.reflection).length;
  const hasAudio = data.format === "pdf-audio";

  const updateDay = (field: string, value: any) => {
    setStepData(prev => {
      const prevDays: StudyDay[] = prev.schedule?.days || [];
      const newDays = prevDays.map((d, i) => i === selectedIdx ? { ...d, [field]: value } : d);
      return { ...prev, schedule: { ...prev.schedule, days: newDays } };
    });
    onMarkEdited("setup");
  };

  const toggleTabEditing = (field: EditableDayField) => {
    if (editingTab === field) {
      setEditingTab(null);
      return;
    }
    const normalized = stripMarkdownForEditing(currentDay?.[field]);
    if (normalized !== (currentDay?.[field] || "")) {
      updateDay(field, normalized);
    }
    setEditingTab(field);
  };

  // Show content editor after generation
  if (hasContent) {
    return (
      <div className="space-y-5">
        {/* Instructions banner */}
        <Card className="p-4 border-secondary/30 bg-secondary/5">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Review & Edit Your Daily Content</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your program content has been generated. Review each day's reading, exercise, reflection, and action plan below. 
                Click <strong>Edit</strong> on any section to make changes. Once you're happy with the content, move to <strong>Step 2</strong> for sales copy, pricing, and design.
              </p>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <Card className="p-4 bg-muted/30 border-border/60">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">
              <CalendarDays className="h-2.5 w-2.5 mr-1" /> {days.length} Days
            </Badge>
            <Badge variant="outline" className="text-[10px]">{weeks.length} Weeks</Badge>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {contentCount}/{days.length} days have content
            </span>
          </div>
        </Card>

        {/* Week/Day navigator */}
        <div className="border border-border rounded-lg bg-card">
          <ScrollArea className="w-full">
            <div className="p-3 space-y-2.5">
              {weeks.map(weekNum => (
                <div key={weekNum}>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Week {weekNum}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {days.map((day, globalIdx) => {
                      if (day.weekNumber !== weekNum) return null;
                      const dayHasContent = Boolean(day.concept || day.exercise || day.reflection);
                      return (
                        <button
                          key={day.id}
                          onClick={() => { setSelectedIdx(globalIdx); setEditingTab(null); }}
                          className={`shrink-0 w-14 rounded-lg border-2 p-1.5 text-center transition-all ${
                            globalIdx === selectedIdx
                              ? "border-secondary bg-secondary/10 shadow-sm"
                              : day.isCatchUp
                              ? "border-dashed border-muted-foreground/20 bg-muted/30 hover:border-secondary/30"
                              : dayHasContent
                              ? "border-accent/30 bg-accent/5 hover:border-secondary/30"
                              : "border-border hover:border-secondary/30"
                          }`}
                        >
                          {day.isCatchUp ? (
                            <Coffee className="h-3 w-3 text-muted-foreground mx-auto" />
                          ) : (
                            <span className={`text-xs font-bold ${globalIdx === selectedIdx ? "text-secondary" : dayHasContent ? "text-accent" : ""}`}>
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

        {/* Day editor */}
        {currentDay && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={selectedIdx === 0}
                  onClick={() => { setSelectedIdx(selectedIdx - 1); setEditingTab(null); }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <p className="text-[10px] text-muted-foreground">Week {currentDay.weekNumber} · {currentDay.chapterRef}</p>
                  <h3 className="font-heading text-base font-bold">Day {currentDay.dayNumber}: {currentDay.theme}</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={selectedIdx === days.length - 1}
                  onClick={() => { setSelectedIdx(selectedIdx + 1); setEditingTab(null); }}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

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

            {/* Field Assignment, Accountability, Micro-Habit summary */}
            {(currentDay.fieldAssignment || currentDay.accountabilityCheck || currentDay.microHabit) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {currentDay.fieldAssignment && (
                  <Card className="p-3 border-secondary/20 bg-secondary/5">
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">🎯 Field Assignment</p>
                    <p className="text-xs leading-relaxed">{currentDay.fieldAssignment}</p>
                  </Card>
                )}
                {currentDay.accountabilityCheck && (
                  <Card className="p-3 border-accent/20 bg-accent/5">
                    <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">✅ Accountability</p>
                    <p className="text-xs leading-relaxed">{currentDay.accountabilityCheck}</p>
                  </Card>
                )}
                {currentDay.microHabit && (
                  <Card className="p-3 border-primary/20 bg-primary/5">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">🔁 Micro-Habit</p>
                    <p className="text-xs leading-relaxed">{currentDay.microHabit}</p>
                  </Card>
                )}
              </div>
            )}

            <Tabs defaultValue="concept" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="concept" className="text-xs">📖 Reading</TabsTrigger>
                <TabsTrigger value="exercise" className="text-xs">🏋️ Exercise</TabsTrigger>
                <TabsTrigger value="reflection" className="text-xs">🪞 Reflection</TabsTrigger>
                <TabsTrigger value="actionPlan" className="text-xs">🎯 Action Plan</TabsTrigger>
                {hasAudio && <TabsTrigger value="audio" className="text-xs">🎙️ Audio</TabsTrigger>}
              </TabsList>

              {(["concept", "exercise", "reflection", "actionPlan"] as EditableDayField[]).map(field => {
                const labels: Record<EditableDayField, string> = {
                  concept: "Key Concept",
                  exercise: "Practical Exercise",
                  reflection: "Reflection Journal Prompt",
                  actionPlan: "Action Plan",
                };
                const value = currentDay[field] || "";
                return (
                  <TabsContent key={field} value={field}>
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-muted-foreground">{labels[field]}</p>
                        <div className="flex items-center gap-2">
                          {value && <Badge variant="outline" className="text-[9px]"><Wand2 className="h-2 w-2 mr-0.5" /> AI Generated</Badge>}
                          {value && (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => toggleTabEditing(field)}>
                              {editingTab === field ? <><Check className="h-3 w-3 mr-1" /> Done</> : <><Pencil className="h-3 w-3 mr-1" /> Edit</>}
                            </Button>
                          )}
                        </div>
                      </div>
                      {editingTab === field ? (
                        <Textarea
                          value={value}
                          onChange={e => updateDay(field, stripMarkdownForEditing(e.target.value))}
                          rows={12}
                          className="text-sm"
                        />
                      ) : value ? (
                        <div className="prose prose-sm max-w-none text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToHtml(value) }} />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No content yet. Generate your program above.</p>
                      )}
                    </Card>
                  </TabsContent>
                );
              })}

              {hasAudio && (
                <TabsContent value="audio">
                  <Card className="p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Audio Narration Script</p>
                    <Textarea value={currentDay.audioScript || ""} onChange={e => updateDay("audioScript", e.target.value)}
                      placeholder="Audio narration script..." rows={10} className="text-sm" />
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </div>
    );
  }

  // Show summary if generation is complete but no content yet (shouldn't happen normally)
  if (isComplete && data.title) {
    return null;
  }

  // Hide CTA when Abby is actively working
  if (!isIdle && !isComplete) {
    return null;
  }

  // Gate: Workbook must exist before building Home Study
  if (workbookExists === false) {
    return (
      <div className="space-y-6">
        <Card className="p-8 border-amber-300/40 bg-amber-50/50 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
            <BookOpen className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="font-heading text-xl font-bold mb-2">
            Build Your Workbook First
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
            The Home Study Course sales page cross-sells your companion Workbook as a recommended add-on purchase. 
            Build the Workbook first so Abby can reference it in your Home Study marketing copy.
          </p>
          <Button
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              const title = params.get("bookTitle") || "";
              const cover = params.get("bookCoverUrl") || "";
              const qs = new URLSearchParams({ bookId, bookTitle: title, bookCoverUrl: cover }).toString();
              window.location.href = `/dashboard?section=builder&builder=workbook&${qs}`;
            }}
            className="rounded-full bg-amber-600 text-white hover:bg-amber-700 font-semibold h-12 px-8 text-sm"
          >
            <BookOpen className="h-4 w-4 mr-2" /> Build Workbook First <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <p className="text-[10px] text-muted-foreground/60 mt-4">
            Recommended sequence: Workbook → Home Study Course → Online Course
          </p>
        </Card>
      </div>
    );
  }

  // Loading state while checking
  if (workbookExists === null) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 border-border/60 bg-muted/30">
        <h4 className="font-heading text-sm font-bold mb-3">🗺️ How It Works</h4>
        <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
          <li><span className="font-medium text-foreground">Program Setup</span> — Abby generates the full program with daily content. You can review and edit everything here.</li>
          <li><span className="font-medium text-foreground">Sales & Publish</span> — Configure duration, sales copy, pricing, design, and publish.</li>
        </ol>
      </Card>

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
          You'll review and edit everything before publishing
        </p>
      </Card>
    </div>
  );
}
