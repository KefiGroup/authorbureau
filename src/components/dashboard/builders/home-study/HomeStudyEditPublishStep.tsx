import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Sparkles, Loader2, BookOpen, Wand2,
  ChevronLeft, ChevronRight, CalendarDays, CheckCircle2,
  Clock, Palette, Eye, ShoppingCart, Monitor, Smartphone,
  Award,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateJSONWithAI } from "@/lib/ai-generate";
import type { HomeStudyStepProps, StudyDay } from "./types";
import SharedSalesCopyEditor from "../shared/SharedSalesCopyEditor";
import SharedSalesCopyPreview from "../shared/SharedSalesCopyPreview";
import { DEFAULT_SALES_COPY, type SalesCopyData } from "../shared/salesCopyTypes";


const SEGMENTS = [
  { id: "schedule", label: "Duration & Frequency", icon: Clock, num: 1 },
  { id: "sales", label: "Sales & Pricing", icon: ShoppingCart, num: 2 },
  { id: "design", label: "Portal Design", icon: Palette, num: 3 },
  { id: "preview", label: "Preview", icon: Eye, num: 4 },
] as const;

type SegmentId = (typeof SEGMENTS)[number]["id"];


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

const sanitizeSalesCopy = (content?: string | null): string =>
  stripMarkdownForEditing(content)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** Extract Q&A pairs and return cleaned description + faqs array */
function extractFaqsFromCopy(text: string): { cleanedCopy: string; faqs: { q: string; a: string }[] } {
  const faqs: { q: string; a: string }[] = [];
  // Match "Frequently Asked Questions" header and everything after it
  const faqHeaderPattern = /\n*(?:Frequently Asked Questions|FAQ)\s*\n/i;
  const headerIdx = text.search(faqHeaderPattern);
  if (headerIdx === -1) return { cleanedCopy: text, faqs };

  const beforeFaq = text.slice(0, headerIdx).trim();
  const faqSection = text.slice(headerIdx);

  // Parse Q:/A: pairs
  const qaPairs = faqSection.matchAll(/Q:\s*(.+?)(?:\n+)A:\s*([\s\S]*?)(?=\nQ:|$)/gi);
  for (const match of qaPairs) {
    const q = match[1].trim();
    const a = match[2].trim();
    if (q && a) faqs.push({ q, a });
  }

  return { cleanedCopy: beforeFaq, faqs };
}

