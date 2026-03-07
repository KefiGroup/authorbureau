import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, BookOpen, Check, Loader2, Save,
  Sparkles, X, Send, ChevronLeft, Lock, AlertCircle, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, hasTierAccess, TIERS } from "@/hooks/useAuth";
import { useAbbyPlan } from "@/hooks/useAbbyPlan";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import CourseStepRenderer from "./course/CourseStepRenderer";
import HomeStudyStepRenderer from "./home-study/HomeStudyStepRenderer";
import WorkbookStepRenderer from "./workbook/WorkbookStepRenderer";
import AudiobookStepRenderer from "./audiobook/AudiobookStepRenderer";
import MembershipStepRenderer from "./membership/MembershipStepRenderer";
import type { BuilderNodeConfig, BuilderStep } from "./builderNodeConfig";

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
  const bookCoverUrl = searchParams.get("bookCoverUrl") || null;

  // Builder state
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [generationState, setGenerationState] = useState<"idle" | "queued" | "analyzing" | "generating" | "complete" | "error">("idle");
  const [editedSteps, setEditedSteps] = useState<Set<string>>(new Set());

  // Abby advisor panel
  const [abbyOpen, setAbbyOpen] = useState(false);
  const [abbyMessages, setAbbyMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [abbyInput, setAbbyInput] = useState("");
  const [abbyStreaming, setAbbyStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Plan context
  const { plan, loading: planLoading } = useAbbyPlan(bookId);

  // Check tier access
  const hasAccess = isPremium || isAdmin || hasTierAccess(tier, nodeConfig.requiredTier);

  // Auto-save timer
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (Object.keys(stepData).length > 0) {
        handleSaveDraft(true);
      }
    }, 30000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [stepData]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [abbyMessages]);

  const handleSaveDraft = async (silent = false) => {
    if (!user || !bookId) return;
    setSaving(true);
    try {
      // Save to generated_assets as builder draft
      const content = JSON.stringify({
        nodeId: nodeConfig.id,
        currentStep,
        stepData,
        editedSteps: Array.from(editedSteps),
        savedAt: new Date().toISOString(),
      });

      const { data: existing } = await supabase
        .from("generated_assets")
        .select("id")
        .eq("author_id", user.id)
        .eq("book_id", bookId)
        .eq("asset_type", `builder_draft_${nodeConfig.id}`)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("generated_assets")
          .update({ content, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("generated_assets").insert({
          author_id: user.id,
          book_id: bookId,
          asset_type: `builder_draft_${nodeConfig.id}`,
          content,
        });
      }

      setLastSaved(new Date());
      if (!silent) toast({ title: "Draft saved" });
    } catch {
      if (!silent) toast({ title: "Save failed", variant: "destructive" });
    }
    setSaving(false);
  };

  // Load saved draft on mount
  useEffect(() => {
    if (!user || !bookId) return;
    (async () => {
      const { data } = await supabase
        .from("generated_assets")
        .select("content")
        .eq("author_id", user.id)
        .eq("book_id", bookId)
        .eq("asset_type", `builder_draft_${nodeConfig.id}`)
        .maybeSingle();
      if (data?.content) {
        try {
          const parsed = JSON.parse(data.content);
          if (parsed.stepData) setStepData(parsed.stepData);
          if (parsed.currentStep) setCurrentStep(parsed.currentStep);
          if (parsed.editedSteps) setEditedSteps(new Set(parsed.editedSteps));
        } catch {}
      }
    })();
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
              content: `You are Abby, the AI business advisor for Authors Bureau. You're helping an author build a "${nodeConfig.label}" product for their book "${bookTitle}". Current step: "${currentStepConfig?.label}". Business plan context: ${plan ? JSON.stringify(plan).slice(0, 2000) : "Not yet created"}. Keep responses brief (under 150 words), actionable, and encouraging.`,
            },
            ...newMsgs,
          ],
          bookId,
          isPremium: true,
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
  }, [abbyInput, abbyMessages, abbyStreaming, bookId, bookTitle, nodeConfig, currentStep, plan]);

  const goNext = () => {
    handleSaveDraft(true);
    if (currentStep < nodeConfig.steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const goPrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const currentStepConfig = nodeConfig.steps[currentStep];
  const isLastStep = currentStep === nodeConfig.steps.length - 1;

  // ─── SUBSCRIPTION GATE ─────────────────────────────────────────────
  if (!hasAccess) {
    const reqTier = nodeConfig.requiredTier as "starter" | "pro" | "enterprise";
    const tierInfo = TIERS[reqTier];
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="h-8 w-8 text-secondary" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-3">{nodeConfig.label}</h2>
        <p className="text-muted-foreground text-sm mb-4">
          This builder is included in your <strong>{tierInfo.label}</strong> plan.
          Upgrade to unlock it and start generating revenue from {nodeConfig.label.toLowerCase()}.
        </p>
        {plan && (
          <Card className="p-4 border-secondary/20 bg-secondary/5 mb-6 text-left max-w-md mx-auto">
            <p className="text-xs font-semibold text-secondary mb-1">📊 Revenue Projection from Your Plan</p>
            <p className="text-sm text-muted-foreground">
              Your business plan projects this product can generate revenue within {plan.packages[reqTier]?.timeline || "3-6 months"}.
            </p>
          </Card>
        )}
        <Button
          onClick={async () => {
            try {
              const { data, error } = await supabase.functions.invoke("create-checkout", {
                body: { priceId: tierInfo.price_id },
              });
              if (error) throw error;
              if (data?.url) window.open(data.url, "_blank");
            } catch (err) {
              console.error("Checkout error:", err);
            }
          }}
          className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold px-8"
        >
          Upgrade to {tierInfo.label} — ${tierInfo.monthlyPrice}/month
        </Button>
      </div>
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
            onClick={() => onNavigate?.("my-books")}
            className="text-muted-foreground hover:text-foreground shrink-0 -ml-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to {nodeConfig.category === "build" ? "B·Build" : nodeConfig.category === "bridge" ? "B·Bridge" : "Y·Yield"}
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
            {bookCoverUrl ? (
              <img src={bookCoverUrl} alt="" className="h-full w-full object-cover" />
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
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepConfig.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="max-w-3xl">
                <div className="flex items-start justify-between mb-6">
                  <div>
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

                {/* Generation states */}
                {generationState !== "idle" && generationState !== "complete" && (
                  <Card className="p-6 mb-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-secondary mx-auto mb-3" />
                    <p className="text-sm font-medium">
                      {generationState === "queued" && "Preparing to analyze your manuscript..."}
                      {generationState === "analyzing" && "Reading chapters and extracting key concepts..."}
                      {generationState === "generating" && `Creating your ${nodeConfig.label.toLowerCase()}...`}
                    </p>
                    <div className="w-48 h-1.5 bg-muted rounded-full mx-auto mt-3 overflow-hidden">
                      <motion.div
                        className="h-full bg-secondary rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: generationState === "queued" ? "20%" : generationState === "analyzing" ? "60%" : "90%" }}
                        transition={{ duration: 2 }}
                      />
                    </div>
                  </Card>
                )}

                {generationState === "error" && (
                  <Card className="p-4 mb-6 border-destructive/30 bg-destructive/5">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <p className="text-sm font-medium text-destructive">Something went wrong.</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => setGenerationState("idle")}>Retry</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAbbyOpen(true)}>Ask Abby for help</Button>
                    </div>
                  </Card>
                )}

                {/* Step content — custom renderer or generic placeholder */}
                {nodeConfig.customRenderer === "course" ? (
                  <CourseStepRenderer
                    stepId={currentStepConfig.id}
                    stepData={stepData}
                    setStepData={setStepData}
                    onMarkEdited={(id) => setEditedSteps(prev => new Set([...prev, id]))}
                    bookId={bookId}
                    bookTitle={bookTitle}
                    plan={plan}
                    generationState={generationState}
                    setGenerationState={setGenerationState}
                    userId={user?.id || ""}
                  />
                ) : nodeConfig.customRenderer === "home-study" ? (
                  <HomeStudyStepRenderer
                    stepId={currentStepConfig.id}
                    stepData={stepData}
                    setStepData={setStepData}
                    onMarkEdited={(id) => setEditedSteps(prev => new Set([...prev, id]))}
                    bookId={bookId}
                    bookTitle={bookTitle}
                    plan={plan}
                    generationState={generationState}
                    setGenerationState={setGenerationState}
                    userId={user?.id || ""}
                  />
                ) : nodeConfig.customRenderer === "workbook" ? (
                  <WorkbookStepRenderer
                    stepId={currentStepConfig.id}
                    stepData={stepData}
                    setStepData={setStepData}
                    onMarkEdited={(id) => setEditedSteps(prev => new Set([...prev, id]))}
                    bookId={bookId}
                    bookTitle={bookTitle}
                    plan={plan}
                    generationState={generationState}
                    setGenerationState={setGenerationState}
                    userId={user?.id || ""}
                  />
                ) : nodeConfig.customRenderer === "audiobook" ? (
                  <AudiobookStepRenderer
                    stepId={currentStepConfig.id}
                    stepData={stepData}
                    setStepData={setStepData}
                    onMarkEdited={(id) => setEditedSteps(prev => new Set([...prev, id]))}
                    bookId={bookId}
                    bookTitle={bookTitle}
                    plan={plan}
                    generationState={generationState}
                    setGenerationState={setGenerationState}
                    userId={user?.id || ""}
                  />
                ) : nodeConfig.customRenderer === "membership" ? (
                  <MembershipStepRenderer
                    stepId={currentStepConfig.id}
                    stepData={stepData}
                    setStepData={setStepData}
                    onMarkEdited={(id) => setEditedSteps(prev => new Set([...prev, id]))}
                    bookId={bookId}
                    bookTitle={bookTitle}
                    plan={plan}
                    generationState={generationState}
                    setGenerationState={setGenerationState}
                    userId={user?.id || ""}
                  />
                ) : (generationState === "idle" || generationState === "complete") ? (
                  <Card className="p-6 min-h-[300px] border-dashed border-2">
                    <div className="text-center py-12">
                      <Wand2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                      <h3 className="font-heading text-lg font-semibold mb-2">{currentStepConfig.label}</h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                        {currentStepConfig.description}
                      </p>
                      {currentStepConfig.id === "generate" || currentStepConfig.id === "script" || currentStepConfig.id === "curriculum" ? (
                        <Button
                          className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                          onClick={() => {
                            setGenerationState("queued");
                            setTimeout(() => setGenerationState("analyzing"), 2000);
                            setTimeout(() => setGenerationState("generating"), 5000);
                            setTimeout(() => {
                              setGenerationState("complete");
                              setStepData(prev => ({
                                ...prev,
                                [currentStepConfig.id]: { generated: true, timestamp: new Date().toISOString() },
                              }));
                              toast({ title: "Content generated!", description: "Review and edit below." });
                            }, 8000);
                          }}
                        >
                          <Sparkles className="h-4 w-4 mr-2" /> Generate with AI
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground/50">
                          Builder step content will be populated by AI generation
                        </p>
                      )}
                    </div>
                  </Card>
                ) : null}
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
              onClick={isLastStep ? () => {
                handleSaveDraft(false);
                toast({ title: "Published! 🎉", description: `Your ${nodeConfig.label.toLowerCase()} is now live.` });
              } : goNext}
              className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold px-6"
            >
              {isLastStep ? (
                <>Publish</>
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
              <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">💡 Tip for this step</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {currentStepConfig.abbyTip}
              </p>
            </div>

            {/* Plan recommendation */}
            {plan && (
              <div className="px-4 py-2.5 border-b border-secondary/20 bg-secondary/5 shrink-0">
                <p className="text-[10px] font-bold text-secondary/80 uppercase tracking-wider mb-0.5">📋 From your plan</p>
                <p className="text-[11px] text-muted-foreground">
                  {nodeConfig.abbyGreeting}
                </p>
              </div>
            )}

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {abbyMessages.length === 0 && (
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
