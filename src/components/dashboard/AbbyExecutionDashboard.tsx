import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, CheckCircle2, Circle, Loader2, Clock, ArrowRight, 
  X, Download, ExternalLink, ChevronRight, Pause, Play, AlertCircle,
  FileText, Settings, Link2, BarChart3, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";

interface ExecutionStep {
  id: string;
  label: string;
  description: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed" | "awaiting_approval";
  duration: string;
  result?: any;
  preview?: string;
}

interface Props {
  bookId: string;
  bookTitle: string;
  productNode: string;
  productLabel: string;
  businessPlan: any;
  onClose: () => void;
  onComplete: (productNode: string) => void;
  authorName?: string;
  bookDescription?: string;
}

const EXECUTE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abby-execute`;

const stepIcons: Record<string, any> = {
  analyze: BookOpen,
  generate: Sparkles,
  save: FileText,
  configure: Settings,
  connectors: Link2,
  "update-plan": BarChart3,
};

export default function AbbyExecutionDashboard({
  bookId, bookTitle, productNode, productLabel, businessPlan,
  onClose, onComplete, authorName, bookDescription,
}: Props) {
  const { toast } = useToast();
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [configSuggestions, setConfigSuggestions] = useState<any>(null);
  const [connectors, setConnectors] = useState<any[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Get auth token
  const getToken = async (): Promise<string> => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  };

  // Initialize — fetch step plan
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const resp = await fetch(EXECUTE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "plan", bookId, productNode, businessPlan }),
        });
        const data = await resp.json();
        if (data.steps) setSteps(data.steps);
      } catch (err) {
        console.error("Failed to get execution plan:", err);
      }
    })();
  }, [bookId, productNode]);

  // Update progress
  useEffect(() => {
    if (steps.length === 0) return;
    const completed = steps.filter(s => s.status === "completed").length;
    setOverallProgress(Math.round((completed / steps.length) * 100));
  }, [steps]);

  // Execute all steps sequentially
  const startExecution = useCallback(async () => {
    setIsRunning(true);
    setIsPaused(false);

    for (let i = 0; i < steps.length; i++) {
      if (isPaused) {
        setCurrentStepIdx(i);
        return;
      }

      setCurrentStepIdx(i);
      setSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: "running" } : s
      ));

      try {
        const token = await getToken();
        const step = steps[i];

        if (step.type === "generate") {
          // Stream generation
          const abort = new AbortController();
          abortRef.current = abort;

          const resp = await fetch(EXECUTE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              action: "step",
              bookId,
              productNode,
              stepId: step.id,
              stepType: "generate",
              context: {
                bookTitle,
                bookDescription,
                authorName,
                businessPlan,
              },
            }),
            signal: abort.signal,
          });

          if (!resp.ok || !resp.body) throw new Error("Generation failed");

          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let textBuffer = "";
          let accumulated = "";

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
                  setGeneratedContent(accumulated);
                }
              } catch { break; }
            }
          }

          setGeneratedContent(accumulated);
          setSteps(prev => prev.map((s, idx) =>
            idx === i ? { ...s, status: "completed", preview: accumulated.substring(0, 200) + "..." } : s
          ));
          continue;
        }

        if (step.type === "save") {
          await fetch(EXECUTE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              action: "step",
              bookId,
              productNode,
              stepId: step.id,
              stepType: "save",
              context: { content: generatedContent, assetType: productNode },
            }),
          });

          // Also populate domain table
          try {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/populate-assets`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                assetType: productNode,
                bookId,
                rawContent: generatedContent,
              }),
            });
          } catch { /* non-critical */ }

          setSteps(prev => prev.map((s, idx) =>
            idx === i ? { ...s, status: "completed" } : s
          ));
          continue;
        }

        if (step.type === "configure") {
          const resp = await fetch(EXECUTE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              action: "step",
              bookId,
              productNode,
              stepId: step.id,
              stepType: "configure",
              businessPlan,
              context: { bookTitle },
            }),
          });
          const data = await resp.json();
          setConfigSuggestions(data.config);
          // Pause for approval
          setSteps(prev => prev.map((s, idx) =>
            idx === i ? { ...s, status: "awaiting_approval" } : s
          ));
          setIsRunning(false);
          return; // Wait for user approval
        }

        if (step.type === "connectors") {
          const resp = await fetch(EXECUTE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              action: "step",
              bookId,
              productNode,
              stepId: step.id,
              stepType: "connectors",
            }),
          });
          const data = await resp.json();
          setConnectors(data.connectors || []);
          setSteps(prev => prev.map((s, idx) =>
            idx === i ? { ...s, status: "completed" } : s
          ));
          continue;
        }

        if (step.type === "update-plan") {
          const completedProducts = steps
            .filter(s => s.status === "completed" && s.type === "generate")
            .map(s => productNode);

          await fetch(EXECUTE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              action: "update-plan",
              bookId,
              businessPlan,
              completedProducts: [...completedProducts, productNode],
            }),
          });

          setSteps(prev => prev.map((s, idx) =>
            idx === i ? { ...s, status: "completed" } : s
          ));
          continue;
        }
      } catch (err: any) {
        console.error(`Step ${steps[i].id} failed:`, err);
        setSteps(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: "failed" } : s
        ));
        toast({ title: "Step failed", description: err.message, variant: "destructive" });
      }
    }

    setIsRunning(false);
    onComplete(productNode);
    toast({ title: "✅ Product built!", description: `${productLabel} has been created and your business plan updated.` });
  }, [steps, bookId, productNode, generatedContent, businessPlan, isPaused]);

  // Resume after approval
  const approveAndContinue = useCallback(async () => {
    // Mark configure step as completed
    setSteps(prev => prev.map(s =>
      s.status === "awaiting_approval" ? { ...s, status: "completed" } : s
    ));

    // Find next step index
    const nextIdx = steps.findIndex(s => s.status === "awaiting_approval");
    if (nextIdx >= 0) {
      setCurrentStepIdx(nextIdx + 1);
      // Continue from next step
      setIsRunning(true);
      // Re-run from the next step
      const remaining = steps.slice(nextIdx + 1);
      for (let i = 0; i < remaining.length; i++) {
        const realIdx = nextIdx + 1 + i;
        setCurrentStepIdx(realIdx);
        setSteps(prev => prev.map((s, idx) =>
          idx === realIdx ? { ...s, status: "running" } : s
        ));

        try {
          const token = await getToken();
          const step = remaining[i];

          if (step.type === "connectors") {
            const resp = await fetch(EXECUTE_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                action: "step",
                bookId,
                productNode,
                stepId: step.id,
                stepType: "connectors",
              }),
            });
            const data = await resp.json();
            setConnectors(data.connectors || []);
          }

          if (step.type === "update-plan") {
            await fetch(EXECUTE_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                action: "update-plan",
                bookId,
                businessPlan,
                completedProducts: [productNode],
              }),
            });
          }

          setSteps(prev => prev.map((s, idx) =>
            idx === realIdx ? { ...s, status: "completed" } : s
          ));
        } catch (err: any) {
          setSteps(prev => prev.map((s, idx) =>
            idx === realIdx ? { ...s, status: "failed" } : s
          ));
        }
      }

      setIsRunning(false);
      onComplete(productNode);
      toast({ title: "✅ Product built!", description: `${productLabel} has been created and your business plan updated.` });
    }
  }, [steps, bookId, productNode, businessPlan]);

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "running": return <Loader2 className="h-5 w-5 text-secondary animate-spin" />;
      case "failed": return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "awaiting_approval": return <Pause className="h-5 w-5 text-amber-500" />;
      default: return <Circle className="h-5 w-5 text-muted-foreground/30" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg">Abby is building: {productLabel}</h2>
            <p className="text-xs text-muted-foreground">{bookTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-4">
            <p className="text-sm font-semibold">{overallProgress}%</p>
            <p className="text-[10px] text-muted-foreground">Complete</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-2 bg-muted/30">
        <Progress value={overallProgress} className="h-2" />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Step List */}
        <div className="w-80 border-r border-border bg-card overflow-y-auto p-4 space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
            Execution Plan
          </p>
          {steps.map((step, i) => {
            const IconComp = stepIcons[step.id] || Circle;
            const isActive = i === currentStepIdx;
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                  isActive ? "bg-secondary/10 border border-secondary/30" : "hover:bg-muted/50"
                }`}
              >
                {statusIcon(step.status)}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {step.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {step.duration}
                  </p>
                </div>
              </motion.div>
            );
          })}

          {/* Start / Status */}
          <div className="pt-4">
            {!isRunning && currentStepIdx === -1 && steps.length > 0 && (
              <Button onClick={startExecution} className="w-full gap-2">
                <Play className="h-4 w-4" /> Start Building
              </Button>
            )}
            {isRunning && (
              <p className="text-xs text-center text-secondary font-medium animate-pulse">
                ⚡ Abby is working...
              </p>
            )}
            {!isRunning && overallProgress === 100 && (
              <div className="text-center space-y-2">
                <p className="text-sm font-semibold text-green-600">✅ All steps complete!</p>
                <Button onClick={onClose} variant="outline" size="sm" className="w-full">
                  Return to Dashboard
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Generated Content Preview */}
          {generatedContent && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-secondary" />
                  <h3 className="font-heading font-semibold text-sm">Generated Content Preview</h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto rounded-lg bg-muted/30 p-4 border border-border">
                  <MarkdownRenderer content={generatedContent} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Config Suggestions (Approval Gate) */}
          {configSuggestions && steps.some(s => s.status === "awaiting_approval") && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-amber-600" />
                  <h3 className="font-heading font-semibold text-sm">Review Product Settings</h3>
                  <span className="text-[10px] bg-amber-500/15 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Awaiting your approval
                  </span>
                </div>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-card p-3 border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Suggested Title</p>
                    <p className="text-sm font-semibold mt-1">{configSuggestions.suggested_title}</p>
                  </div>
                  <div className="rounded-lg bg-card p-3 border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Suggested Price</p>
                    <p className="text-sm font-semibold mt-1">
                      {configSuggestions.suggested_currency} {configSuggestions.suggested_price}
                    </p>
                  </div>
                </div>

                {configSuggestions.suggested_description && (
                  <div className="rounded-lg bg-card p-3 border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Description</p>
                    <p className="text-sm mt-1">{configSuggestions.suggested_description}</p>
                  </div>
                )}

                {configSuggestions.reasoning && (
                  <div className="flex items-start gap-2 rounded-lg bg-secondary/10 p-3">
                    <Sparkles className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground/80 leading-relaxed">{configSuggestions.reasoning}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={approveAndContinue} className="flex-1 gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Approve & Continue
                  </Button>
                  <Button variant="outline" onClick={approveAndContinue} className="gap-2">
                    Skip for now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connectors */}
          {connectors.length > 0 && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Link2 className="h-4 w-4 text-secondary" />
                  <h3 className="font-heading font-semibold text-sm">Distribution Channels</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Abby recommends these platforms to distribute your {productLabel}:
                </p>
                <div className="space-y-2">
                  {connectors.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <div className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                        c.type === "free" ? "bg-green-500/15 text-green-700" : "bg-violet-500/15 text-violet-700"
                      }`}>
                        {c.type === "free" ? "Free" : "Pro"}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground">{c.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => window.open(c.url, "_blank")}
                      >
                        Visit <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Idle State */}
          {!generatedContent && !configSuggestions && connectors.length === 0 && !isRunning && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mb-4 text-3xl">
                👩‍💼
              </div>
              <h3 className="font-heading text-lg font-bold mb-2">Ready to build {productLabel}</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Abby will analyze your manuscript, generate the content, configure settings for your approval,
                and prepare distribution — all in one guided flow.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