export default function HomeStudyEditPublishStep({
  stepData, setStepData, onMarkEdited, bookId, bookTitle,
  generationState, setGenerationState,
}: HomeStudyStepProps) {
  const { toast } = useToast();
  const days: StudyDay[] = stepData.schedule?.days || [];
  const setup = stepData.setup || {};
  const [activeSegment, setActiveSegment] = useState<SegmentId>("schedule");
  const [previewMode, setPreviewMode] = useState<"sales" | "portal">("sales");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewPage, setPreviewPage] = useState(0);

  useEffect(() => {
    if (activeSegment !== "sales") return;

    const salesCopy = setup.salesCopy;
    const whatsIncluded = setup.whatsIncluded;
    const nextSetup: Record<string, string> = {};

    if (typeof salesCopy === "string") {
      const cleaned = sanitizeSalesCopy(salesCopy);
      if (cleaned !== salesCopy) nextSetup.salesCopy = cleaned;
    }

    if (typeof whatsIncluded === "string") {
      const cleaned = sanitizeSalesCopy(whatsIncluded);
      if (cleaned !== whatsIncluded) nextSetup.whatsIncluded = cleaned;
    }

    if (Object.keys(nextSetup).length === 0) return;

    setStepData(prev => ({
      ...prev,
      setup: { ...prev.setup, ...nextSetup },
    }));
    onMarkEdited("edit");
  }, [activeSegment, onMarkEdited, setStepData, setup.salesCopy, setup.whatsIncluded]);

  // Auto-extract FAQs from salesCopy on first load
  const [faqExtracted, setFaqExtracted] = useState(false);
  useEffect(() => {
    if (faqExtracted || !setup.salesCopy) return;
    // Only extract if no faqs exist yet and salesCopy contains FAQ content
    if ((!setup.faqs || setup.faqs.length === 0) && /\bQ:\s/i.test(setup.salesCopy)) {
      const { cleanedCopy, faqs } = extractFaqsFromCopy(setup.salesCopy);
      if (faqs.length > 0) {
        setStepData(prev => ({
          ...prev,
          setup: { ...prev.setup, salesCopy: cleanedCopy, faqs },
        }));
        onMarkEdited("edit");
      }
    }
    setFaqExtracted(true);
  }, [setup.salesCopy, setup.faqs, faqExtracted, setStepData, onMarkEdited]);

  if (days.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">No Program Generated Yet</h3>
        <p className="text-sm text-muted-foreground">
          Go back to Program Setup and let Abby generate your home study program first.
        </p>
      </div>
    );
  }

  const updateSetup = (field: string, value: any) => {
    setStepData(prev => ({ ...prev, setup: { ...prev.setup, [field]: value } }));
    onMarkEdited("edit");
  };

  const contentCount = days.filter(d => d.concept || d.exercise || d.reflection).length;

  return (
    <div className="space-y-5">
      {/* Segment navigation */}
      <ScrollArea className="w-full">
        <div className="flex gap-1.5 pb-1">
          {SEGMENTS.map(seg => {
            const Icon = seg.icon;
            const isActive = activeSegment === seg.id;
            return (
              <button
                key={seg.id}
                onClick={() => setActiveSegment(seg.id)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all text-xs font-medium ${
                  isActive
                    ? "border-secondary bg-secondary/10 text-secondary shadow-sm"
                    : "border-border bg-card hover:border-secondary/30 text-muted-foreground"
                }`}
              >
                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  isActive ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {seg.num}
                </span>
                <Icon className="h-3.5 w-3.5" />
                {seg.label}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {activeSegment === "schedule" && (
        <div className="space-y-5">
          <Card className="p-6 space-y-5">
            <h3 className="font-heading text-base font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-secondary" /> Duration & Frequency Settings
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Program Duration (days)</label>
                <Input type="number" min={7} max={90}
                  value={setup.duration || days.length}
                  onChange={e => updateSetup("duration", parseInt(e.target.value) || days.length)}
                  className="h-9" />
                <p className="text-[10px] text-muted-foreground mt-1">Currently {days.length} days generated</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Daily Commitment (minutes)</label>
                <div className="flex gap-2">
                  {[15, 30, 45, 60].map(mins => (
                    <button
                      key={mins}
                      onClick={() => updateSetup("commitment", mins)}
                      className={`flex-1 h-9 rounded-md border-2 text-xs font-bold transition-all ${
                        (setup.commitment || 15) === mins
                          ? "border-secondary bg-secondary/10 text-secondary"
                          : "border-border hover:border-secondary/30 text-muted-foreground"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Frequency</label>
                <div className="flex gap-2 flex-wrap">
                  {["daily", "weekdays", "3x-week", "weekly"].map(freq => {
                    const labels: Record<string, string> = {
                      daily: "Every Day", weekdays: "Weekdays Only",
                      "3x-week": "3× per Week", weekly: "Once a Week",
                    };
                    return (
                      <button
                        key={freq}
                        onClick={() => updateSetup("frequency", freq)}
                        className={`px-3 h-9 rounded-md border-2 text-xs font-medium transition-all ${
                          (setup.frequency || "daily") === freq
                            ? "border-secondary bg-secondary/10 text-secondary"
                            : "border-border hover:border-secondary/30 text-muted-foreground"
                        }`}
                      >
                        {labels[freq]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Difficulty Level</label>
                <div className="flex gap-2">
                  {["Beginner", "Intermediate", "Advanced"].map(level => (
                    <button
                      key={level}
                      onClick={() => updateSetup("level", level)}
                      className={`flex-1 h-9 rounded-md border-2 text-xs font-medium transition-all ${
                        (setup.level || "Beginner") === level
                          ? "border-secondary bg-secondary/10 text-secondary"
                          : "border-border hover:border-secondary/30 text-muted-foreground"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Card className="p-4 bg-muted/30 border-border/60">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Summary:</strong> A{" "}
                <strong>{setup.duration || days.length}-day</strong> program at{" "}
                <strong>{setup.commitment || 15} min/session</strong>,{" "}
                <strong>{setup.frequency === "weekdays" ? "weekdays only" : setup.frequency === "3x-week" ? "3× per week" : setup.frequency === "weekly" ? "once per week" : "every day"}</strong>,{" "}
                <strong>{setup.level || "Beginner"}</strong> level.
              </p>
            </Card>
          </Card>
        </div>
      )}

      {/* ─── SEGMENT 3: Sales Copy & Pricing ─── */}
      {activeSegment === "sales" && (
        <div className="space-y-5">
          <Card className="p-6">
            <h3 className="font-heading text-base font-bold flex items-center gap-2 mb-4">
              <ShoppingCart className="h-4 w-4 text-secondary" /> Sales Page Copy (11-Section Framework)
            </h3>
            <SharedSalesCopyEditor
              data={setup.salesCopyData || {
                ...DEFAULT_SALES_COPY,
                hero: { ...DEFAULT_SALES_COPY.hero, title: setup.title || bookTitle || "" },
                pricing: {
                  ...DEFAULT_SALES_COPY.pricing,
                  price: setup.price || "",
                  comparePrice: setup.comparePrice || "",
                  currency: setup.currency || "USD",
                },
                faq: { items: setup.faqs || [] },
                introduction: { paragraph: setup.salesCopy || "" },
                whatsInside: { items: setup.whatsIncluded ? setup.whatsIncluded.split("\n").filter(Boolean) : [""] },
              }}
              onChange={(salesCopyData) => {
                updateSetup("salesCopyData", salesCopyData);
                // Sync key fields back to setup for publish compatibility
                updateSetup("title", salesCopyData.hero.title);
                updateSetup("price", salesCopyData.pricing.price);
                updateSetup("comparePrice", salesCopyData.pricing.comparePrice);
                updateSetup("currency", salesCopyData.pricing.currency || "USD");
              }}
              productLabel="Home Study"
              onGenerateWithAbby={async () => {
                setGenerationState("analyzing");
                try {
                  const result = await generateJSONWithAI<{ salesCopy: SalesCopyData }>(
                    `Generate a complete 11-section sales page for a home study course called "${setup.title || bookTitle}" based on the book "${bookTitle}".
The course is ${days.length} days, ${setup.commitment || 15} min/day, ${setup.level || "Beginner"} level.

Return a JSON object with key "salesCopy" containing:
{
  "hero": { "title": "...", "tagline": "one-line tagline", "ctaText": "Start the Program" },
  "problem": { "headline": "Are you struggling with...", "painPoints": ["point1", "point2", "point3"] },
  "transformation": { "before": ["struggle1", "struggle2", "struggle3"], "after": ["result1", "result2", "result3"] },
  "introduction": { "paragraph": "What it is, who it's for, 2-3 sentences" },
  "whatsInside": { "items": ["item1", "item2", "item3", "item4", "item5"] },
  "howItWorks": { "steps": [{ "title": "Enroll", "description": "..." }, { "title": "Learn", "description": "..." }, { "title": "Transform", "description": "..." }] },
  "author": { "name": "", "bio": "", "credentials": "" },
  "socialProof": { "testimonials": [] },
  "pricing": { "price": "${setup.price || "47"}", "comparePrice": "${setup.comparePrice || ""}", "currency": "USD", "ctaText": "Start the Program", "included": ["item1", "item2", "item3"] },
  "faq": { "items": [{ "q": "question", "a": "answer" }, ...5-7 items] },
  "finalCta": { "headline": "...", "subheadline": "...", "ctaText": "Get Started Today", "urgency": "..." }
}
Make all copy compelling, benefit-driven, and plain text only. No markdown.`,
                    { bookId, isPremium: true },
                  );
                  updateSetup("salesCopyData", result.salesCopy);
                  updateSetup("title", result.salesCopy.hero.title);
                  updateSetup("price", result.salesCopy.pricing.price);
                  updateSetup("comparePrice", result.salesCopy.pricing.comparePrice);
                  setGenerationState("complete");
                  toast({ title: "Sales copy generated!" });
                } catch {
                  setGenerationState("error");
                  toast({ title: "Generation failed", variant: "destructive" });
                }
              }}
              generating={generationState === "analyzing" || generationState === "generating"}
            />
          </Card>

          <div className="border-t border-border pt-5">
            <Card className="p-4 bg-muted/30 border-border/60">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium">📦 Companion Workbook Add-on</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                    If a Workbook exists for this book, it will automatically be offered as a recommended add-on purchase on the sales page.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ─── SEGMENT 4: Portal Design ─── */}
      {activeSegment === "design" && (
        <div className="space-y-5">
          <Card className="p-6 space-y-5">
            <h3 className="font-heading text-base font-bold flex items-center gap-2">
              <Palette className="h-4 w-4 text-secondary" /> Interactive Portal Design
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This controls how the Home Study looks in the <strong>user's portal</strong> — where they log in daily to complete their {setup.commitment || 15}-minute session with reading, exercises, reflection, and action items.
            </p>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Portal Color Theme</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: "match-workbook", label: "Match Workbook", desc: "Inherit colors & fonts from companion workbook" },
                  { id: "classic-warm", label: "Classic Warm", desc: "Cream, navy, gold accents" },
                  { id: "modern-minimal", label: "Modern Minimal", desc: "Clean whites, subtle grays" },
                  { id: "bold-energetic", label: "Bold & Energetic", desc: "Vibrant tones, strong contrast" },
                ].map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => updateSetup("portalTheme", theme.id)}
                    className={`flex-1 min-w-[140px] p-3 rounded-lg border-2 text-left transition-all ${
                      (setup.portalTheme || "match-workbook") === theme.id
                        ? "border-secondary bg-secondary/10"
                        : "border-border hover:border-secondary/30"
                    }`}
                  >
                    <p className="text-xs font-bold">{theme.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{theme.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Daily Session Layout</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: "guided-scroll", label: "Guided Scroll", desc: "One-page flow: Read → Exercise → Reflect → Act" },
                  { id: "tabbed", label: "Tabbed Sections", desc: "Tab navigation between content sections" },
                  { id: "step-by-step", label: "Step-by-Step", desc: "Progressive reveal, one section at a time" },
                ].map(layout => (
                  <button
                    key={layout.id}
                    onClick={() => updateSetup("portalLayout", layout.id)}
                    className={`flex-1 min-w-[140px] p-3 rounded-lg border-2 text-left transition-all ${
                      (setup.portalLayout || "guided-scroll") === layout.id
                        ? "border-secondary bg-secondary/10"
                        : "border-border hover:border-secondary/30"
                    }`}
                  >
                    <p className="text-xs font-bold">{layout.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{layout.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Progress Tracking</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: "checkmarks", label: "Daily Checkmarks", desc: "Simple check-off for each day" },
                  { id: "progress-bar", label: "Progress Bar", desc: "Visual percentage bar at top" },
                  { id: "streak", label: "Streak Counter", desc: "Consecutive days streak + calendar" },
                ].map(tracker => (
                  <button
                    key={tracker.id}
                    onClick={() => updateSetup("progressStyle", tracker.id)}
                    className={`flex-1 min-w-[140px] p-3 rounded-lg border-2 text-left transition-all ${
                      (setup.progressStyle || "checkmarks") === tracker.id
                        ? "border-secondary bg-secondary/10"
                        : "border-border hover:border-secondary/30"
                    }`}
                  >
                    <p className="text-xs font-bold">{tracker.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{tracker.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <Card className="p-4 bg-muted/30 border-border/60">
              <div className="flex items-start gap-3">
                <Palette className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Workbook Consistency:</strong> When "Match Workbook" theme is selected,
                  the portal will automatically inherit the color palette, typography, and visual style from your published Workbook.
                  This creates a cohesive brand experience across your digital products.
                </p>
              </div>
            </Card>
          </Card>
        </div>
      )}

      {/* ─── SEGMENT 5: Preview ─── */}
      {activeSegment === "preview" && (
        <div className="space-y-5">
          {/* Preview mode toggle */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => { setPreviewMode("sales"); setPreviewPage(0); }}
                className={`px-4 py-2 text-xs font-medium transition-all ${
                  previewMode === "sales" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <ShoppingCart className="h-3 w-3 inline mr-1" /> Sales Page
              </button>
              <button
                onClick={() => { setPreviewMode("portal"); setPreviewPage(0); }}
                className={`px-4 py-2 text-xs font-medium transition-all ${
                  previewMode === "portal" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <BookOpen className="h-3 w-3 inline mr-1" /> Student Portal
              </button>
            </div>
            <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
              <button onClick={() => setPreviewDevice("desktop")}
                className={`p-1.5 ${previewDevice === "desktop" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}>
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setPreviewDevice("mobile")}
                className={`p-1.5 ${previewDevice === "mobile" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}>
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Sales Page Preview */}
          {previewMode === "sales" && (
            <div className={`mx-auto border border-border rounded-xl overflow-hidden bg-card shadow-lg ${
              previewDevice === "mobile" ? "max-w-sm" : "max-w-2xl"
            }`}>
              <SharedSalesCopyPreview
                data={setup.salesCopyData || {
                  ...DEFAULT_SALES_COPY,
                  hero: { ...DEFAULT_SALES_COPY.hero, title: setup.title || bookTitle || "" },
                  pricing: {
                    ...DEFAULT_SALES_COPY.pricing,
                    price: setup.price || "",
                    comparePrice: setup.comparePrice || "",
                    currency: setup.currency || "USD",
                  },
                  introduction: { paragraph: setup.salesCopy || "" },
                  whatsInside: { items: setup.whatsIncluded ? setup.whatsIncluded.split("\n").filter(Boolean) : [] },
                  faq: { items: setup.faqs || [] },
                }}
                productMeta={{
                  badge: `${setup.duration || days.length}-Day Program`,
                  duration: `${setup.duration || days.length} days`,
                  commitment: `${setup.commitment || 15} min/day`,
                  level: setup.level || "Beginner",
                }}
              />
            </div>
          )}

          {/* Student Portal Preview */}
          {previewMode === "portal" && (
            <div className={`mx-auto border border-border rounded-xl overflow-hidden bg-card shadow-lg ${
              previewDevice === "mobile" ? "max-w-sm" : "max-w-2xl"
            }`}>
              {/* Portal header */}
              <div className="p-4 border-b border-border bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Your Home Study</p>
                    <h2 className="font-heading text-sm font-bold">{setup.title || "Home Study Course"}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.round((contentCount / days.length) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{Math.round((contentCount / days.length) * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Portal day navigation */}
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={previewPage <= 0}
                    onClick={() => setPreviewPage(p => p - 1)}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Day {(previewPage || 0) + 1} of {days.length}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={previewPage >= days.length - 1}
                    onClick={() => setPreviewPage(p => p + 1)}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Portal day content */}
              {days[previewPage] && (
                <div className="p-6 min-h-[400px] space-y-5">
                  <div>
                    <Badge variant="secondary" className="text-[10px] mb-2">
                      Week {days[previewPage].weekNumber} · Day {days[previewPage].dayNumber}
                    </Badge>
                    <h3 className="font-heading text-lg font-bold">{days[previewPage].theme}</h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {setup.commitment || 15} minutes today
                    </p>
                  </div>

                  <div className="p-4 bg-muted/20 rounded-lg">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">📖 Today's Reading</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-4">
                      {days[previewPage].concept || days[previewPage].reading || "Content will appear here..."}
                    </p>
                  </div>

                  <div className="p-4 bg-accent/5 rounded-lg border border-accent/10">
                    <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2">🏋️ Exercise</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {days[previewPage].exercise || "Exercise will appear here..."}
                    </p>
                  </div>

                  <div className="p-4 bg-violet-500/5 rounded-lg border border-violet-500/10">
                    <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-2">🪞 Reflection</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {days[previewPage].reflection || "Reflection prompts will appear here..."}
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">🎯 Action Plan</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-4">
                      {days[previewPage].actionPlan || "Action items will appear here..."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <div className="w-5 h-5 rounded border-2 border-secondary/40" />
                    <span className="text-xs text-muted-foreground">I completed Day {days[previewPage].dayNumber}</span>
                  </div>
                </div>
              )}

              {/* Certificate teaser */}
              <div className="p-4 border-t border-border bg-muted/10 text-center">
                <Award className="h-5 w-5 text-secondary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Certificate of Completion unlocks after Day {days.length}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Completion summary (always visible) */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-bold text-secondary mb-1">Ready to Publish?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>{contentCount}/{days.length}</strong> days have content.
              {setup.price && ` Priced at $${setup.price} ${setup.currency || "USD"}.`}
              {" "}Click <strong>Publish</strong> in the bottom bar when you're ready.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
