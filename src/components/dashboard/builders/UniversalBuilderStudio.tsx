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
import { useBuilderGeneration } from "@/hooks/useBuilderGeneration";
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
  // Derive legacy generationState for child renderers that still use it
  const generationState = (() => {
    switch (builderGen.act) {
      case "idle": return "idle" as const;
      case "act1_loading": return "analyzing" as const;
      case "act2_proposal": return "idle" as const; // proposal review is a separate UI
      case "act3_generating": return "generating" as const;
      case "act3_complete": return "complete" as const;
      case "error": return "error" as const;
      default: return "idle" as const;
    }
  })();
  const setGenerationState = (_s: string) => {}; // no-op — legacy compat
  const [editedSteps, setEditedSteps] = useState<Set<string>>(new Set());
  const [resolvedBookCoverUrl, setResolvedBookCoverUrl] = useState<string | null>(bookCoverUrl);

  // Abby advisor panel
  const [abbyOpen, setAbbyOpen] = useState(false);
  const [abbyMessages, setAbbyMessages] = useState<Array<{ role: string; content: string }>>([]);
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

  // Auto-save timer — save on every data change (debounced) + periodic interval
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

  // Debounced auto-save on data change (5s after last edit)
  const debounceSaveRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (Object.keys(stepData).length === 0) return;
    if (debounceSaveRef.current) clearTimeout(debounceSaveRef.current);
    debounceSaveRef.current = setTimeout(() => {
      void handleSaveDraft(true);
    }, 5000);
    return () => { if (debounceSaveRef.current) clearTimeout(debounceSaveRef.current); };
  }, [stepData, currentStep, handleSaveDraft]);

  // Periodic auto-save every 30s as backup
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
- Current step: "${currentStepConfig?.label}" — ${currentStepConfig?.description}
- Step tip: ${currentStepConfig?.abbyTip}

