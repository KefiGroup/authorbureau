import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { splitSalesAndContent } from "@/hooks/useBuilderGeneration";
import MarkdownRenderer from "../MarkdownRenderer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Monitor, Smartphone, ChevronLeft, ChevronRight,
  BookOpen, Clock, CalendarDays, Award, Send, Save, Loader2,
  DollarSign, Edit3, Eye, CheckCircle2, FileText, GraduationCap,
  Plus, X,
} from "lucide-react";
import type { StudyDay } from "../builders/shared/homeStudyTypes";

interface HomeStudyReviewViewProps {
  productId: string;
  bookId: string;
  bookTitle: string;
  productTitle: string;
  productTable: string;
  onBack: () => void;
  onPublished: () => void;
}

const getActionPlanFallback = (day: Partial<StudyDay>) => {
  const reading = day.reading || day.chapterRef || "today's assigned chapter";
  const exercise = day.exercise || "Complete today's exercise";
  const reflection = day.reflection || "Write your daily reflection";

  const exerciseShort = exercise.split(/[.!?\n]/).find(Boolean)?.trim() || exercise;
  const reflectionShort = reflection.split(/[!?\n]/).find(Boolean)?.trim() || reflection;

  return [
    `- [ ] Complete today's reading: ${reading}`,
    `- [ ] Do today's exercise: ${exerciseShort}`,
    `- [ ] Journal your reflection: ${reflectionShort}`,
  ].join("\n");
};

const normalizeStudyDay = (day: StudyDay): StudyDay => {
  const actionPlan =
    (day as any).actionPlan ||
    (day as any).action_plan ||
    (day as any).actionItems ||
    (day as any).action_items ||
    "";

  return {
    ...day,
    actionPlan: String(actionPlan).trim() || getActionPlanFallback(day),
  };
};

