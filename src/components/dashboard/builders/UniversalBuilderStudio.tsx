import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, BookOpen, Check, Loader2, Save,
  Sparkles, X, Send, ChevronLeft, Lock, AlertCircle, Wand2,
} from "lucide-react";
import AbbyNarrativeLoading from "./AbbyNarrativeLoading";
import ActPhaseBadge from "./shared/ActPhaseBadge";
import AbbyProposal from "./AbbyProposal";
import CrossBuilderNotifications from "./CrossBuilderNotifications";
import CrossBuilderPushSummary from "./CrossBuilderPushSummary";
import BuilderUpgradeGate from "./BuilderUpgradeGate";
import { BUILDER_SYSTEM_PROMPTS } from "./builderSystemPrompts";
import { useBuilderGeneration, splitSalesAndContent } from "@/hooks/useBuilderGeneration";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, hasTierAccess, TIERS } from "@/hooks/useAuth";
import { useAbbyPlan } from "@/hooks/useAbbyPlan";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import ROIBanner from "@/components/dashboard/ROIBanner";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import BuilderFirstVisitWelcome, { hasSeenBuilderFirstVisit, markBuilderFirstVisitSeen } from "./BuilderFirstVisitWelcome";
import CourseStepRenderer from "./course/CourseStepRenderer";
import HomeStudyStepRenderer from "./home-study/HomeStudyStepRenderer";
import WorkbookStepRenderer from "./workbook/WorkbookStepRenderer";
import AudiobookStepRenderer from "./audiobook/AudiobookStepRenderer";
import MembershipStepRenderer from "./membership/MembershipStepRenderer";
import UpsellStepRenderer from "./upsell/UpsellStepRenderer";
import SocialMediaStepRenderer from "./social-media/SocialMediaStepRenderer";
import WebinarStepRenderer from "./webinar/WebinarStepRenderer";
import PodcastScriptsStepRenderer from "./podcast-scripts/PodcastScriptsStepRenderer";
import EmailMarketingStepRenderer from "./email-marketing/EmailMarketingStepRenderer";
import WebsiteStepRenderer from "./website/WebsiteStepRenderer";
import CoachingStepRenderer from "./coaching/CoachingStepRenderer";
import GroupCoachingStepRenderer from "./group-coaching/GroupCoachingStepRenderer";
import KeynotesStepRenderer from "./keynotes/KeynotesStepRenderer";
import InHouseSpeakerStepRenderer from "./in-house-speaker/InHouseSpeakerStepRenderer";
import TrainingProgramsStepRenderer from "./training-programs/TrainingProgramsStepRenderer";
import AffiliatesStepRenderer from "./affiliates/AffiliatesStepRenderer";
import JVPartnershipsStepRenderer from "./jv-partnerships/JVPartnershipsStepRenderer";
import BigTicketStepRenderer from "./big-ticket/BigTicketStepRenderer";
import RetreatsStepRenderer from "./retreats/RetreatsStepRenderer";
import CertificationStepRenderer from "./certification/CertificationStepRenderer";
import MastermindsStepRenderer from "./masterminds/MastermindsStepRenderer";
import SpecialEditionsStepRenderer from "./special-editions/SpecialEditionsStepRenderer";
import BookSalesStepRenderer from "./book-sales/BookSalesStepRenderer";
import ConventionsStepRenderer from "./conventions/ConventionsStepRenderer";
import FundraisingStepRenderer from "./fundraising/FundraisingStepRenderer";
import ExhibitorsStepRenderer from "./exhibitors/ExhibitorsStepRenderer";
import LeadMagnetStepRenderer from "./lead-magnet/LeadMagnetStepRenderer";
import LicensingStepRenderer from "./licensing/LicensingStepRenderer";
import CommunityStepRenderer from "./community/CommunityStepRenderer";
import RevenueShareStepRenderer from "./revenue-share/RevenueShareStepRenderer";
import WhiteLabelStepRenderer from "./white-label/WhiteLabelStepRenderer";
import EventsStepRenderer from "./events/EventsStepRenderer";
import FranchiseStepRenderer from "./franchise/FranchiseStepRenderer";
import type { BuilderNodeConfig, BuilderStep } from "./builderNodeConfig";