IMPORTANT RULES:
- Stay focused ONLY on building this specific ${nodeConfig.label}. Never suggest leaving this page or going to another section.
- Give practical, step-by-step advice about creating, designing, and publishing this product.
- When suggesting titles, suggest exactly 3 options based on the book's frameworks and themes.
- Keep responses brief (under 150 words), actionable, and encouraging.
- Reference specific chapters, frameworks, and concepts from the manuscript when giving advice.
- Use the book's own language and terminology in product names.
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

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.("home")} className="h-auto p-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <ActPhaseBadge act={builderGen.act} />
        </div>

        <div className="flex items-center gap-3">
          {lastSaved && (
            <Badge variant="secondary" className="text-[10px] font-normal">
              Last saved {lastSaved.toLocaleTimeString()}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => void handleSaveDraft()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 h-full">
        {/* Left nav */}
        <div className="w-64 border-r border-border bg-secondary/5 overflow-y-auto">
          <div className="p-4">
            <h2 className="font-semibold text-sm mb-2">{nodeConfig.label} Builder</h2>
            <p className="text-xs text-muted-foreground mb-3">{nodeConfig.description}</p>
            <ROIBanner bookId={bookId} />
          </div>
          <div className="sticky top-0 bg-secondary/5 z-10 py-2">
            <p className="text-xs font-bold uppercase text-muted-foreground px-4">Steps</p>
          </div>
          <div className="flex flex-col gap-0.5 p-2">
            {nodeConfig.steps.map((step, i) => (
              <Button
                key={step.id}
                variant="ghost"
                className="justify-start text-sm px-3 py-2 rounded-md"
                onClick={() => setCurrentStep(i)}
                active={currentStep === i}
              >
                <span className="w-4 shrink-0 mr-2 opacity-50">{i + 1}.</span>
                {step.label}
                {editedSteps.has(step.id) && <Check className="h-4 w-4 ml-auto text-green-500" />}
              </Button>
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 p-6 overflow-y-auto relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep}
              className="absolute top-0 left-0 right-0 bottom-0 p-6 bg-card rounded-lg"
              style={{ originX: 0 }}
              variants={{
                enter: { scale: 0.95, opacity: 0, x: "100%" },
                middle: { scale: 1, opacity: 1, x: "0%" },
                exit: { scale: 1.05, opacity: 0, x: "-100%" },
              }}
              initial="enter"
              animate="middle"
              exit="exit"
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
              }}
            >
              {/* Upgrade gate */}
              {!hasAccess && (
                <BuilderUpgradeGate
                  requiredTier={nodeConfig.requiredTier}
                  currentStepLabel={currentStepConfig?.label}
                />
              )}

              {/* Generation engine */}
              {builderGen.act === "idle" && currentStep === 0 && nodeConfig.id !== "website" && (
                <AbbyProposal
                  bookId={bookId}
                  bookTitle={bookTitle}
                  bookCoverUrl={resolvedBookCoverUrl}
                  nodeConfig={nodeConfig}
                  onStartGeneration={builderGen.startAct1}
                />
              )}
              {builderGen.act === "act1_loading" && (
                <AbbyNarrativeLoading
                  bookTitle={bookTitle}
                  bookCoverUrl={resolvedBookCoverUrl}
                  nodeConfig={nodeConfig}
                />
              )}
              {builderGen.act === "act2_proposal" && (
                <AbbyProposal
                  bookId={bookId}
                  bookTitle={bookTitle}
                  bookCoverUrl={resolvedBookCoverUrl}
                  nodeConfig={nodeConfig}
                  onStartGeneration={builderGen.startAct1}
                />
              )}
              {builderGen.act === "act3_generating" && (
                <AbbyNarrativeLoading
                  bookTitle={bookTitle}
                  bookCoverUrl={resolvedBookCoverUrl}
                  nodeConfig={nodeConfig}
                />
              )}
              {builderGen.act === "act3_complete" && (
                <CrossBuilderPushSummary
                  bookId={bookId}
                  nodeConfig={nodeConfig}
                  generatedSetup={builderGen.setup}
                />
              )}
              {builderGen.act === "error" && (
                <Card className="p-6 text-center">
                  <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
                  <p className="text-sm font-medium">AI generation failed</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Please try again, or edit the previous steps to be more specific.
                  </p>
                  <Button onClick={builderGen.startAct1}>Retry</Button>
                </Card>
              )}

              {/* Step-specific content */}
              {hasAccess && builderGen.act === "act3_complete" && (
                <RENDERER_MAP[nodeConfig.customRenderer || "course"]
                  stepId={currentStepConfig?.id}
                  stepData={stepData}
                  setStepData={setStepData}
                  onMarkEdited={(stepId) => setEditedSteps((prev) => new Set(prev).add(stepId))}
                  bookId={bookId}
                  bookTitle={bookTitle}
                  plan={plan}
                  generationState={generationState}
                  setGenerationState={setGenerationState}
                  userId={user?.id}
                  onStartGeneration={builderGen.startAct1}
                  builderAct={builderGen.act}
                  onNavigate={onNavigate}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right sidebar */}
        <div className="w-80 border-l border-border bg-secondary/5 flex flex-col">
          {/* Abby chat */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Abby, Your AI Advisor
              </h3>
              <Button variant="ghost" size="xs" onClick={() => setAbbyOpen(!abbyOpen)}>
                {abbyOpen ? <X className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {currentStepConfig?.abbyTip || "Need help with this step? Ask Abby!"}
            </p>
          </div>

          {abbyOpen ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {abbyMessages.map((msg, i) => (
                  <div key={i} className="flex flex-col">
                    <p className="text-[10px] font-bold">{msg.role === "user" ? "You" : "Abby"}</p>
                    <MarkdownRenderer className="text-xs leading-relaxed whitespace-pre-line">{msg.content}</MarkdownRenderer>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-border">
                <Textarea
                  value={abbyInput}
                  onChange={(e) => setAbbyInput(e.target.value)}
                  placeholder="Ask Abby a question..."
                  className="text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendAbbyMessage();
                    }
                  }}
                />
                <div className="flex items-center justify-between mt-2">
                  <Button variant="secondary" size="xs" onClick={() => void sendAbbyMessage()} disabled={abbyStreaming}>
                    {abbyStreaming ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Send className="h-3 w-3 mr-2" />}
                    Send to Abby
                  </Button>
                  <Button variant="link" size="xs" className="text-[10px] p-0 h-auto">
                    <Wand2 className="h-3 w-3 mr-1" />
                    AI refine
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
              <Lock className="h-6 w-6 mb-2" />
              <p className="text-xs">
                Unlock the power of AI guidance.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-secondary/5">
        <Button variant="outline" size="sm" onClick={goPrev} disabled={currentStep === 0} className="text-xs">
          <ChevronLeft className="h-3.5 w-3.5 mr-2" />
          Previous Step
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Step {currentStep + 1} of {nodeConfig.steps.length}
          <span className="px-1">|</span>
          <span className="font-medium">{currentStepConfig?.label}</span>
        </div>
        <Button size="sm" onClick={goNext} disabled={!hasAccess} className="text-xs">
          {isLastStep ? "Complete Builder" : "Continue to Next Step"}
          <ArrowRight className="h-3.5 w-3.5 ml-2" />
        </Button>
      </div>
      <CrossBuilderNotifications bookId={bookId} />
    </div>
  );
}