export default function HomeStudyReviewView({
  productId, bookId, bookTitle, productTitle, productTable, onBack, onPublished,
}: HomeStudyReviewViewProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState<"sales" | "content" | null>(null);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewPage, setPreviewPage] = useState(0);

  // Data
  const [setup, setSetup] = useState<Record<string, any>>({});
  const [days, setDays] = useState<StudyDay[]>([]);
  const [rawDraftContent, setRawDraftContent] = useState<string>("");
  const [fullCourseMarkdown, setFullCourseMarkdown] = useState<string>("");
  const [salesPageMarkdown, setSalesPageMarkdown] = useState<string>("");

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [commitment, setCommitment] = useState("30");
  const [level, setLevel] = useState("Beginner");

  // Structured sales page fields
  const [salesHeadline, setSalesHeadline] = useState("");
  const [salesSubheadline, setSalesSubheadline] = useState("");
  const [salesBody, setSalesBody] = useState("");
  const [salesBullets, setSalesBullets] = useState<string[]>([""]);
  const [salesTestimonials, setSalesTestimonials] = useState<{ name: string; quote: string }[]>([]);
  const [salesCta, setSalesCta] = useState("Enroll Now");
  const [salesFaqs, setSalesFaqs] = useState<{ question: string; answer: string }[]>([]);

  // Drawer-local draft for sales page markdown (kept for serialization)
  const [salesDraft, setSalesDraft] = useState("");

  const loadContent = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");

      const resp = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-draft-state`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            action: "get-product-detail",
            productId,
            table: productTable,
            nodeId: "home-study-course",
            bookId,
          }),
        }
      );
      const result = await resp.json();

      const courseRecord = result.product || null;
      const draftContentRaw = result.draftContent || null;
      const generatedContentRaw = result.generatedContent || null;
      const salesPageRaw = result.salesPageContent || null;

      let draftSetup: Record<string, any> = {};
      let nextDays: StudyDay[] = [];
      let nextRawDraftContent = "";

      if (draftContentRaw) {
        nextRawDraftContent = draftContentRaw;
        try {
          const parsed = JSON.parse(draftContentRaw);
          const sd = parsed?.stepData || {};
          draftSetup = sd.setup || {};
          nextDays = Array.isArray(sd.schedule?.days) ? sd.schedule.days : [];
        } catch (parseError) {
          console.error("Failed to parse home study draft asset:", parseError);
        }
      }

      if (!nextDays.length && courseRecord?.study_schedule_json) {
        const tableSchedule = courseRecord.study_schedule_json;
        if (Array.isArray(tableSchedule)) {
          nextDays = tableSchedule as StudyDay[];
        } else if (Array.isArray(tableSchedule?.days)) {
          nextDays = tableSchedule.days as StudyDay[];
        }
      }

      if (!nextDays.length && courseRecord?.content_markdown) {
        try {
          const parsed = JSON.parse(courseRecord.content_markdown);
          if (Array.isArray(parsed)) {
            nextDays = parsed as StudyDay[];
          }
        } catch (error) {
          // It's real markdown, not JSON
        }
      }

      const mergedSetup = {
        ...draftSetup,
        title: draftSetup.title || courseRecord?.title || productTitle,
        description: draftSetup.description || courseRecord?.description || "",
        price: draftSetup.price ?? courseRecord?.price ?? "",
        duration: draftSetup.duration || courseRecord?.duration_days || nextDays.length || 30,
        commitment: draftSetup.commitment || 30,
        level: draftSetup.level || "Beginner",
      };

      let markdownFallback = generatedContentRaw || "";
      if (!markdownFallback && courseRecord?.content_markdown) {
        try {
          JSON.parse(courseRecord.content_markdown);
        } catch (error) {
          markdownFallback = courseRecord.content_markdown;
        }
      }

      setRawDraftContent(nextRawDraftContent);
      setSetup(mergedSetup);
      setDays(nextDays.map(normalizeStudyDay));
      setFullCourseMarkdown(markdownFallback);
      setSalesPageMarkdown(salesPageRaw || "");
      setTitle(mergedSetup.title || productTitle);
      setDescription(mergedSetup.description || "");
      setPrice(mergedSetup.price !== "" && mergedSetup.price !== null && mergedSetup.price !== undefined ? String(mergedSetup.price) : "");
      setCommitment(mergedSetup.commitment ? String(mergedSetup.commitment) : "30");
      setLevel(mergedSetup.level || "Beginner");
    } catch (err) {
      console.error("Failed to load home study content:", err);
      toast({ title: "Could not load Home Study content", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, productTable, productId, bookId, productTitle]);

  useEffect(() => {
    if (!user) return;
    void loadContent();
  }, [user, loadContent]);

  const hasStructuredDays = days.length > 0;
  const splitFromCombined = splitSalesAndContent(fullCourseMarkdown);
  const effectiveSalesPage = salesPageMarkdown.trim() || splitFromCombined.salesPageText;
  const effectiveContent = splitFromCombined.contentText || fullCourseMarkdown;
  const fullCourseText = effectiveContent.trim();
  const hasSalesPage = effectiveSalesPage.trim().length > 50;
  const hasFullManuscript = /day\s*1/i.test(fullCourseText) || fullCourseText.length > 2000;
  const canPublish = hasStructuredDays || hasFullManuscript;

  const duration = hasStructuredDays ? days.length : Number(setup.duration) || 30;
  const totalPages = hasStructuredDays ? days.length + 2 : 1;
  const currentDay = hasStructuredDays && previewPage > 0 && previewPage <= days.length ? days[previewPage - 1] : null;
  const isCertPage = hasStructuredDays && previewPage === totalPages - 1;

  useEffect(() => {
    setPreviewPage((prev) => Math.min(prev, Math.max(totalPages - 1, 0)));
  }, [totalPages]);

  const stripMd = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/_(.+?)_/g, "$1").replace(/`(.+?)`/g, "$1").replace(/^#+\s*/gm, "").replace(/^\s*>\s*/gm, "").trim();

  const openSalesEditor = useCallback(() => {
    const md = effectiveSalesPage || "";
    if (md.trim()) {
      const lines = md.split("\n").filter(l => l.trim());
      const h1 = lines.find(l => /^##?\s/.test(l));
      setSalesHeadline(stripMd(h1 || title || ""));
      const h2 = lines.find(l => /^###\s/.test(l));
      setSalesSubheadline(stripMd(h2 || ""));
      const bullets = lines.filter(l => /^[-*]\s/.test(l)).map(l => stripMd(l.replace(/^[-*]\s*/, "")));
      setSalesBullets(bullets.length > 0 ? bullets : [""]);
      // Filter out headings, bullets, blockquotes, Q&A lines, testimonial attributions, and section labels
      const isNoise = (l: string) =>
        l.startsWith("#") || l.startsWith("-") || l.startsWith("*") || l.startsWith(">") ||
        /^[QA]:\s/i.test(l) || /^—\s/.test(l) || /^\*\*[QA]:/i.test(l) ||
        /^(frequently asked|faq|testimonial|what others say|what's included)/i.test(l.replace(/^[#*\s]+/, ""));
      const bodyLines = lines.filter(l => !isNoise(l));
      setSalesBody(stripMd(bodyLines.join("\n")));
      const quoteLines = lines.filter(l => l.startsWith(">"));
      const testimonials = quoteLines.map(q => ({ name: "", quote: stripMd(q.replace(/^>\s*/, "").replace(/^"/, "").replace(/"$/, "")) }));
      setSalesTestimonials(testimonials.length > 0 ? testimonials : []);
      // Extract FAQ pairs (Q: ... A: ...)
      const faqs: { question: string; answer: string }[] = [];
      for (let i = 0; i < lines.length; i++) {
        const qMatch = lines[i].match(/^\*{0,2}Q:\s*(.*)/i) || lines[i].match(/^\*{0,2}Question:\s*(.*)/i);
        if (qMatch) {
          const aLine = lines[i + 1];
          const aMatch = aLine?.match(/^\*{0,2}A:\s*(.*)/i) || aLine?.match(/^\*{0,2}Answer:\s*(.*)/i);
          faqs.push({ question: stripMd(qMatch[1].replace(/\*+$/g, "").trim()), answer: aMatch ? stripMd(aMatch[1].replace(/\*+$/g, "").trim()) : "" });
        }
      }
      setSalesFaqs(faqs);
      setSalesCta("Enroll Now");
    } else {
      setSalesHeadline(title || productTitle || "");
      setSalesSubheadline(description ? description.slice(0, 120) : `A ${duration}-day guided self-study program`);
      setSalesBody(description || `Transform your understanding with this structured ${duration}-day home study program based on "${bookTitle}". Each day includes focused reading, practical exercises, guided reflection, and a concrete action plan.`);
      setSalesBullets([
        `${duration} days of structured daily lessons`,
        "Guided exercises and reflection prompts",
        "Actionable daily plans you can implement immediately",
        "Certificate of completion",
      ]);
      setSalesTestimonials([]);
      setSalesFaqs([]);
      setSalesCta("Enroll Now");
    }
    setSalesDraft(md);
    setDrawerOpen("sales");
  }, [effectiveSalesPage, title, productTitle, description, duration, bookTitle]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const parsed = rawDraftContent ? JSON.parse(rawDraftContent) : { stepData: {} };
      parsed.stepData = parsed.stepData || {};
      parsed.stepData.setup = {
        ...parsed.stepData.setup,
        title, description, price, commitment: parseInt(commitment), level,
      };
      const newContent = JSON.stringify(parsed);
      setRawDraftContent(newContent);
      setSetup(parsed.stepData.setup);

      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");

      await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-draft-state`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            action: "save",
            bookId,
            nodeId: "home-study-course",
            payload: {
              currentStep: parsed.currentStep || 0,
              stepData: parsed.stepData,
              editedSteps: parsed.editedSteps || [],
            },
          }),
        }
      );

      toast({ title: "Saved!", description: "Your changes have been saved." });
      setDrawerOpen(null);
    } catch (error) {
      toast({ title: "Save failed", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleSaveSalesPage = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Serialize structured fields to markdown
      const parts: string[] = [];
      if (salesHeadline) parts.push(`## ${salesHeadline}`);
      if (salesSubheadline) parts.push(`### ${salesSubheadline}`);
      if (salesBody) parts.push("", salesBody);
      const validBullets = salesBullets.filter(b => b.trim());
      if (validBullets.length > 0) {
        parts.push("", "**What's Included:**", ...validBullets.map(b => `- ${b}`));
      }
      if (salesTestimonials.length > 0) {
        parts.push("", "**What Others Say:**");
        salesTestimonials.forEach(t => {
          parts.push(`> "${t.quote}"${t.name ? ` — ${t.name}` : ""}`);
        });
      }
      if (salesFaqs.length > 0) {
        parts.push("", "**Frequently Asked Questions:**");
        salesFaqs.forEach(f => {
          parts.push(`**Q: ${f.question}**`, `A: ${f.answer}`, "");
        });
      }
      const serialized = parts.join("\n");
      setSalesPageMarkdown(serialized);
      setSalesDraft(serialized);

      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");

      await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-draft-state`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            action: "save-sales-page",
            bookId,
            nodeId: "home-study-course",
            content: serialized,
          }),
        }
      );

      toast({ title: "Sales page saved!" });
      setDrawerOpen(null);
    } catch (error) {
      toast({ title: "Save failed", variant: "destructive" });
    }
    setSaving(false);
  };

  const handlePublish = async () => {
    if (!canPublish) {
      toast({
        title: "Home Study content is incomplete",
        description: "Generate your daily lessons in the Home Study Builder before publishing.",
        variant: "destructive",
      });
      return;
    }

    setPublishing(true);
    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");

      const resp = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-draft-state`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "publish-product", productId, table: productTable }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Publish failed");

      toast({ title: "Published! ✅", description: `${title} is now live on your microsite.` });
      onPublished();
    } catch (err) {
      toast({ title: "Publish failed", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
    }
    setPublishing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Review
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="font-heading text-xl font-bold">{title || "Home Study Course"}</h1>
            <p className="text-xs text-muted-foreground">{bookTitle} · Home Study Course</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openSalesEditor()}
          >
            <FileText className="h-3.5 w-3.5 mr-1" /> Edit Sales Page
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDrawerOpen("content")}
          >
            <GraduationCap className="h-3.5 w-3.5 mr-1" /> Edit Content
          </Button>
        </div>
      </div>

      {/* ── PREVIEW MODE ──────────────────────────────────── */}
      <div className="space-y-4">
        {hasStructuredDays ? (
          <>
            {/* View toggle + pagination */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewPage(Math.max(0, previewPage - 1))} disabled={previewPage === 0} className="text-xs">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {previewPage + 1} of {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPreviewPage(Math.min(totalPages - 1, previewPage + 1))} disabled={previewPage === totalPages - 1} className="text-xs">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
                <button onClick={() => setViewMode("desktop")} className={`p-1.5 ${viewMode === "desktop" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}>
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setViewMode("mobile")} className={`p-1.5 ${viewMode === "mobile" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}>
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Course Preview */}
            <div className={`mx-auto border border-border rounded-xl overflow-hidden bg-card shadow-lg ${viewMode === "mobile" ? "max-w-sm" : "max-w-2xl"}`}>
              {previewPage === 0 ? (
                /* Cover */
                <div className="bg-gradient-to-b from-secondary/10 to-transparent p-8 text-center min-h-[450px] flex flex-col items-center justify-center">
                  <Badge variant="secondary" className="text-[10px] mb-4">
                    {duration}-Day Program
                  </Badge>
                  <h1 className="font-heading text-2xl font-bold mb-2">{title || "Home Study Course"}</h1>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md">{description || "A guided self-paced learning experience"}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {duration} days</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {commitment} min/day</span>
                    <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {level}</span>
                  </div>
                  {price && (
                    <div className="mt-4">
                      <Badge className="bg-secondary text-secondary-foreground text-sm px-4 py-1">${price}</Badge>
                    </div>
                  )}
                  <div className="mt-6 p-4 bg-muted/30 rounded-lg max-w-sm">
                    <p className="text-xs text-muted-foreground">
                      <strong>How to use this guide:</strong> Spend {commitment} minutes each day completing the reading,
                      exercise, and reflection. Check off each day on your progress tracker.
                    </p>
                  </div>
                </div>
              ) : isCertPage ? (
                /* Certificate */
                <div className="p-8 text-center min-h-[450px] flex flex-col items-center justify-center">
                  <Award className="h-12 w-12 text-secondary mb-4" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">Certificate of Completion</p>
                  <h2 className="font-heading text-xl font-bold mb-1">{title || "Home Study Course"}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{duration}-Day Program</p>
                  <div className="border-t border-b border-border py-3 my-4 w-48">
                    <p className="text-xs text-muted-foreground">[Student Name]</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Completed on [Date]</p>
                </div>
              ) : currentDay ? (
                /* Day page */
                <div className="p-6 min-h-[450px]">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant={currentDay.isCatchUp ? "outline" : "secondary"} className="text-[10px]">
                      {currentDay.isCatchUp ? "☕ Catch-Up Day" : `Day ${currentDay.dayNumber}`}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">Week {currentDay.weekNumber}</span>
                  </div>
                  <h3 className="font-heading text-lg font-bold mb-4">{currentDay.theme}</h3>
                  <div className="space-y-4">
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">📖 Today's Reading</p>
                      <p className="text-xs">{currentDay.reading || currentDay.chapterRef}</p>
                    </div>
                    {currentDay.concept && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">💡 Key Concept</p>
                        <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-6">{currentDay.concept}</p>
                      </div>
                    )}
                    <div className="p-3 bg-accent/5 rounded-lg border border-accent/10">
                      <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">🏋️ Exercise</p>
                      <p className="text-xs text-muted-foreground">{currentDay.exercise}</p>
                    </div>
                    <div className="p-3 bg-secondary/10 rounded-lg border border-secondary/20">
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">🪞 Reflection</p>
                      <p className="text-xs text-muted-foreground">{currentDay.reflection}</p>
                    </div>
                    {currentDay.actionPlan && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">🎯 Action Plan</p>
                        <p className="text-xs text-muted-foreground whitespace-pre-line">{currentDay.actionPlan}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-2">
                      <div className="w-5 h-5 rounded border-2 border-muted-foreground/20" />
                      <span className="text-xs text-muted-foreground">I completed Day {currentDay.dayNumber}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Quick page thumbnails */}
            <div className="flex items-center gap-1 justify-center flex-wrap">
              <button
                onClick={() => setPreviewPage(0)}
                className={`text-[9px] px-2 py-1 rounded ${previewPage === 0 ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                Cover
              </button>
              {days.slice(0, 15).map((day, idx) => (
                <button
                  key={day.id || idx}
                  onClick={() => setPreviewPage(idx + 1)}
                  className={`text-[9px] px-2 py-1 rounded ${previewPage === idx + 1 ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  {day.isCatchUp ? "☕" : `D${day.dayNumber}`}
                </button>
              ))}
              {days.length > 15 && <span className="text-[9px] text-muted-foreground">+{days.length - 15} more</span>}
              <button
                onClick={() => setPreviewPage(totalPages - 1)}
                className={`text-[9px] px-2 py-1 rounded ${isCertPage ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                Certificate
              </button>
            </div>
          </>
        ) : (
          <Card className="border-border overflow-hidden">
            <div className="border-b border-border bg-muted/30 p-4">
              <p className="text-sm font-semibold">Full Home Study Course Preview</p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasFullManuscript
                  ? "Showing your complete generated Home Study curriculum."
                  : "No day-by-day lessons were found yet. Go back to the Home Study Builder to generate the daily schedule and content."}
              </p>
              {hasSalesPage && (
                <p className="text-xs text-muted-foreground mt-2">Sales page and course content are shown in separate sections below.</p>
              )}
            </div>
            <div className="max-h-[68vh] overflow-y-auto p-6">
              {hasFullManuscript ? (
                hasSalesPage ? (
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">📄 Sales Page</p>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownRenderer content={effectiveSalesPage} />
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">📚 Home Study Content</p>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownRenderer content={effectiveContent} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <MarkdownRenderer content={effectiveContent} />
                  </div>
                )
              ) : (
                <div className="py-12 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">This draft currently only has setup details (cover + certificate metadata).</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Bottom action bar */}
      <Card className="p-4 flex items-center justify-between bg-muted/30 border-secondary/20">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-secondary" />
          <div>
            <p className="text-sm font-semibold">
              {hasStructuredDays
                ? `${days.length} days of structured content`
                : hasFullManuscript
                ? "Full curriculum manuscript loaded"
                : "Home Study draft is incomplete"}
            </p>
            <p className="text-xs text-muted-foreground">
              {price ? `$${price} · ` : ""}
              {commitment} min/day · {level}
              {!canPublish ? " · Publish disabled until lessons are generated" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openSalesEditor()}>
            <FileText className="h-3.5 w-3.5 mr-1" /> Edit Sales Page
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDrawerOpen("content")}>
            <GraduationCap className="h-3.5 w-3.5 mr-1" /> Edit Content
          </Button>
          {canPublish && (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={publishing}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Publish to Microsite
            </Button>
          )}
        </div>
      </Card>

      {/* ── EDIT SALES PAGE DIALOG ──────────────────────── */}
      <Dialog open={drawerOpen === "sales"} onOpenChange={(open) => !open && setDrawerOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Edit Sales Page
            </DialogTitle>
            <DialogDescription>
              Edit the sales copy that buyers see before purchasing your Home Study Course.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div>
              <Label className="text-xs font-semibold">Headline</Label>
              <Input
                value={salesHeadline}
                onChange={(e) => setSalesHeadline(e.target.value)}
                placeholder="e.g. Transform Your Setbacks into Your Greatest Strengths"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Subheadline</Label>
              <Input
                value={salesSubheadline}
                onChange={(e) => setSalesSubheadline(e.target.value)}
                placeholder="e.g. A 21-day guided challenge to unlock your potential"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Body Copy</Label>
              <Textarea
                value={salesBody}
                onChange={(e) => setSalesBody(e.target.value)}
                rows={12}
                className="mt-1 text-sm"
                placeholder="Describe your program, who it's for, and the transformation they'll experience..."
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-2 block">What's Included (Bullet Points)</Label>
              <div className="space-y-2">
                {salesBullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">•</span>
                    <Input
                      value={bullet}
                      onChange={(e) => {
                        const updated = [...salesBullets];
                        updated[idx] = e.target.value;
                        setSalesBullets(updated);
                      }}
                      placeholder="e.g. 21 days of guided exercises"
                      className="flex-1 h-8 text-sm"
                    />
                    {salesBullets.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                        onClick={() => setSalesBullets(salesBullets.filter((_, i) => i !== idx))}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="text-xs"
                  onClick={() => setSalesBullets([...salesBullets, ""])}>
                  <Plus className="h-3 w-3 mr-1" /> Add Bullet
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-2 block">Testimonials (Optional)</Label>
              <div className="space-y-3">
                {salesTestimonials.map((t, idx) => (
                  <div key={idx} className="p-3 border border-border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-muted-foreground">Quote #{idx + 1}</Label>
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => setSalesTestimonials(salesTestimonials.filter((_, i) => i !== idx))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <Textarea
                      value={t.quote}
                      onChange={(e) => {
                        const updated = [...salesTestimonials];
                        updated[idx] = { ...updated[idx], quote: e.target.value };
                        setSalesTestimonials(updated);
                      }}
                      rows={2}
                      className="text-sm"
                      placeholder="This program changed my life..."
                    />
                    <Input
                      value={t.name}
                      onChange={(e) => {
                        const updated = [...salesTestimonials];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        setSalesTestimonials(updated);
                      }}
                      placeholder="Name (e.g. Sarah M.)"
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
                <Button variant="outline" size="sm" className="text-xs"
                  onClick={() => setSalesTestimonials([...salesTestimonials, { name: "", quote: "" }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add Testimonial
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-2 block">FAQ (Optional)</Label>
              <div className="space-y-3">
                {salesFaqs.map((f, idx) => (
                  <div key={idx} className="p-3 border border-border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-muted-foreground">Question #{idx + 1}</Label>
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => setSalesFaqs(salesFaqs.filter((_, i) => i !== idx))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <Input
                      value={f.question}
                      onChange={(e) => {
                        const updated = [...salesFaqs];
                        updated[idx] = { ...updated[idx], question: e.target.value };
                        setSalesFaqs(updated);
                      }}
                      placeholder="e.g. How long do I have access?"
                      className="h-8 text-sm"
                    />
                    <Textarea
                      value={f.answer}
                      onChange={(e) => {
                        const updated = [...salesFaqs];
                        updated[idx] = { ...updated[idx], answer: e.target.value };
                        setSalesFaqs(updated);
                      }}
                      rows={2}
                      className="text-sm"
                      placeholder="Answer..."
                    />
                  </div>
                ))}
                <Button variant="outline" size="sm" className="text-xs"
                  onClick={() => setSalesFaqs([...salesFaqs, { question: "", answer: "" }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add FAQ
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">CTA Button Text</Label>
              <Input
                value={salesCta}
                onChange={(e) => setSalesCta(e.target.value)}
                placeholder="Enroll Now"
                className="mt-1 h-8"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveSalesPage} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save Sales Page
              </Button>
              <Button variant="outline" onClick={() => setDrawerOpen(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── EDIT CONTENT DIALOG ─────────────────────────── */}
      <Dialog open={drawerOpen === "content"} onOpenChange={(open) => !open && setDrawerOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> Edit Course Content
            </DialogTitle>
            <DialogDescription>
              Update course details, pricing, and review the daily curriculum structure.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-2">
            {/* Course details */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course Details</h4>
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={9} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Price ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={price} onChange={e => setPrice(e.target.value)} className="pl-8" placeholder="47" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Daily Commitment (min)</Label>
                  <Input value={commitment} onChange={e => setCommitment(e.target.value)} type="number" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Level</Label>
                <Input value={level} onChange={e => setLevel(e.target.value)} placeholder="Beginner" />
              </div>
            </div>

            <Separator />

            {/* Course summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground text-xs">Total Days</span>
                  <span className="font-medium text-xs">{days.length}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground text-xs">Weeks</span>
                  <span className="font-medium text-xs">{days.length > 0 ? days[days.length - 1]?.weekNumber || Math.ceil(days.length / 7) : 0}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground text-xs">Catch-Up Days</span>
                  <span className="font-medium text-xs">{days.filter(d => d.isCatchUp).length}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground text-xs">Study Days</span>
                  <span className="font-medium text-xs">{days.filter(d => !d.isCatchUp).length}</span>
                </div>
              </div>
            </div>

            {/* Daily themes list */}
            {days.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Daily Themes</h4>
                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                    {days.map(day => (
                      <div key={day.id || day.dayNumber} className="flex items-center gap-2 text-xs py-1.5 border-b border-border/50">
                        <Badge variant={day.isCatchUp ? "outline" : "secondary"} className="text-[9px] w-14 justify-center shrink-0">
                          {day.isCatchUp ? "☕ Rest" : `Day ${day.dayNumber}`}
                        </Badge>
                        <span className="truncate text-muted-foreground">{day.theme}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setDrawerOpen(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