// Map of customRenderer key → component
const RENDERER_MAP: Record<string, React.ComponentType<any>> = {
  "course": CourseStepRenderer,
  "home-study": HomeStudyStepRenderer,
  "workbook": WorkbookStepRenderer,
  "audiobook": AudiobookStepRenderer,
  "membership": MembershipStepRenderer,
  "upsell": UpsellStepRenderer,
  "social-media": SocialMediaStepRenderer,
  "webinar": WebinarStepRenderer,
  "podcast-scripts": PodcastScriptsStepRenderer,
  "email-marketing": EmailMarketingStepRenderer,
  "website": WebsiteStepRenderer,
  "coaching": CoachingStepRenderer,
  "group-coaching": GroupCoachingStepRenderer,
  "keynotes": KeynotesStepRenderer,
  "in-house-speaker": InHouseSpeakerStepRenderer,
  "training-programs": TrainingProgramsStepRenderer,
  "affiliates": AffiliatesStepRenderer,
  "jv-partnerships": JVPartnershipsStepRenderer,
  "big-ticket": BigTicketStepRenderer,
  "retreats": RetreatsStepRenderer,
  "certification": CertificationStepRenderer,
  "masterminds": MastermindsStepRenderer,
  "special-editions": SpecialEditionsStepRenderer,
  "book-sales": BookSalesStepRenderer,
  "conventions": ConventionsStepRenderer,
  "fundraising": FundraisingStepRenderer,
  "exhibitors": ExhibitorsStepRenderer,
  "lead-magnet": LeadMagnetStepRenderer,
  "licensing": LicensingStepRenderer,
  "community": CommunityStepRenderer,
  "revenue-share": RevenueShareStepRenderer,
  "white-label": WhiteLabelStepRenderer,
  "events": EventsStepRenderer,
  "franchise": FranchiseStepRenderer,
};

interface Props {
  nodeConfig: BuilderNodeConfig;
  onNavigate?: (section: string) => void;
}

