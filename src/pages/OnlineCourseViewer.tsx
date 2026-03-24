import { useEffect, useState, useCallback } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import {
  BookOpen, Check, Lock, Loader2, ArrowLeft, ChevronDown, ChevronRight,
  GraduationCap, PlayCircle, FileText, ListChecks, ClipboardList,
  FolderOpen, Trophy, Flame, Target, Sparkles, ArrowRight, Users,
  Headphones, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ─── Types ─── */

interface CourseModule {
  id: string;
  title: string;
  description: string | null;
  position: number;
  blooms_level: string | null;
  kolbs_stage: string | null;
  learning_objectives: string[] | null;
  duration_minutes: number | null;
  lessons: CourseLesson[];
}

interface CourseLesson {
  id: string;
  title: string;
  content: string | null; // script / main content
  position: number;
  video_url: string | null;
  quizzes: CourseQuiz[];
  // Parsed from content JSON
  summary?: string[];
  exercise?: string;
  resources?: Array<{ title: string; url: string } | string>;
  script?: string;
}

interface CourseQuiz {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string | null;
  position: number;
}

interface QuizAnswer {
  quizId: string;
  selected: number | null;
  revealed: boolean;
}

/* ─── Main Component ─── */

export default function OnlineCourseViewer() {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [selectedModuleIdx, setSelectedModuleIdx] = useState(0);
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [quizAnswers, setQuizAnswers] = useState<Record<string, QuizAnswer>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);

  useDocumentMeta({ title: courseTitle ? `${courseTitle} | Readers Bureau` : "Online Course | Readers Bureau" });

  const loadCourse = useCallback(async () => {
    if (!user || !purchaseId) return;
    setLoading(true);

    try {
      // 1. Get purchase to find course id
      const { data: purchase, error: pErr } = await supabase
        .from("purchases")
        .select("product_id, product_title, product_type, customer_email")
        .eq("id", purchaseId)
        .maybeSingle();

      if (pErr || !purchase) {
        setError("Purchase not found");
        setLoading(false);
        return;
      }

      // Verify ownership
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData?.session?.user?.email;
      if (email?.toLowerCase() !== purchase.customer_email?.toLowerCase()) {
        setError("You don't have access to this course");
        setLoading(false);
        return;
      }

      const cId = purchase.product_id;
      setCourseId(cId);

      // 2. Get course metadata
      const { data: course } = await supabase
        .from("courses")
        .select("title, description, cover_image_url, book_id")
        .eq("id", cId)
        .maybeSingle();

      if (course) {
        setCourseTitle(course.title || purchase.product_title);
        setCourseDescription(course.description || "");
        if (course.cover_image_url) {
          setCoverImageUrl(course.cover_image_url);
        } else if (course.book_id) {
          const { data: book } = await supabase
            .from("books")
            .select("cover_image_url")
            .eq("id", course.book_id)
            .maybeSingle();
          if (book?.cover_image_url) setCoverImageUrl(book.cover_image_url);
        }
      } else {
        setCourseTitle(purchase.product_title);
      }

      // 3. Get modules with lessons
      const { data: rawModules } = await supabase
        .from("course_modules")
        .select("id, title, description, position, blooms_level, kolbs_stage, learning_objectives, duration_minutes")
        .eq("course_id", cId)
        .order("position");

      const moduleIds = (rawModules || []).map((m: any) => m.id);

      // 4. Get lessons
      let rawLessons: any[] = [];
      if (moduleIds.length > 0) {
        const { data } = await supabase
          .from("course_lessons")
          .select("id, title, content, position, video_url, module_id")
          .in("module_id", moduleIds)
          .order("position");
        rawLessons = data || [];
      }

      // 5. Get quizzes
      const lessonIds = rawLessons.map((l: any) => l.id);
      let rawQuizzes: any[] = [];
      if (lessonIds.length > 0) {
        const { data } = await supabase
          .from("course_quizzes")
          .select("id, question, options, correct_answer, explanation, position, lesson_id")
          .in("lesson_id", lessonIds)
          .order("position");
        rawQuizzes = data || [];
      }

      // 6. Assemble modules
      const assembled: CourseModule[] = (rawModules || []).map((mod: any) => {
        const modLessons = rawLessons
          .filter((l: any) => l.module_id === mod.id)
          .map((l: any) => {
            const lessonQuizzes = rawQuizzes
              .filter((q: any) => q.lesson_id === l.id)
              .map((q: any) => ({
                id: q.id,
                question: q.question,
                options: Array.isArray(q.options) ? q.options.map(String) : [],
                correct_answer: q.correct_answer,
                explanation: q.explanation,
                position: q.position,
              }));

            // Try parsing content as JSON for rich fields
            let parsedContent: any = {};
            if (l.content) {
              try {
                parsedContent = JSON.parse(l.content);
              } catch {
                // Not JSON, treat as script text
                parsedContent = { script: l.content };
              }
            }

            return {
              id: l.id,
              title: l.title,
              content: l.content,
              position: l.position,
              video_url: l.video_url,
              quizzes: lessonQuizzes,
              script: parsedContent.script || (typeof l.content === "string" && !l.content.startsWith("{") ? l.content : ""),
              summary: Array.isArray(parsedContent.summary) ? parsedContent.summary : [],
              exercise: parsedContent.exercise || "",
              resources: Array.isArray(parsedContent.resources) ? parsedContent.resources : [],
            };
          });

        return {
          id: mod.id,
          title: mod.title,
          description: mod.description,
          position: mod.position,
          blooms_level: mod.blooms_level,
          kolbs_stage: mod.kolbs_stage,
          learning_objectives: Array.isArray(mod.learning_objectives) ? mod.learning_objectives : [],
          duration_minutes: mod.duration_minutes,
          lessons: modLessons,
        };
      });

      setModules(assembled);

      // 7. Load or create enrollment + progress
      const { data: enrollment } = await supabase
        .from("course_enrollments")
        .select("id, progress_percent, status")
        .eq("course_id", cId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (enrollment) {
        setEnrollmentId(enrollment.id);
      } else {
        const { data: newEnrollment } = await supabase
          .from("course_enrollments")
          .insert({ course_id: cId, user_id: user.id, status: "active", progress_percent: 0 })
          .select("id")
          .single();
        if (newEnrollment) setEnrollmentId(newEnrollment.id);
      }

      // Load completed lessons from localStorage (simple approach)
      const savedProgress = localStorage.getItem(`course-progress-${cId}`);
      if (savedProgress) {
        try {
          setCompletedLessons(new Set(JSON.parse(savedProgress)));
        } catch (error) {
      console.error(error);
    }
      }
    } catch (err) {
      console.error("Failed to load course:", err);
      setError("Failed to load course content");
    }
    setLoading(false);
  }, [user, purchaseId]);

  useEffect(() => {
    if (user) loadCourse();
  }, [user, loadCourse]);

  // Persist completed lessons
  const markLessonComplete = useCallback((lessonId: string) => {
    setCompletedLessons(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      if (courseId) {
        localStorage.setItem(`course-progress-${courseId}`, JSON.stringify([...next]));
      }
      // Update enrollment progress
      if (enrollmentId && modules.length > 0) {
        const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
        const percent = Math.round((next.size / totalLessons) * 100);
        supabase.from("course_enrollments").update({ progress_percent: percent }).eq("id", enrollmentId).then(() => {});
      }
      return next;
    });
  }, [courseId, enrollmentId, modules]);

  const handleQuizAnswer = (quizId: string, selected: number) => {
    setQuizAnswers(prev => ({
      ...prev,
      [quizId]: { quizId, selected, revealed: false },
    }));
  };

  const revealQuizAnswer = (quizId: string) => {
    setQuizAnswers(prev => ({
      ...prev,
      [quizId]: { ...prev[quizId], revealed: true },
    }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/readers-bureau/auth?redirect=/readers-bureau" replace />;

  const currentModule = modules[selectedModuleIdx];
  const currentLesson = currentModule?.lessons?.[selectedLessonIdx];
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const completedCount = completedLessons.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const goToLesson = (modIdx: number, lesIdx: number) => {
    setSelectedModuleIdx(modIdx);
    setSelectedLessonIdx(lesIdx);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const goToNextLesson = () => {
    if (!currentModule) return;
    if (selectedLessonIdx < currentModule.lessons.length - 1) {
      setSelectedLessonIdx(selectedLessonIdx + 1);
    } else if (selectedModuleIdx < modules.length - 1) {
      setSelectedModuleIdx(selectedModuleIdx + 1);
      setSelectedLessonIdx(0);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isLastLesson = selectedModuleIdx === modules.length - 1 &&
    selectedLessonIdx === (currentModule?.lessons?.length ?? 1) - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── Top Header ─── */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="flex items-center gap-3 py-3 px-4 max-w-[1600px] mx-auto">
          <Link to="/readers-bureau?tab=library" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 rounded-md hover:bg-accent text-muted-foreground"
          >
            <ListChecks className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-foreground truncate text-sm">{courseTitle}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={progressPercent} className="h-2 flex-1 max-w-xs" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {completedCount}/{totalLessons} lessons · {progressPercent}%
              </span>
            </div>
          </div>
          {progressPercent === 100 && (
            <Badge className="bg-primary/10 text-primary border-primary/20">
              <Trophy className="h-3 w-3 mr-1" /> Completed
            </Badge>
          )}
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading your course...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <p className="text-destructive font-medium">{error}</p>
            <Link to="/readers-bureau?tab=library" className="text-primary hover:underline text-sm">← Back to Library</Link>
          </div>
        </div>
      ) : modules.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">Course content is being prepared. Check back soon!</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* ─── Sidebar ─── */}
          <aside className={cn(
            "bg-card border-r border-border w-80 shrink-0 overflow-y-auto transition-all duration-300 z-20",
            "fixed lg:relative inset-y-[57px] lg:inset-y-0 left-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:min-w-0 lg:overflow-hidden lg:border-r-0"
          )}>
            {/* Course header in sidebar */}
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                {coverImageUrl && (
                  <img src={coverImageUrl} alt={courseTitle} className="w-12 h-auto rounded-md shadow-sm shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">Online Course</p>
                  <p className="text-sm font-bold text-foreground truncate">{courseTitle}</p>
                </div>
              </div>
            </div>

            {/* Module list */}
            <nav className="py-2">
              {modules.map((mod, mi) => {
                const modCompleted = mod.lessons.every(l => completedLessons.has(l.id));
                const modLessonsDone = mod.lessons.filter(l => completedLessons.has(l.id)).length;
                const isActive = mi === selectedModuleIdx;

                return (
                  <div key={mod.id}>
                    <button
                      onClick={() => {
                        if (isActive) return;
                        setSelectedModuleIdx(mi);
                        setSelectedLessonIdx(0);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors text-sm",
                        isActive ? "bg-primary/5" : "hover:bg-accent/50"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                        modCompleted ? "bg-primary text-primary-foreground" : isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {modCompleted ? <Check className="h-3.5 w-3.5" /> : mi + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-semibold truncate text-xs",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {mod.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {modLessonsDone}/{mod.lessons.length} lessons
                          {mod.duration_minutes && ` · ${mod.duration_minutes} min`}
                        </p>
                      </div>
                    </button>

                    {/* Lessons under this module */}
                    {isActive && mod.lessons.map((lesson, li) => {
                      const lessonDone = completedLessons.has(lesson.id);
                      const isLessonActive = li === selectedLessonIdx;

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => goToLesson(mi, li)}
                          className={cn(
                            "w-full text-left pl-14 pr-4 py-2.5 flex items-center gap-2.5 transition-colors text-xs",
                            isLessonActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                          )}
                        >
                          {lessonDone ? (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          ) : isLessonActive ? (
                            <PlayCircle className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-border shrink-0" />
                          )}
                          <span className="truncate">{lesson.title}</span>
                          {lesson.quizzes.length > 0 && (
                            <ClipboardList className="h-3 w-3 text-muted-foreground/50 shrink-0 ml-auto" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Sidebar overlay on mobile */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/30 z-10 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* ─── Main Lesson Content ─── */}
          <main className="flex-1 overflow-y-auto">
            {currentLesson ? (
              <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-6">
                {/* Lesson header */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-primary">Module {selectedModuleIdx + 1}</span>
                    <ChevronRight className="h-3 w-3" />
                    <span>Lesson {selectedLessonIdx + 1} of {currentModule.lessons.length}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground leading-tight">{currentLesson.title}</h2>

                  {/* Learning objectives */}
                  {currentModule.learning_objectives && currentModule.learning_objectives.length > 0 && (
                    <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                      <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" /> Learning Objectives
                      </p>
                      <ul className="space-y-1">
                        {currentModule.learning_objectives.map((obj, i) => (
                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                            <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Video embed */}
                {currentLesson.video_url && (() => {
                  const url = currentLesson.video_url!;
                  const isEmbed = url.includes("youtube.com") || url.includes("youtu.be") ||
                    url.includes("vimeo.com") || url.includes("loom.com");
                  return (
                    <div className="aspect-video rounded-xl overflow-hidden border border-border bg-black">
                      {isEmbed ? (
                        <iframe
                          src={url}
                          className="w-full h-full"
                          allow="autoplay; fullscreen"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={url}
                          controls
                          className="w-full h-full object-contain"
                          preload="metadata"
                        />
                      )}
                    </div>
                  );
                })()}

                {/* Content tabs */}
                <Tabs defaultValue="lesson" className="w-full">
                  <TabsList className="w-full justify-start bg-muted/50 rounded-xl p-1">
                    <TabsTrigger value="lesson" className="text-xs rounded-lg gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Lesson
                    </TabsTrigger>
                    {currentLesson.summary && currentLesson.summary.length > 0 && (
                      <TabsTrigger value="summary" className="text-xs rounded-lg gap-1.5">
                        <ListChecks className="h-3.5 w-3.5" /> Summary
                      </TabsTrigger>
                    )}
                    {currentLesson.exercise && (
                      <TabsTrigger value="exercise" className="text-xs rounded-lg gap-1.5">
                        <ClipboardList className="h-3.5 w-3.5" /> Exercise
                      </TabsTrigger>
                    )}
                    {currentLesson.quizzes.length > 0 && (
                      <TabsTrigger value="quiz" className="text-xs rounded-lg gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5" /> Quiz ({currentLesson.quizzes.length})
                      </TabsTrigger>
                    )}
                    {currentLesson.resources && currentLesson.resources.length > 0 && (
                      <TabsTrigger value="resources" className="text-xs rounded-lg gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5" /> Resources
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* Lesson script */}
                  <TabsContent value="lesson" className="mt-4">
                    <div className="prose prose-sm max-w-none text-foreground">
                      <div className="whitespace-pre-line leading-relaxed text-sm">
                        {currentLesson.script || currentLesson.content || "No lesson content available yet."}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Summary */}
                  {currentLesson.summary && currentLesson.summary.length > 0 && (
                    <TabsContent value="summary" className="mt-4">
                      <div className="bg-card border border-border rounded-xl p-6 space-y-3">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" /> Key Takeaways
                        </h3>
                        <ul className="space-y-2.5">
                          {currentLesson.summary.map((point, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </div>
                              <p className="text-sm text-foreground leading-relaxed">{point}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </TabsContent>
                  )}

                  {/* Exercise */}
                  {currentLesson.exercise && (
                    <TabsContent value="exercise" className="mt-4">
                      <div className="bg-card border border-border rounded-xl p-6 space-y-3">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-primary" /> Practice Exercise
                        </h3>
                        <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                          {currentLesson.exercise}
                        </p>
                      </div>
                    </TabsContent>
                  )}

                  {/* Quiz */}
                  {currentLesson.quizzes.length > 0 && (
                    <TabsContent value="quiz" className="mt-4 space-y-4">
                      {currentLesson.quizzes.map((quiz, qi) => {
                        const answer = quizAnswers[quiz.id];
                        const hasSelected = answer?.selected != null;
                        const isRevealed = answer?.revealed;
                        const isCorrect = answer?.selected === quiz.correct_answer;

                        return (
                          <div key={quiz.id} className="bg-card border border-border rounded-xl p-6 space-y-4">
                            <div className="flex items-start gap-3">
                              <Badge variant="secondary" className="text-xs shrink-0">Q{qi + 1}</Badge>
                              <p className="text-sm font-semibold text-foreground">{quiz.question}</p>
                            </div>
                            <div className="space-y-2 pl-9">
                              {quiz.options.map((opt, oi) => {
                                const isSelected = answer?.selected === oi;
                                const isCorrectOption = oi === quiz.correct_answer;
                                let optionStyle = "border-border hover:border-primary/50 hover:bg-primary/5";
                                if (isRevealed) {
                                  if (isCorrectOption) optionStyle = "border-primary bg-primary/10 text-primary";
                                  else if (isSelected && !isCorrectOption) optionStyle = "border-destructive bg-destructive/10 text-destructive";
                                  else optionStyle = "border-border opacity-50";
                                } else if (isSelected) {
                                  optionStyle = "border-primary bg-primary/5";
                                }

                                return (
                                  <button
                                    key={oi}
                                    onClick={() => !isRevealed && handleQuizAnswer(quiz.id, oi)}
                                    disabled={isRevealed}
                                    className={cn(
                                      "w-full text-left rounded-lg border p-3 flex items-center gap-3 transition-all text-sm",
                                      optionStyle
                                    )}
                                  >
                                    <span className={cn(
                                      "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
                                      isRevealed && isCorrectOption ? "bg-primary border-primary text-primary-foreground" :
                                      isRevealed && isSelected ? "bg-destructive border-destructive text-destructive-foreground" :
                                      isSelected ? "bg-primary border-primary text-primary-foreground" :
                                      "border-muted-foreground/30"
                                    )}>
                                      {String.fromCharCode(65 + oi)}
                                    </span>
                                    <span>{opt}</span>
                                    {isRevealed && isCorrectOption && <Check className="h-4 w-4 text-primary ml-auto" />}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Check answer button */}
                            {hasSelected && !isRevealed && (
                              <div className="pl-9">
                                <Button
                                  onClick={() => revealQuizAnswer(quiz.id)}
                                  size="sm"
                                  className="rounded-full"
                                >
                                  Check Answer
                                </Button>
                              </div>
                            )}

                            {/* Explanation */}
                            {isRevealed && (
                              <div className={cn(
                                "ml-9 rounded-lg p-4 text-sm",
                                isCorrect ? "bg-primary/5 border border-primary/20" : "bg-destructive/5 border border-destructive/20"
                              )}>
                                <p className="font-semibold mb-1">
                                  {isCorrect ? "✅ Correct!" : "❌ Not quite."}
                                </p>
                                {quiz.explanation && (
                                  <p className="text-muted-foreground">{quiz.explanation}</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </TabsContent>
                  )}

                  {/* Resources */}
                  {currentLesson.resources && currentLesson.resources.length > 0 && (
                    <TabsContent value="resources" className="mt-4">
                      <div className="bg-card border border-border rounded-xl p-6 space-y-3">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-primary" /> Resources & Materials
                        </h3>
                        <ul className="space-y-2">
                          {currentLesson.resources.map((res, i) => {
                            const resource = typeof res === "string"
                              ? { title: res, url: "" }
                              : { title: res?.title || "", url: res?.url || "" };
                            return (
                              <li key={i} className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="pt-1">
                                  {resource.url ? (
                                    <a
                                      href={resource.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary hover:underline font-medium"
                                    >
                                      {resource.title || resource.url}
                                    </a>
                                  ) : (
                                    <p className="text-sm text-foreground">{resource.title}</p>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>

                {/* Bottom actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button
                    variant={completedLessons.has(currentLesson.id) ? "outline" : "default"}
                    onClick={() => markLessonComplete(currentLesson.id)}
                    className="rounded-full gap-2"
                  >
                    {completedLessons.has(currentLesson.id) ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Completed
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" /> Mark Complete
                      </>
                    )}
                  </Button>

                  {!isLastLesson && (
                    <Button
                      variant="ghost"
                      onClick={goToNextLesson}
                      className="rounded-full gap-2 text-primary hover:text-primary"
                    >
                      Next Lesson <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Completion celebration */}
                {progressPercent === 100 && (
                  <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-2xl p-8 text-center space-y-4 mt-8">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                      <Trophy className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">🎉 Course Complete!</h3>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      Congratulations! You've completed all {totalLessons} lessons. Your dedication to learning is truly impressive.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center py-20">
                <div className="text-center space-y-3">
                  <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                  <p className="text-muted-foreground">Select a lesson to begin</p>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
