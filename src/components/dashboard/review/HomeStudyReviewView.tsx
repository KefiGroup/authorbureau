import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import MarkdownRenderer from "../MarkdownRenderer";
import {
  ArrowLeft, Monitor, Smartphone, ChevronLeft, ChevronRight,
  BookOpen, Clock, CalendarDays, Award, Send, Save, Loader2,
  DollarSign, Edit3, Eye, CheckCircle2,
} from "lucide-react";
import type { StudyDay } from "../builders/home-study/types";

interface HomeStudyReviewViewProps {
  productId: string;
  bookId: string;
  bookTitle: string;
  productTitle: string;
  productTable: string;
  onBack: () => void;
  onPublished: () => void;
}

const DRAFT_ASSET_TYPE = "builder_draft_home-study-course";
const CONTENT_ASSET_TYPE = "builder_content_home-study-course";

export default function HomeStudyReviewView({
  productId, bookId, bookTitle, productTitle, productTable, onBack, onPublished,
}: HomeStudyReviewViewProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewPage, setPreviewPage] = useState(0);

  // Data
  const [setup, setSetup] = useState<Record<string, any>>({});
  const [days, setDays] = useState<StudyDay[]>([]);
  const [rawDraftContent, setRawDraftContent] = useState<string>("");
  const [fullCourseMarkdown, setFullCourseMarkdown] = useState<string>("");

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [commitment, setCommitment] = useState("30");
  const [level, setLevel] = useState("Beginner");

  useEffect(() => {
    if (!user) return;
    void loadContent();
  }, [user, bookId, productId, productTable, productTitle]);

  const loadContent = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const coursePromise =
        productTable === "home_study_courses"
          ? supabase
              .from("home_study_courses")
              .select("title, description, price, duration_days, study_schedule_json, content_markdown")
              .eq("id", productId)
              .eq("author_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null });

      const [assetsResult, courseResult] = await Promise.all([
        supabase
          .from("generated_assets")
          .select("asset_type, content")
          .eq("author_id", user.id)
          .eq("book_id", bookId)
          .in("asset_type", [DRAFT_ASSET_TYPE, CONTENT_ASSET_TYPE]),
        coursePromise,
      ]);

      if (assetsResult.error) throw assetsResult.error;

      const assets = assetsResult.data || [];
      const draftAsset = assets.find((asset) => asset.asset_type === DRAFT_ASSET_TYPE);
      const contentAsset = assets.find((asset) => asset.asset_type === CONTENT_ASSET_TYPE);
      const courseRecord = (courseResult as any)?.data ?? null;

      let nextSetup: Record<string, any> = {};
      let nextDays: StudyDay[] = [];
      let nextRawDraftContent = "";

      if (draftAsset?.content) {
        nextRawDraftContent = draftAsset.content;
        try {
          const parsed = JSON.parse(draftAsset.content);
          const sd = parsed?.stepData || {};
          nextSetup = sd.setup || {};
          nextDays = Array.isArray(sd.schedule?.days) ? sd.schedule.days : [];
        } catch (parseError) {
          console.error("Failed to parse home study draft asset:", parseError);
        }
      }

      if (!nextDays.length) {
        const tableSchedule = courseRecord?.study_schedule_json;
        if (Array.isArray(tableSchedule)) {
          nextDays = tableSchedule as StudyDay[];
        } else if (Array.isArray(tableSchedule?.days)) {
          nextDays = tableSchedule.days as StudyDay[];
        }
      }

      const mergedSetup = {
        ...nextSetup,
        title: nextSetup.title || courseRecord?.title || productTitle,
        description: nextSetup.description || courseRecord?.description || "",
        price: nextSetup.price ?? courseRecord?.price ?? "",
        duration: nextSetup.duration || courseRecord?.duration_days || 30,
      };

      const markdownFallback =
        contentAsset?.content ||
        courseRecord?.content_markdown ||
        "";

      setRawDraftContent(nextRawDraftContent);
      setSetup(mergedSetup);
      setDays(nextDays);
      setFullCourseMarkdown(markdownFallback);
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
  };

  const hasStructuredDays = days.length > 0;
  const fullCourseText = fullCourseMarkdown.trim();
  const hasFullManuscript = /day\s*1/i.test(fullCourseText) || fullCourseText.length > 2000;
  const canPublish = hasStructuredDays || hasFullManuscript;

  const duration = hasStructuredDays ? days.length : Number(setup.duration) || 30;
  const totalPages = hasStructuredDays ? days.length + 2 : 1;
  const currentDay = hasStructuredDays && previewPage > 0 && previewPage <= days.length ? days[previewPage - 1] : null;
  const isCertPage = hasStructuredDays && previewPage === totalPages - 1;

  useEffect(() => {
    setPreviewPage((prev) => Math.min(prev, Math.max(totalPages - 1, 0)));
  }, [totalPages]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Update the draft with new editable fields
      const parsed = rawDraftContent ? JSON.parse(rawDraftContent) : { stepData: {} };
      parsed.stepData = parsed.stepData || {};
      parsed.stepData.setup = {
        ...parsed.stepData.setup,
        title, description, price, commitment: parseInt(commitment), level,
      };
      const newContent = JSON.stringify(parsed);
      setRawDraftContent(newContent);
      setSetup(parsed.stepData.setup);

      await supabase
        .from("generated_assets")
        .update({ content: newContent, updated_at: new Date().toISOString() })
        .eq("author_id", user.id)
        .eq("book_id", bookId)
        .eq("asset_type", "builder_draft_home-study-course");

      toast({ title: "Saved!", description: "Your changes have been saved." });
      setMode("preview");
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
    setSaving(false);
  };

  const handlePublish = async () => {
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
            variant={mode === "preview" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("preview")}
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> Preview
          </Button>
          <Button
            variant={mode === "edit" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("edit")}
          >
            <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit Details
          </Button>
        </div>
      </div>

      {mode === "edit" ? (
        /* ── EDIT MODE ──────────────────────────────────────── */
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6 space-y-4">
            <h3 className="font-heading font-semibold text-sm">Course Details</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} />
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
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setMode("preview")}>Cancel</Button>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-heading font-semibold text-sm">Course Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Total Days</span>
                <span className="font-medium">{days.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Weeks</span>
                <span className="font-medium">{days.length > 0 ? days[days.length - 1]?.weekNumber || Math.ceil(days.length / 7) : 0}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Catch-Up Days</span>
                <span className="font-medium">{days.filter(d => d.isCatchUp).length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Study Days</span>
                <span className="font-medium">{days.filter(d => !d.isCatchUp).length}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Revenue (20 students/mo)</span>
                <span className="font-bold text-secondary">${price ? parseInt(price) * 20 : 0}/mo</span>
              </div>
            </div>

            {/* Day list */}
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Daily Themes</h4>
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                {days.map(day => (
                  <div key={day.id || day.dayNumber} className="flex items-center gap-2 text-xs py-1 border-b border-border/50">
                    <Badge variant={day.isCatchUp ? "outline" : "secondary"} className="text-[9px] w-14 justify-center shrink-0">
                      {day.isCatchUp ? "☕ Rest" : `Day ${day.dayNumber}`}
                    </Badge>
                    <span className="truncate text-muted-foreground">{day.theme}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        /* ── PREVIEW MODE ─────────────────────────────────── */
        <div className="space-y-4">
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
                  {days.length}-Day Program
                </Badge>
                <h1 className="font-heading text-2xl font-bold mb-2">{title || "Home Study Course"}</h1>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">{description || "A guided self-paced learning experience"}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {days.length} days</span>
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
                <p className="text-sm text-muted-foreground mb-4">{days.length}-Day Program</p>
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
                  <div className="p-3 bg-violet-500/5 rounded-lg border border-violet-500/10">
                    <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1">🪞 Reflection</p>
                    <p className="text-xs text-muted-foreground">{currentDay.reflection}</p>
                  </div>
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
        </div>
      )}

      {/* Bottom action bar */}
      <Card className="p-4 flex items-center justify-between bg-muted/30 border-secondary/20">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-secondary" />
          <div>
            <p className="text-sm font-semibold">{days.length} days of structured content</p>
            <p className="text-xs text-muted-foreground">
              {price ? `$${price} · ` : ""}
              {commitment} min/day · {level}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMode("edit")}>
            <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishing}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Publish to Microsite
          </Button>
        </div>
      </Card>
    </div>
  );
}