const AI_GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`;

export default function UniversalBuilderStudio({ nodeConfig, onNavigate }: Props) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, tier, isPremium, isAdmin } = useAuth();

  // Book context from URL params
  const bookId = searchParams.get("bookId") || "";
  const bookTitle = searchParams.get("bookTitle") ? decodeURIComponent(searchParams.get("bookTitle")!) : "";
  const rawBookCoverUrl = searchParams.get("bookCoverUrl");
  const bookCoverUrl = rawBookCoverUrl
    ? (() => {
        try {
          return decodeURIComponent(rawBookCoverUrl);
        } catch {
          return rawBookCoverUrl;
        }
      })()
    : null;

  // Builder state
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // 3-Act generation engine (replaces old mock generationState)
  const builderGen = useBuilderGeneration(nodeConfig.id, nodeConfig.label);
  const [legacyGenerationState, setLegacyGenerationState] = useState<"idle" | "queued" | "analyzing" | "generating" | "complete" | "error">("idle");

  // Legacy state is used by custom step renderers (e.g. schedule generation)
  const generationState = legacyGenerationState !== "idle"
    ? legacyGenerationState
    : (() => {
        switch (builderGen.act) {
          case "idle": return "idle" as const;
          case "act1_loading": return "analyzing" as const;
          case "act2_proposal": return "idle" as const;
          case "act3_generating": return "generating" as const;
          case "act3_complete": return "complete" as const;
          case "error": return "error" as const;
          default: return "idle" as const;
        }
      })();

  const setGenerationState = (nextState: string) => {
    setLegacyGenerationState(nextState as "idle" | "queued" | "analyzing" | "generating" | "complete" | "error");
  };

  const splitPreview = splitSalesAndContent(builderGen.generatedContent || "");
  const previewSalesText = builderGen.generatedSalesPage || splitPreview.salesPageText;
  const previewContentText = splitPreview.contentText || builderGen.generatedContent;
  const [editedSteps, setEditedSteps] = useState<Set<string>>(new Set());
  const [resolvedBookCoverUrl, setResolvedBookCoverUrl] = useState<string | null>(bookCoverUrl);

  useEffect(() => {
    setLegacyGenerationState("idle");
  }, [currentStep]);

  // Abby advisor panel
  const [abbyOpen, setAbbyOpen] = useState(false);
  const [abbyMessages, setAbbyMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [showFirstVisit, setShowFirstVisit] = useState(() => !hasSeenBuilderFirstVisit(nodeConfig.id));
  const [abbyInput, setAbbyInput] = useState("");
  const [abbyStreaming, setAbbyStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Plan context
  const { plan, loading: planLoading } = useAbbyPlan(bookId);

  // Manuscript & frameworks context
  const [manuscriptSummary, setManuscriptSummary] = useState<string>("");
  const [frameworks, setFrameworks] = useState<string>("");

  useEffect(() => {
    if (!user || !bookId) return;
    setResolvedBookCoverUrl(bookCoverUrl);

    let isMounted = true;
    (async () => {
      const coverPromise = bookCoverUrl
        ? Promise.resolve({ data: null as { cover_image_url: string | null } | null })
        : supabase
            .from("books")
            .select("cover_image_url")
            .eq("id", bookId)
            .maybeSingle();

      const [msRes, fwRes, coverRes] = await Promise.all([
        supabase
          .from("generated_assets")
          .select("content")
          .eq("book_id", bookId)
          .eq("asset_type", "source_material")
          .maybeSingle(),
        supabase
          .from("generated_assets")
          .select("content")
          .eq("book_id", bookId)
          .eq("asset_type", "frameworks")
          .maybeSingle(),
        coverPromise,
      ]);

      if (!isMounted) return;

      if (msRes.data?.content) setManuscriptSummary(msRes.data.content.slice(0, 3000));
      if (fwRes.data?.content) setFrameworks(fwRes.data.content.slice(0, 2000));
      if (!bookCoverUrl && coverRes.data?.cover_image_url) {
        setResolvedBookCoverUrl(coverRes.data.cover_image_url);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user, bookId, bookCoverUrl]);

  // Check tier access
  const hasAccess = isPremium || isAdmin || hasTierAccess(tier, nodeConfig.requiredTier);

  // Auto-save timer
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const stepDataRef = useRef(stepData);
  const currentStepRef = useRef(currentStep);
  const editedStepsRef = useRef(editedSteps);
  stepDataRef.current = stepData;
  currentStepRef.current = currentStep;
  editedStepsRef.current = editedSteps;

  const handleSaveDraft = useCallback(async (silent = false): Promise<boolean> => {
    if (!user || !bookId) return false;
    setSaving(true);
    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");

      const resp = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-draft-state`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "save",
            bookId,
            nodeId: nodeConfig.id,
            payload: {
              currentStep: currentStepRef.current,
              stepData: stepDataRef.current,
              editedSteps: Array.from(editedStepsRef.current),
            },
          }),
        },
        15000,
      );

      const result = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(result?.error || "Failed to save draft");
      }

      const savedAt = result?.savedAt ? new Date(result.savedAt) : new Date();
      setLastSaved(savedAt);
      if (!silent) toast({ title: "Draft saved" });
      return true;
    } catch (err: any) {
      if (!silent) toast({ title: "Save failed", description: err?.message || "Please try again.", variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, bookId, nodeConfig.id, toast]);

  // Debounced auto-save on data change
  const debounceSaveRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (Object.keys(stepData).length === 0) return;
    if (debounceSaveRef.current) clearTimeout(debounceSaveRef.current);
    debounceSaveRef.current = setTimeout(() => {
      void handleSaveDraft(true);
    }, 5000);
    return () => { if (debounceSaveRef.current) clearTimeout(debounceSaveRef.current); };
  }, [stepData, currentStep, handleSaveDraft]);

  // Periodic auto-save every 30s
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (Object.keys(stepDataRef.current).length > 0) {
        void handleSaveDraft(true);
      }
    }, 30000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [handleSaveDraft]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [abbyMessages]);

  // Load saved draft on mount
  useEffect(() => {
    if (!user || !bookId) return;

    let isMounted = true;
    (async () => {
      try {
        const token = await getActiveToken();
        if (!token) return;

        const resp = await fetchWithTimeout(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-draft-state`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: "load",
              bookId,
              nodeId: nodeConfig.id,
            }),
          },
          15000,
        );

        const result = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(result?.error || "Failed to load draft");
        }

        if (!isMounted || !result?.draft) return;
        const parsed = result.draft;

        if (parsed.stepData) setStepData(parsed.stepData);
        if (typeof parsed.currentStep === "number") setCurrentStep(parsed.currentStep);
        if (Array.isArray(parsed.editedSteps)) setEditedSteps(new Set(parsed.editedSteps));
        if (parsed.savedAt) setLastSaved(new Date(parsed.savedAt));
      } catch (err) {
        console.error("Failed to load builder draft:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user, bookId, nodeConfig.id]);

  // Abby chat
  const getToken = async (): Promise<string> => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  };

  const sendAbbyMessage = useCallback(async () => {
    if (!abbyInput.trim() || abbyStreaming) return;
    const userMsg = { role: "user", content: abbyInput.trim() };
    const newMsgs = [...abbyMessages, userMsg];
    setAbbyMessages(newMsgs);
    setAbbyInput("");
    setAbbyStreaming(true);

    try {
      const token = await getToken();
      const currentStepConfig = nodeConfig.steps[currentStep];
      const resp = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `${BUILDER_SYSTEM_PROMPTS[nodeConfig.id] || `You are Abby, the AI business advisor for Authors Bureau. You're helping an author build a "${nodeConfig.label}" product.`}

CONTEXT:
- Book: "${bookTitle}"
- Current step: "${currentStepConfig?.label}" \u2014 ${currentStepConfig?.description}
- Step tip: ${currentStepConfig?.abbyTip}

IMPORTANT RULES:
- Stay focused ONLY on building this specific ${nodeConfig.label}. Never suggest leaving this page or going to another section.
- Give practical, step-by-step advice about creating, designing, and publishing this product.
- When suggesting titles, suggest exactly 3 options based on the book\u2019s frameworks and themes.
- Keep responses brief (under 150 words), actionable, and encouraging.
- Reference specific chapters, frameworks, and concepts from the manuscript when giving advice.
- Use the book\u2019s own language and terminology in product names.
${manuscriptSummary ? `\nMANUSCRIPT CONTEXT:\n${manuscriptSummary.slice(0, 1500)}` : ""}
${frameworks ? `\nBOOK FRAMEWORKS:\n${frameworks.slice(0, 1000)}` : ""}
${plan ? `\nBUSINESS PLAN CONTEXT:\n${JSON.stringify(plan).slice(0, 2000)}` : ""}`,
            },
            ...newMsgs,
          ],
          bookId,
          isPremium: true,
          builderMode: true,
          builderId: nodeConfig.id,
          builderLabel: nodeConfig.label,
          builderStep: currentStepConfig?.label,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Chat failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let accumulated = "";
      setAbbyMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let nlIdx: number;
        while ((nlIdx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nlIdx);
          textBuffer = textBuffer.slice(nlIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              setAbbyMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: accumulated };
                return copy;
              });
            }
          } catch { break; }
        }
      }
    } catch (err) {
      console.error("Abby chat error:", err);
      toast({ title: "Chat failed", description: "Try again in a moment", variant: "destructive" });
    } finally {
      setAbbyStreaming(false);
    }
  }, [abbyInput, abbyMessages, abbyStreaming, bookId, bookTitle, nodeConfig, currentStep, plan, manuscriptSummary, frameworks]);

  const goNext = async () => {
    // Save draft but never block step navigation
    await handleSaveDraft(true);
    if (currentStep < nodeConfig.steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const goPrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const currentStepConfig = nodeConfig.steps[currentStep];
  const isLastStep = currentStep === nodeConfig.steps.length - 1;

  // ─── SUBSCRIPTION GATE ─────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <BuilderUpgradeGate
        nodeConfig={nodeConfig}
        currentTier={tier}
        planData={plan ? {
          revenueProjection: plan.packages?.[nodeConfig.requiredTier as keyof typeof plan.packages]?.timeline
            ? `This product can generate revenue within ${plan.packages[nodeConfig.requiredTier as keyof typeof plan.packages]?.timeline || "3-6 months"}.`
            : undefined,
        } : null}
        onNavigate={onNavigate}
      />
    );
  }

  // ─── NO BOOK SELECTED ──────────────────────────────────────────────
  if (!bookId) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-3">Select a Book First</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Go to My Books Hub and select a book to start building your {nodeConfig.label.toLowerCase()}.
        </p>
        <Button onClick={() => onNavigate?.("my-books")} variant="outline" className="rounded-full">
          <BookOpen className="h-4 w-4 mr-2" /> Go to My Books
        </Button>
      </div>
    );
  }

  // ─── MAIN BUILDER UI ──────────────────────────────────────────────
  return (
    <div className="flex gap-0 h-full -m-6 lg:-m-8">
      {/* Main builder area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all ${abbyOpen ? "mr-80" : ""}`}>
        {/* Header bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleSaveDraft(true);
              const categorySection = nodeConfig.category === "build" ? "build" : nodeConfig.category === "bridge" ? "bridge" : "yield";
              onNavigate?.(categorySection);
            }}
            className="text-muted-foreground hover:text-foreground shrink-0 -ml-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to {nodeConfig.category === "build" ? "B\u00B7Build" : nodeConfig.category === "bridge" ? "B\u00B7Bridge" : "Y\u00B7Yield"}
          </Button>
          <div className="w-px h-6 bg-border" />
          <h1 className="font-heading font-bold text-lg truncate">{nodeConfig.label}</h1>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-[10px] text-muted-foreground/60">
                Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => handleSaveDraft(false)} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Save Draft
            </Button>
          </div>
        </div>

        {/* Progress stepper */}
        <div className="px-6 py-3 border-b border-border bg-card/50">
          <div className="flex items-center gap-1">
            {nodeConfig.steps.map((step, idx) => {
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => { handleSaveDraft(true); setCurrentStep(idx); }}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      isCurrent
                        ? "bg-secondary text-secondary-foreground"
                        : isCompleted
                        ? "bg-accent/15 text-accent"
                        : "text-muted-foreground/50 hover:text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] ${
                        isCurrent ? "border-secondary-foreground" : "border-muted-foreground/30"
                      }`}>
                        {idx + 1}
                      </span>
                    )}
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                  {idx < nodeConfig.steps.length - 1 && (
                    <div className={`w-6 h-px mx-0.5 ${isCompleted ? "bg-accent" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Book context bar */}
        <div className="flex items-center gap-3 px-6 py-2.5 border-b border-border bg-muted/30">
          <div className="h-8 w-6 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border">
            {resolvedBookCoverUrl ? (
              <img src={resolvedBookCoverUrl} alt={`${bookTitle || "Book"} cover`} className="h-full w-full object-cover" />
            ) : (
              <BookOpen className="h-3 w-3 text-muted-foreground/40" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate">{bookTitle || "Untitled Book"}</p>
            <p className="text-[10px] text-muted-foreground">Manuscript loaded</p>
          </div>
        </div>

        {/* Step content area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {/* Cross-builder incoming notifications */}
          {user && bookId && (
            <CrossBuilderNotifications
              builderId={nodeConfig.id}
              authorId={user.id}
              bookId={bookId}
              onImport={(pushData) => {
                toast({ title: "Content imported!", description: "Pre-filled content is ready for editing." });
              }}
            />
          )}
          {/* Compact ROI Banner */}
          {user && bookId && (
            <ROIBanner
              bookId={bookId}
              authorId={user.id}
              tier={tier}
              compact
            />
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepConfig.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="max-w-3xl">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    {/* 3-Act Phase Badge */}
                    <ActPhaseBadge act={
                      currentStepConfig.act || (currentStep === 0 ? 1 : currentStep === nodeConfig.steps.length - 1 ? 3 : 2)
                    } />
                    <h2 className="font-heading text-xl font-bold mb-1">
                      Step {currentStep + 1}: {currentStepConfig.label}
                    </h2>
                    <p className="text-sm text-muted-foreground">{currentStepConfig.description}</p>
                  </div>
                  {editedSteps.has(currentStepConfig.id) ? (
                    <Badge variant="secondary" className="text-[10px]">Edited by you</Badge>
                  ) : stepData[currentStepConfig.id] ? (
                    <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600">
                      <Wand2 className="h-2.5 w-2.5 mr-1" /> AI Generated
                    </Badge>
                  ) : null}
                </div>

                {/* \u2550\u2550\u2550 3-ACT GENERATION ENGINE \u2550\u2550\u2550 */}

                {/* Act 1: Abby Analyzing */}
                {builderGen.act === "act1_loading" && (
                  <Card className="p-6 mb-6">
                    <AbbyNarrativeLoading
                      messages={nodeConfig.loadingMessages}
                      builderLabel={nodeConfig.label.toLowerCase()}
                      bookTitle={bookTitle || "your book"}
                    />
                  </Card>
                )}

                {/* Act 2: Proposal Review */}
                {builderGen.act === "act2_proposal" && builderGen.proposal && (
                  <div className="mb-6">
                    <AbbyProposal
                      proposal={builderGen.proposal}
                      builderLabel={nodeConfig.label}
                      bookTitle={bookTitle || "your book"}
                      onApprove={(approved) => {
                        // Auto-populate stepData from approved proposal for builders with custom renderers
                        if (nodeConfig.customRenderer === "home-study") {
                          const durationMatch = approved.recommended_title?.match(/(\d+)[- ]?day/i);
                          setStepData(prev => ({
                            ...prev,
                            setup: {
                              ...prev.setup,
                              title: approved.recommended_title || prev.setup?.title,
                              description: approved.description || prev.setup?.description,
                              price: approved.recommended_price || prev.setup?.price,
                              duration: durationMatch ? parseInt(durationMatch[1]) : (prev.setup?.duration || 21),
                            },
                          }));
                        }
                        builderGen.startAct3(bookId, approved);
                      }}
                      onEdit={(updates) => builderGen.updateProposal(updates)}
                    />
                  </div>
                )}

                {/* Act 3: Streaming Generation */}
                {builderGen.act === "act3_generating" && currentStepConfig.id === "setup" && (
                  <Card className="p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <motion.div
                        className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Sparkles className="h-5 w-5 text-secondary" />
                      </motion.div>
                      <div>
                        <p className="text-sm font-bold">Abby is generating your {nodeConfig.label.toLowerCase()}...</p>
                        <p className="text-xs text-muted-foreground">This may take 30-60 seconds. Don\u2019t navigate away.</p>
                      </div>
                    </div>
                    {builderGen.generatedContent && (
                      <div className="max-h-[440px] overflow-y-auto border rounded-lg p-4 bg-muted/30 space-y-4">
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary">Product Content Draft</p>
                          <div className="rounded-lg border border-border bg-background p-3">
                            <MarkdownRenderer content={previewContentText || builderGen.generatedContent} />
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* Act 3 Complete: Show generated content */}
                {builderGen.act === "act3_complete" && builderGen.generatedContent && currentStepConfig.id === "setup" && (
                  <Card className="p-6 mb-6 border-accent/30 bg-accent/5">
                    <div className="flex items-center gap-2 mb-4">
                      <Check className="h-5 w-5 text-accent" />
                      <p className="text-sm font-bold text-accent">Content generated successfully! \uD83C\uDF89</p>
                    </div>
                    <div className="max-h-[520px] overflow-y-auto border rounded-lg p-4 bg-background space-y-4">
                      {previewSalesText ? (
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary">Sales Page (saved separately)</p>
                          <div className="rounded-lg border border-border bg-muted/20 p-3">
                            <MarkdownRenderer content={previewSalesText} />
                          </div>
                        </div>
                      ) : null}
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary">Product Content</p>
                        <div className="rounded-lg border border-border bg-muted/20 p-3">
                          <MarkdownRenderer content={previewContentText || builderGen.generatedContent} />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={() => builderGen.reset()}>
                        Start Over
                      </Button>
                      <Button size="sm" className="bg-secondary text-secondary-foreground" onClick={goNext}>
                        Continue to Next Step <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                    {/* Cross-builder push summary */}
                    {user && bookId && (
                      <CrossBuilderPushSummary
                        builderId={nodeConfig.id}
                        authorId={user.id}
                        bookId={bookId}
                      />
                    )}
                  </Card>
                )}

                {/* Error state */}
                {builderGen.act === "error" && (
                  <Card className="p-4 mb-6 border-destructive/30 bg-destructive/5">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <p className="text-sm font-medium text-destructive">
                        {builderGen.error || "Something went wrong."}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => builderGen.retry(bookId)}>Retry</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAbbyOpen(true)}>Ask Abby for help</Button>
                    </div>
                  </Card>
                )}

                {/* Step content \u2014 custom renderer or generic placeholder */}
                {(() => {
                  const RendererComponent = nodeConfig.customRenderer ? RENDERER_MAP[nodeConfig.customRenderer] : null;
                  if (RendererComponent) {
                    return (
                      <RendererComponent
                        stepId={currentStepConfig.id}
                        stepData={stepData}
                        setStepData={setStepData}
                        onMarkEdited={(id: string) => setEditedSteps(prev => new Set([...prev, id]))}
                        bookId={bookId}
                        bookTitle={bookTitle}
                        plan={plan}
                        generationState={generationState}
                        setGenerationState={setGenerationState}
                        userId={user?.id || ""}
                        manuscriptSummary={manuscriptSummary}
                        frameworks={frameworks}
                        onStartGeneration={() => builderGen.startAct1(bookId)}
                        builderAct={builderGen.act}
                        onNavigate={onNavigate}
                      />
                    );
                  }
                  // Generic fallback with real AI generation
                  if (builderGen.act === "idle" || builderGen.act === "act3_complete") {
                    return (
                      <Card className="p-6 min-h-[300px] border-dashed border-2">
                        <div className="text-center py-12">
                          <Wand2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                          <h3 className="font-heading text-lg font-semibold mb-2">{currentStepConfig.label}</h3>
                          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                            {currentStepConfig.description}
                          </p>
                          {builderGen.act === "idle" && currentStep === 0 ? (
                            <Button
                              className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                              onClick={() => builderGen.startAct1(bookId)}
                            >
                              <Sparkles className="h-4 w-4 mr-2" /> Analyze with Abby
                            </Button>
                          ) : builderGen.act === "idle" ? (
                            <p className="text-xs text-muted-foreground/50">
                              Complete Step 1 with Abby to populate this content
                            </p>
                          ) : null}
                        </div>
                      </Card>
                    );
                  }
                  return null;
                })()}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sticky action bar */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card">
          <Button
            variant="ghost"
            onClick={goPrev}
            disabled={currentStep === 0}
            className="text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <div className="flex items-center gap-2">
            {!abbyOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAbbyOpen(true)}
                className="text-secondary border-secondary/30 hover:bg-secondary/5"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Ask Abby
              </Button>
            )}
            <Button
              disabled={saving}
              onClick={isLastStep ? async () => {
                setSaving(true);
                let publishSuccess = false;
                try {
                  await handleSaveDraft(true);
                  if (user && bookId && nodeConfig.dbTable) {
                    if (nodeConfig.dbTable === "home_study_courses") {
                      const token = await getActiveToken();
                      if (!token) throw new Error("Not authenticated");

                      const resp = await fetchWithTimeout(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-draft-state`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            action: "publish_home_study",
                            bookId,
                            nodeId: nodeConfig.id,
                            payload: {
                              title: stepData.setup?.title || `${bookTitle} — ${nodeConfig.label}`,
                              description: stepData.setup?.description || "",
                              content_markdown: stepData.schedule?.days
                                ? JSON.stringify(stepData.schedule.days)
                                : "",
                              duration_days: stepData.setup?.duration || 30,
                              price: stepData.setup?.price ? parseFloat(stepData.setup.price) : null,
                            },
                          }),
                        },
                        15000,
                      );

                      const result = await resp.json().catch(() => ({}));
                      if (!resp.ok || result?.error) {
                        const message = result?.error || "Failed to publish home study course";
                        console.error("Failed to publish home study record:", message);
                        toast({ title: "Publish failed", description: message, variant: "destructive" });
                      } else {
                        publishSuccess = true;
                      }
                    } else {
                      const { data: existing, error: fetchErr } = await (supabase as any)
                        .from(nodeConfig.dbTable)
                        .select("id")
                        .eq("author_id", user.id)
                        .eq("book_id", bookId)
                        .maybeSingle();
                      if (fetchErr) console.error("Fetch existing product error:", fetchErr);
                      const productRecord: any = {
                        author_id: user.id,
                        book_id: bookId,
                        title: stepData.setup?.title || `${bookTitle} — ${nodeConfig.label}`,
                        description: stepData.setup?.description || "",
                        status: "ready_for_review",
                      };
                      if (nodeConfig.dbTable === "courses") {
                        productRecord.price = stepData.foundation?.exactPrice ? parseFloat(stepData.foundation.exactPrice) : null;
                      }
                      let saveError;
                      if (existing) {
                        const { error } = await supabase.from(nodeConfig.dbTable as any).update(productRecord).eq("id", existing.id);
                        saveError = error;
                      } else {
                        const { error } = await supabase.from(nodeConfig.dbTable as any).insert(productRecord);
                        saveError = error;
                      }
                      if (saveError) {
                        console.error("Failed to save product record:", saveError);
                        toast({ title: "Publish failed", description: saveError.message, variant: "destructive" });
                      } else {
                        publishSuccess = true;
                      }
                    }
                  }
                } catch (err) {
                  console.error("Save draft failed during publish:", err);
                  toast({ title: "Publish failed", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
                } finally {
                  setSaving(false);
                }
                if (publishSuccess) {
                  toast({ title: "Published! \uD83C\uDF89", description: "Redirecting to Review & Publish\u2026" });
                  setTimeout(() => onNavigate?.("review-products"), 800);
                }
              } : goNext}
              className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold px-6"
            >
              {isLastStep ? (
                saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Publishing&hellip;</> : <>Publish</>
              ) : (
                <>Save & Continue <ArrowRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Abby Advisor Panel */}
      <AnimatePresence>
        {abbyOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 right-0 bottom-0 z-40 w-80 bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Panel header */}
            <div className="px-4 py-3 border-b border-border bg-secondary/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-secondary uppercase tracking-widest">Abby Advisor</p>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{nodeConfig.label}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAbbyOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Contextual tip */}
            <div className="px-4 py-3 border-b border-border bg-secondary/5 shrink-0">
              <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">\uD83D\uDCA1 Tip for this step</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {currentStepConfig.abbyTip}
              </p>
            </div>

            {/* Plan recommendation */}
            {plan && (
              <div className="px-4 py-2.5 border-b border-secondary/20 bg-secondary/5 shrink-0">
                <p className="text-[10px] font-bold text-secondary/80 uppercase tracking-wider mb-0.5">\uD83D\uDCCB From your plan</p>
                <p className="text-[11px] text-muted-foreground">
                  {nodeConfig.abbyGreeting}
                </p>
              </div>
            )}

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {showFirstVisit && (
                <BuilderFirstVisitWelcome
                  builderId={nodeConfig.id}
                  builderLabel={nodeConfig.label}
                  onDismiss={() => {
                    setShowFirstVisit(false);
                    markBuilderFirstVisitSeen(nodeConfig.id);
                  }}
                />
              )}
              {abbyMessages.length === 0 && !showFirstVisit && (
                <div className="text-center py-6">
                  <Sparkles className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground/50">Ask Abby anything about this product</p>
                </div>
              )}
              {abbyMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[90%] rounded-lg p-2.5 text-xs ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}>
                    {msg.role === "assistant" ? (
                      <MarkdownRenderer content={msg.content} />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div className="p-3 border-t border-border bg-muted/30 shrink-0">
              <div className="flex gap-1.5">
                <Textarea
                  value={abbyInput}
                  onChange={(e) => setAbbyInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAbbyMessage(); } }}
                  placeholder="Ask Abby..."
                  className="min-h-[36px] max-h-[80px] resize-none text-xs"
                  rows={1}
                />
                <Button
                  onClick={sendAbbyMessage}
                  disabled={!abbyInput.trim() || abbyStreaming}
                  size="icon"
                  className="shrink-0 h-9 w-9"
                >
                  {abbyStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
