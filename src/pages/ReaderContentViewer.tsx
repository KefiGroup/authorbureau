import { useEffect, useState, useCallback } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import {
  BookOpen, ChevronDown, ChevronRight, Check, Lock, Loader2, ArrowLeft, CalendarDays, Rocket,
  Trophy, Target, Flame, Sparkles, ShoppingBag, GraduationCap, Headphones, Users, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface StudyDay {
  id?: string;
  dayNumber: number;
  weekNumber: number;
  theme: string;
  chapterRef?: string;
  reading: string;
  concept?: string;
  // New home-study-specific fields (implementation-focused)
  fieldAssignment?: string;
  accountabilityCheck?: string;
  microHabit?: string;
  // Legacy workbook-style fields (backward compat)
  exercise?: string;
  reflection?: string;
  actionPlan?: string;
}

interface ProgressEntry {
  day_number: number;
  completed_at: string;
}

interface UpsellProduct {
  type: "workbook" | "home_study" | "online_course" | "audiobook" | "coaching";
  title: string;
  description: string;
  price?: number;
  productId?: string;
  authorSlug?: string;
  bookSlug?: string;
}

export default function ReaderContentViewer() {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [days, setDays] = useState<StudyDay[]>([]);
  const [progress, setProgress] = useState<Set<number>>(new Set());
  const [unlockedUpTo, setUnlockedUpTo] = useState(0);
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set([1]));
  const [toggling, setToggling] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [chosenDate, setChosenDate] = useState<string>("");
  const [settingStart, setSettingStart] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [upsellProducts, setUpsellProducts] = useState<UpsellProduct[]>([]);
  const [bookId, setBookId] = useState<string | null>(null);

  useDocumentMeta({ title: title ? `${title} | Readers Bureau` : "Readers Bureau" });

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

    // Get book cover image and upsell products
    let currentBookId: string | null = null;
    if (data.purchase?.product_id) {
      const { data: hsc } = await supabase
        .from("home_study_courses")
        .select("book_id, cover_image_url")
        .eq("id", data.purchase.product_id)
        .maybeSingle();

      if (hsc?.cover_image_url) {
        setCoverImageUrl(hsc.cover_image_url);
      } else if (hsc?.book_id) {
        const { data: book } = await supabase
          .from("books")
          .select("cover_image_url")
          .eq("id", hsc.book_id)
          .maybeSingle();
        if (book?.cover_image_url) setCoverImageUrl(book.cover_image_url);
      }
      currentBookId = hsc?.book_id || null;
      setBookId(currentBookId);

      // Fetch upsell products for this book
      if (currentBookId) {
        fetchUpsellProducts(currentBookId, data.purchase.product_type || "home_study");
      }
    }

    // Resolve schedule from study_schedule_json (could be array or {days:[...]})
    // or fall back to parsing content_markdown as JSON
    let rawDays: any[] | null = null;
    const schedule = data.studyData?.study_schedule_json;
    if (Array.isArray(schedule)) {
      rawDays = schedule;
    } else if (schedule?.days && Array.isArray(schedule.days)) {
      rawDays = schedule.days;
    }
    // Fallback: try parsing content_markdown as JSON array
    if ((!rawDays || rawDays.length === 0) && data.studyData?.content_markdown) {
      try {
        const parsed = JSON.parse(data.studyData.content_markdown);
        if (Array.isArray(parsed)) rawDays = parsed;
        else if (parsed?.days && Array.isArray(parsed.days)) rawDays = parsed.days;
      } catch { /* not JSON */ }
    }
    if (rawDays && rawDays.length > 0) {
      setDays(rawDays.map((d: any, i: number) => ({
        dayNumber: d.dayNumber || i + 1,
        weekNumber: d.weekNumber || Math.ceil((d.dayNumber || i + 1) / 7),
        theme: d.theme || `Day ${d.dayNumber || i + 1}`,
        chapterRef: d.chapterRef,
        reading: d.reading || "",
        concept: d.concept || "",
        fieldAssignment: d.fieldAssignment || "",
        accountabilityCheck: d.accountabilityCheck || "",
        microHabit: d.microHabit || "",
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

  // Fetch upsell products for this book's ecosystem
  const fetchUpsellProducts = useCallback(async (forBookId: string, currentProductType: string) => {
    const upsells: UpsellProduct[] = [];

    // Get book info for slugs
    const { data: bookInfo } = await supabase
      .from("books")
      .select("title, slug, author_id")
      .eq("id", forBookId)
      .maybeSingle();

    let authorSlug: string | undefined;
    if (bookInfo?.author_id) {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("author_slug")
        .eq("user_id", bookInfo.author_id)
        .maybeSingle();
      authorSlug = profile?.author_slug || undefined;
    }

    const bookSlug = bookInfo?.slug;

    // The journey sequence: book → workbook → home_study → online_course → coaching
    // Current user is viewing a home_study, so suggest what comes NEXT

    // Check for online course
    const { data: courses } = await supabase
      .from("courses")
      .select("id, title, price, status, description")
      .eq("book_id", forBookId)
      .eq("status", "published")
      .limit(1);

    if (courses && courses.length > 0) {
      upsells.push({
        type: "online_course",
        title: courses[0].title,
        description: courses[0].description || "Take your learning to the next level with structured video lessons and guided modules.",
        price: courses[0].price ?? undefined,
        productId: courses[0].id,
        authorSlug,
        bookSlug: bookSlug || undefined,
      });
    }

    // Check for audiobook
    const { data: audiobooks } = await supabase
      .from("audiobooks")
      .select("id, title, price, status, description")
      .eq("book_id", forBookId)
      .eq("status", "published")
      .limit(1);

    if (audiobooks && audiobooks.length > 0) {
      upsells.push({
        type: "audiobook",
        title: audiobooks[0].title,
        description: audiobooks[0].description || "Listen on the go and reinforce what you've learned with the audiobook companion.",
        price: audiobooks[0].price ?? undefined,
        productId: audiobooks[0].id,
        authorSlug,
        bookSlug: bookSlug || undefined,
      });
    }

    // Check for coaching packages
    if (bookInfo?.author_id) {
      const { data: coaching } = await supabase
        .from("coaching_packages")
        .select("id, title, price, description, type, status")
        .eq("author_id", bookInfo.author_id)
        .eq("status", "active")
        .limit(1);

      if (coaching && coaching.length > 0) {
        upsells.push({
          type: "coaching",
          title: coaching[0].title,
          description: coaching[0].description || "Get personalized guidance and accelerate your transformation with 1-on-1 coaching.",
          price: coaching[0].price ?? undefined,
          productId: coaching[0].id,
          authorSlug,
          bookSlug: bookSlug || undefined,
        });
      }
    }

    setUpsellProducts(upsells);
  }, []);

  useEffect(() => {
    if (user) loadContent();
  }, [user, loadContent]);

  useEffect(() => {
    if (!chosenDate) {
      setChosenDate(new Date().toISOString().split("T")[0]);
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
  const currentStreak = calculateStreak(progress, unlockedUpTo);

  const weeks = Array.from(new Set(days.map(d => d.weekNumber))).sort((a, b) => a - b);
  if (weeks.length === 0) weeks.push(1, 2, 3);

  const hasStarted = !!startDate;
  const startDateObj = startDate ? new Date(startDate + "T00:00:00Z") : null;
  const hasNotBegunYet = startDateObj && startDateObj.getTime() > Date.now();

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  // Find which day is "today"
  const todayDayNumber = startDate
    ? Math.floor((Date.now() - new Date(startDate + "T00:00:00Z").getTime()) / 86400000) + 1
    : 0;

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
            <Link to="/readers-bureau?tab=library" className="text-primary hover:underline text-sm">← Back to Library</Link>
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
              {coverImageUrl && (
                <img src={coverImageUrl} alt={title} className="w-32 h-auto mx-auto rounded-lg shadow-md" />
              )}
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
                {settingStart ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Rocket className="h-5 w-5 mr-2" />}
                {settingStart ? "Setting up..." : "Start My Journey"}
              </Button>
            </div>
          </div>
        ) : hasNotBegunYet ? (
          /* COUNTDOWN */
          <div className="max-w-md mx-auto py-12">
            <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6 shadow-sm">
              {coverImageUrl && (
                <img src={coverImageUrl} alt={title} className="w-32 h-auto mx-auto rounded-lg shadow-md" />
              )}
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
          /* MAIN CONTENT */
          <div className="space-y-6">
            {/* Course overview card */}
            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
              {coverImageUrl && (
                <img src={coverImageUrl} alt={title} className="w-24 h-auto rounded-lg shadow-md shrink-0" />
              )}
              <div className="flex-1 text-center sm:text-left space-y-3">
                <h2 className="text-lg font-bold text-foreground">{title}</h2>
                {startDate && (
                  <p className="text-xs text-muted-foreground">
                    Started {formatDate(startDate)}
                  </p>
                )}
                {/* Stats row */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                  <StatBadge icon={<Target className="h-4 w-4" />} label="Progress" value={`${progressPercent}%`} />
                  <StatBadge icon={<Check className="h-4 w-4" />} label="Completed" value={`${completedCount}/${totalDays}`} />
                  <StatBadge icon={<Flame className="h-4 w-4" />} label="Streak" value={`${currentStreak} days`} />
                  {todayDayNumber > 0 && todayDayNumber <= totalDays && (
                    <StatBadge icon={<CalendarDays className="h-4 w-4" />} label="Today" value={`Day ${todayDayNumber}`} />
                  )}
                </div>
              </div>
            </div>

            {/* Instructions banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <h3 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                How This Program Works
              </h3>
              <ul className="text-xs text-muted-foreground space-y-1.5 ml-6 list-disc">
                <li>A new day of content unlocks each day from your start date</li>
                <li>Read the assigned content, then complete your daily field assignment</li>
                <li>Field assignments are real-world actions — do them in your life, not just on paper</li>
                <li>Build your micro-habit daily — small consistent actions create massive change</li>
                <li>Check off each day when you've completed it to track your streak</li>
              </ul>
            </div>

            {/* Weekly accordion */}
            {weeks.map(week => {
              const weekDays = days.filter(d => d.weekNumber === week);
              const weekCompletedCount = weekDays.filter(d => progress.has(d.dayNumber)).length;
              const weekComplete = weekCompletedCount === weekDays.length;
              const weekPercent = Math.round((weekCompletedCount / weekDays.length) * 100);
              const isOpen = openWeeks.has(week);

              return (
                <div key={week} className="border border-border rounded-xl overflow-hidden bg-card">
                  <button
                    onClick={() => toggleWeek(week)}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-semibold text-foreground">Week {week}</span>
                      <Progress value={weekPercent} className="h-1.5 w-20" />
                      <span className="text-xs text-muted-foreground">
                        {weekCompletedCount}/{weekDays.length}
                      </span>
                    </div>
                    {weekComplete && <Trophy className="h-4 w-4 text-primary" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-border divide-y divide-border">
                      {weekDays.map(day => {
                        const isLocked = day.dayNumber > unlockedUpTo;
                        const isComplete = progress.has(day.dayNumber);
                        const isToday = day.dayNumber === todayDayNumber;
                        const isExpanded = expandedDay === day.dayNumber;

                        return (
                          <div
                            key={day.dayNumber}
                            className={cn(
                              "transition-colors",
                              isLocked && "opacity-40",
                              isToday && !isLocked && "bg-primary/5 border-l-4 border-l-primary"
                            )}
                          >
                            {/* Day header row */}
                            <div
                              className={cn("flex items-start gap-3 p-4 cursor-pointer", !isLocked && "hover:bg-accent/30")}
                              onClick={() => !isLocked && setExpandedDay(isExpanded ? null : day.dayNumber)}
                            >
                              {isLocked ? (
                                <div className="mt-0.5 h-6 w-6 rounded-full border border-border flex items-center justify-center shrink-0">
                                  <Lock className="h-3 w-3 text-muted-foreground" />
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleDay(day.dayNumber); }}
                                  disabled={toggling === day.dayNumber}
                                  className={cn(
                                    "mt-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
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
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground text-sm">Day {day.dayNumber}</span>
                                  {day.chapterRef && (
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                      {day.chapterRef}
                                    </span>
                                  )}
                                  {isToday && !isLocked && (
                                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                      TODAY
                                    </span>
                                  )}
                                  {isComplete && (
                                    <span className="text-xs text-primary/70">✓ Done</span>
                                  )}
                                </div>
                                <p className="text-sm text-primary/80 font-medium mt-0.5">{day.theme}</p>
                              </div>
                              {!isLocked && (
                                <ChevronDown className={cn(
                                  "h-4 w-4 text-muted-foreground transition-transform shrink-0 mt-1",
                                  isExpanded && "rotate-180"
                                )} />
                              )}
                            </div>

                            {/* Expanded day content */}
                            {!isLocked && isExpanded && (
                              <div className="px-4 pb-5 ml-9 space-y-4">
                                {day.reading && (
                                  <ContentSection
                                    emoji="📖"
                                    label="Reading Assignment"
                                    content={day.reading}
                                    hint="Read the assigned section and highlight key passages"
                                  />
                                )}
                                {day.concept && (
                                  <ContentSection
                                    emoji="💡"
                                    label="Key Concept"
                                    content={day.concept}
                                  />
                                )}
                                {/* New implementation-focused fields */}
                                {day.fieldAssignment && (
                                  <WritableSection
                                    emoji="🚀"
                                    label="Field Assignment"
                                    prompt={day.fieldAssignment}
                                    storageKey={`rv-${purchaseId}-d${day.dayNumber}-field-assignment`}
                                    hint="This is a real-world action — go do it in your life today"
                                  />
                                )}
                                {day.microHabit && (
                                  <WritableSection
                                    emoji="🔄"
                                    label="Today's Micro-Habit"
                                    prompt={day.microHabit}
                                    storageKey={`rv-${purchaseId}-d${day.dayNumber}-micro-habit`}
                                    hint="Add this to your daily routine — it compounds over the program"
                                  />
                                )}
                                {day.accountabilityCheck && (
                                  <WritableSection
                                    emoji="✅"
                                    label="Accountability Check-In"
                                    prompt={day.accountabilityCheck}
                                    storageKey={`rv-${purchaseId}-d${day.dayNumber}-accountability`}
                                  />
                                )}
                                {/* Legacy fields for backward compat */}
                                {day.exercise && !day.fieldAssignment && (
                                  <WritableSection
                                    emoji="✍️"
                                    label="Exercise"
                                    prompt={day.exercise}
                                    storageKey={`rv-${purchaseId}-d${day.dayNumber}-exercise`}
                                  />
                                )}
                                {day.reflection && !day.accountabilityCheck && (
                                  <WritableSection
                                    emoji="🪞"
                                    label="Reflection"
                                    prompt={day.reflection}
                                    storageKey={`rv-${purchaseId}-d${day.dayNumber}-reflection`}
                                  />
                                )}
                                {day.actionPlan && (
                                  <WritableSection
                                    emoji="🎯"
                                    label="Action Plan"
                                    prompt={day.actionPlan}
                                    storageKey={`rv-${purchaseId}-d${day.dayNumber}-action-plan`}
                                  />
                                )}

                                {/* Mark complete CTA */}
                                {!isComplete && (
                                  <Button
                                    onClick={() => toggleDay(day.dayNumber)}
                                    disabled={toggling === day.dayNumber}
                                    className="w-full mt-2"
                                    size="lg"
                                  >
                                    {toggling === day.dayNumber ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <Check className="h-4 w-4 mr-2" />
                                    )}
                                    Mark Day {day.dayNumber} Complete
                                  </Button>
                                )}
                              </div>
                            )}

                            {isLocked && (
                              <p className="ml-13 px-4 pb-3 text-xs text-muted-foreground italic">
                                🔒 Unlocks in {day.dayNumber - unlockedUpTo} day{day.dayNumber - unlockedUpTo > 1 ? "s" : ""}
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

            {/* Completion celebration + Upsell */}
            {progressPercent === 100 && (
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-2xl p-8 text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                  <Trophy className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">🎉 Congratulations!</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  You've completed the entire {totalDays}-day program! Your dedication to growth is truly impressive.
                </p>
              </div>
            )}

            {/* Upsell: What's Next in Your Journey */}
            {upsellProducts.length > 0 && (
              <div className="border border-secondary/20 bg-secondary/5 rounded-2xl overflow-hidden">
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
                      <Sparkles className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Continue Your Journey</h3>
                      <p className="text-xs text-muted-foreground">
                        {progressPercent === 100
                          ? "You've mastered this program! Here's what to explore next."
                          : "Ready to go deeper? These are your next steps after this program."}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {upsellProducts.map((product) => (
                      <UpsellCard key={product.productId || product.type} product={product} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* --- Sub-components --- */

function StatBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-3 py-1.5">
      <span className="text-primary">{icon}</span>
      <div className="text-left">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-foreground leading-tight">{value}</p>
      </div>
    </div>
  );
}

const UPSELL_META: Record<string, { icon: React.ReactNode; badge: string; cta: string; gradient: string }> = {
  online_course: {
    icon: <GraduationCap className="h-5 w-5" />,
    badge: "Next Step",
    cta: "Enroll Now",
    gradient: "from-violet-500/10 to-violet-500/5",
  },
  audiobook: {
    icon: <Headphones className="h-5 w-5" />,
    badge: "Listen & Learn",
    cta: "Get the Audiobook",
    gradient: "from-sky-500/10 to-sky-500/5",
  },
  coaching: {
    icon: <Users className="h-5 w-5" />,
    badge: "Go Deeper",
    cta: "Book a Session",
    gradient: "from-amber-500/10 to-amber-500/5",
  },
  workbook: {
    icon: <BookOpen className="h-5 w-5" />,
    badge: "Apply It",
    cta: "Get the Workbook",
    gradient: "from-emerald-500/10 to-emerald-500/5",
  },
  home_study: {
    icon: <Target className="h-5 w-5" />,
    badge: "Study Program",
    cta: "Start the Program",
    gradient: "from-rose-500/10 to-rose-500/5",
  },
};

function UpsellCard({ product }: { product: UpsellProduct }) {
  const meta = UPSELL_META[product.type] || UPSELL_META.online_course;
  const productUrl = product.authorSlug && product.bookSlug
    ? `/${product.authorSlug}/${product.bookSlug}/${product.type === "online_course" ? "course" : product.type}`
    : "#";

  return (
    <div className={cn("rounded-xl border border-border/60 bg-gradient-to-r p-4 flex items-center gap-4 hover:shadow-md transition-shadow", meta.gradient)}>
      <div className="w-10 h-10 rounded-lg bg-background/80 border border-border/50 flex items-center justify-center shrink-0 text-primary">
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{meta.badge}</span>
        </div>
        <h4 className="font-semibold text-foreground text-sm truncate">{product.title}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>
      </div>
      <div className="shrink-0 text-right space-y-1">
        {product.price != null && product.price > 0 && (
          <p className="text-sm font-bold text-foreground">${product.price}</p>
        )}
        <Link
          to={productUrl}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          {meta.cta}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function ContentSection({ emoji, label, content, hint, highlight }: { emoji: string; label: string; content: string; hint?: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl p-4 border", highlight ? "bg-primary/5 border-primary/20" : "bg-muted/40 border-border/50")}>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
        {emoji} {label}
      </p>
      <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{content}</p>
      {hint && <p className="text-xs text-muted-foreground/70 mt-2 italic">{hint}</p>}
    </div>
  );
}

function WritableSection({ emoji, label, prompt, storageKey }: { emoji: string; label: string; prompt: string; storageKey: string }) {
  const [value, setValue] = useState(() => {
    try { return localStorage.getItem(storageKey) || ""; } catch { return ""; }
  });

  const handleChange = (text: string) => {
    setValue(text);
    try { localStorage.setItem(storageKey, text); } catch {}
  };

  return (
    <div className="bg-muted/40 rounded-xl p-4 border border-border/50 space-y-3">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {emoji} {label}
      </p>
      <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{prompt}</p>
      <div className="relative">
        <Textarea
          placeholder={`Write your ${label.toLowerCase()} here...`}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="min-h-[120px] bg-background border-border resize-y text-sm leading-relaxed"
        />
        <p className="text-[10px] text-muted-foreground/60 mt-1 text-right">
          Auto-saved locally
        </p>
      </div>
    </div>
  );
}

function calculateStreak(progress: Set<number>, unlockedUpTo: number): number {
  if (progress.size === 0) return 0;
  let streak = 0;
  for (let d = unlockedUpTo; d >= 1; d--) {
    if (progress.has(d)) streak++;
    else break;
  }
  return streak;
}
