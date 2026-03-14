import { useEffect, useState, useCallback } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import {
  BookOpen, ChevronDown, ChevronRight, Check, Lock, Loader2, ArrowLeft, CalendarDays, Rocket,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StudyDay {
  id?: string;
  dayNumber: number;
  weekNumber: number;
  theme: string;
  chapterRef?: string;
  reading: string;
  concept?: string;
  exercise: string;
  reflection: string;
  actionPlan?: string;
}

interface ProgressEntry {
  day_number: number;
  completed_at: string;
}

export default function ReaderContentViewer() {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [days, setDays] = useState<StudyDay[]>([]);
  const [progress, setProgress] = useState<Set<number>>(new Set());
  const [unlockedUpTo, setUnlockedUpTo] = useState(0);
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set([1]));
  const [toggling, setToggling] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [chosenDate, setChosenDate] = useState<string>("");
  const [settingStart, setSettingStart] = useState(false);

  useDocumentMeta({ title: title ? `${title} | Reader Portal` : "Reader Portal" });

  const getToken = useCallback(async () => {
    const { data: sessionData } = await sharedSupabase.auth.getSession();
    return sessionData?.session?.access_token || null;
  }, []);

  const loadContent = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    if (!token) { setError("Not authenticated"); setLoading(false); return; }

    const { data, error: fnErr } = await supabase.functions.invoke("reader-content", {
      body: { action: "get-content", purchaseId },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (fnErr || data?.error) {
      setError(data?.error || "Failed to load content");
      setLoading(false);
      return;
    }

    setTitle(data.studyData?.title || data.purchase?.product_title || "Home Study");
    setUnlockedUpTo(data.unlockedUpToDay || 0);
    setStartDate(data.startDate || null);

    // Parse days from study_schedule_json
    const schedule = data.studyData?.study_schedule_json;
    if (Array.isArray(schedule) && schedule.length > 0) {
      setDays(schedule.map((d: any, i: number) => ({
        dayNumber: d.dayNumber || i + 1,
        weekNumber: d.weekNumber || Math.ceil((d.dayNumber || i + 1) / 7),
        theme: d.theme || `Day ${d.dayNumber || i + 1}`,
        chapterRef: d.chapterRef,
        reading: d.reading || "",
        concept: d.concept || "",
        exercise: d.exercise || "",
        reflection: d.reflection || "",
        actionPlan: d.actionPlan || "",
      })));
    }

    const completedDays = new Set<number>();
    (data.progress || []).forEach((p: ProgressEntry) => completedDays.add(p.day_number));
    setProgress(completedDays);
    setLoading(false);
  }, [purchaseId, getToken]);

  useEffect(() => {
    if (user) loadContent();
  }, [user, loadContent]);

  // Default the date picker to today
  useEffect(() => {
    if (!chosenDate) {
      const today = new Date();
      setChosenDate(today.toISOString().split("T")[0]);
    }
  }, [chosenDate]);

  async function handleSetStartDate() {
    if (!chosenDate) return;
    setSettingStart(true);
    const token = await getToken();
    if (!token) { setSettingStart(false); return; }

    const { error: err } = await supabase.functions.invoke("reader-content", {
      body: { action: "set-start-date", purchaseId, startDate: chosenDate },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!err) {
      setStartDate(chosenDate);
      // Recalculate unlocked days
      const start = new Date(chosenDate + "T00:00:00Z");
      const now = new Date();
      const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      setUnlockedUpTo(Math.max(0, daysSinceStart));
    }
    setSettingStart(false);
  }

  async function toggleDay(dayNumber: number) {
    setToggling(dayNumber);
    const token = await getToken();
    if (!token) { setToggling(null); return; }

    const isComplete = progress.has(dayNumber);
    const action = isComplete ? "unmark-complete" : "mark-complete";

    const { error: err } = await supabase.functions.invoke("reader-content", {
      body: { action, purchaseId, dayNumber },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!err) {
      setProgress(prev => {
        const next = new Set(prev);
        if (isComplete) next.delete(dayNumber); else next.add(dayNumber);
        return next;
      });
    }
    setToggling(null);
  }

  function toggleWeek(week: number) {
    setOpenWeeks(prev => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week); else next.add(week);
      return next;
    });
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/readers-bureau/auth?redirect=/readers-bureau" replace />;

  const totalDays = days.length || 21;
  const completedCount = progress.size;
  const progressPercent = Math.round((completedCount / totalDays) * 100);

  const weeks = Array.from(new Set(days.map(d => d.weekNumber))).sort((a, b) => a - b);
  if (weeks.length === 0) weeks.push(1, 2, 3);

  const hasStarted = !!startDate;
  const startDateObj = startDate ? new Date(startDate + "T00:00:00Z") : null;
  const hasNotBegunYet = startDateObj && startDateObj.getTime() > Date.now();

  // Format date nicely
  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container max-w-4xl flex items-center gap-3 py-3 px-4">
          <Link to="/readers-bureau?tab=library" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground truncate text-sm sm:text-base">{title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={progressPercent} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{completedCount}/{totalDays} days</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl py-6 px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-destructive font-medium">{error}</p>
            <Link to="/reader-portal" className="text-primary hover:underline text-sm">← Back to Library</Link>
          </div>
        ) : days.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">Content is being prepared. Check back soon!</p>
          </div>
        ) : !hasStarted ? (
          /* START DATE PICKER */
          <div className="max-w-md mx-auto py-12">
            <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6 shadow-sm">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarDays className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">Choose Your Start Date</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Pick the day you'd like to begin your {totalDays}-day journey. One new day of content will unlock each day from your chosen start date.
                </p>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground text-left">Start Date</label>
                <input
                  type="date"
                  value={chosenDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={e => setChosenDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-center text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  {chosenDate && `Your program will run from ${formatDate(chosenDate)} through ${formatDate(
                    new Date(new Date(chosenDate + "T00:00:00Z").getTime() + (totalDays - 1) * 86400000).toISOString().split("T")[0]
                  )}`}
                </p>
              </div>
              <Button
                onClick={handleSetStartDate}
                disabled={!chosenDate || settingStart}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {settingStart ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Rocket className="h-5 w-5 mr-2" />
                )}
                {settingStart ? "Setting up..." : "Start My Journey"}
              </Button>
            </div>
          </div>
        ) : hasNotBegunYet ? (
          /* COUNTDOWN — start date is in the future */
          <div className="max-w-md mx-auto py-12">
            <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6 shadow-sm">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarDays className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">Your Journey Begins Soon!</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Your {totalDays}-day program starts on <strong className="text-foreground">{formatDate(startDate!)}</strong>.
                  Day 1 content will be available on that day.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg py-4 px-6">
                <p className="text-2xl font-bold text-primary">
                  {Math.ceil((startDateObj!.getTime() - Date.now()) / 86400000)} day{Math.ceil((startDateObj!.getTime() - Date.now()) / 86400000) !== 1 ? "s" : ""} to go
                </p>
                <p className="text-xs text-muted-foreground mt-1">until your program begins</p>
              </div>
            </div>
          </div>
        ) : (
          /* MAIN CONTENT — weekly accordion */
          <div className="space-y-3">
            {startDate && (
              <p className="text-xs text-muted-foreground text-center mb-4">
                Started {formatDate(startDate)}
              </p>
            )}
            {weeks.map(week => {
              const weekDays = days.filter(d => d.weekNumber === week);
              const weekComplete = weekDays.every(d => progress.has(d.dayNumber));
              const isOpen = openWeeks.has(week);

              return (
                <div key={week} className="border border-border rounded-xl overflow-hidden bg-card">
                  {/* Week header */}
                  <button
                    onClick={() => toggleWeek(week)}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-semibold text-foreground">Week {week}</span>
                      <span className="text-xs text-muted-foreground">
                        {weekDays.filter(d => progress.has(d.dayNumber)).length}/{weekDays.length} complete
                      </span>
                    </div>
                    {weekComplete && <Check className="h-4 w-4 text-primary" />}
                  </button>

                  {/* Day cards */}
                  {isOpen && (
                    <div className="border-t border-border divide-y divide-border">
                      {weekDays.map(day => {
                        const isLocked = day.dayNumber > unlockedUpTo;
                        const isComplete = progress.has(day.dayNumber);

                        return (
                          <div key={day.dayNumber} className={cn("p-4", isLocked && "opacity-50")}>
                            {/* Day title row */}
                            <div className="flex items-start gap-3">
                              {isLocked ? (
                                <div className="mt-0.5 h-5 w-5 rounded-full border border-border flex items-center justify-center">
                                  <Lock className="h-3 w-3 text-muted-foreground" />
                                </div>
                              ) : (
                                <button
                                  onClick={() => toggleDay(day.dayNumber)}
                                  disabled={toggling === day.dayNumber}
                                  className={cn(
                                    "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                                    isComplete
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-border hover:border-primary/50"
                                  )}
                                >
                                  {toggling === day.dayNumber ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : isComplete ? (
                                    <Check className="h-3 w-3" />
                                  ) : null}
                                </button>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                  <span className="font-medium text-foreground text-sm">Day {day.dayNumber}</span>
                                  {day.chapterRef && (
                                    <span className="text-xs text-muted-foreground">({day.chapterRef})</span>
                                  )}
                                </div>
                                <p className="text-sm text-primary/80 font-medium mt-0.5">{day.theme}</p>
                              </div>
                            </div>

                            {/* Day content (only if not locked) */}
                            {!isLocked && (
                              <div className="ml-8 mt-3 space-y-3">
                                {day.reading && (
                                  <ContentBlock label="📖 Reading" content={day.reading} />
                                )}
                                {day.concept && (
                                  <ContentBlock label="💡 Key Concept" content={day.concept} />
                                )}
                                {day.exercise && (
                                  <ContentBlock label="✍️ Exercise" content={day.exercise} />
                                )}
                                {day.reflection && (
                                  <ContentBlock label="🪞 Reflection" content={day.reflection} />
                                )}
                                {day.actionPlan && (
                                  <ContentBlock label="🎯 Action Plan" content={day.actionPlan} />
                                )}
                              </div>
                            )}

                            {isLocked && (
                              <p className="ml-8 mt-2 text-xs text-muted-foreground italic">
                                Unlocks in {day.dayNumber - unlockedUpTo} day{day.dayNumber - unlockedUpTo > 1 ? "s" : ""}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function ContentBlock({ label, content }: { label: string; content: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-line">{content}</p>
    </div>
  );
}
