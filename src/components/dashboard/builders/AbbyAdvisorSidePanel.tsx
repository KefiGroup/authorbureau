import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import BuilderFirstVisitWelcome, { hasSeenBuilderFirstVisit, markBuilderFirstVisitSeen } from "./BuilderFirstVisitWelcome";
import { BUILDER_SYSTEM_PROMPTS } from "./builderSystemPrompts";
import type { BuilderNodeConfig } from "./builderNodeConfig";

interface AbbyAdvisorSidePanelProps {
  open: boolean;
  onClose: () => void;
  nodeConfig: BuilderNodeConfig;
  bookId: string;
  bookTitle: string;
  currentStepLabel: string;
  currentStepDescription: string;
  currentStepTip: string;
  plan: any;
  manuscriptSummary: string;
  frameworks: string;
}

const AI_GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`;

export default function AbbyAdvisorSidePanel({
  open,
  onClose,
  nodeConfig,
  bookId,
  bookTitle,
  currentStepLabel,
  currentStepDescription,
  currentStepTip,
  plan,
  manuscriptSummary,
  frameworks,
}: AbbyAdvisorSidePanelProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showFirstVisit, setShowFirstVisit] = useState(() => !hasSeenBuilderFirstVisit(nodeConfig.id));
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getToken = async (): Promise<string> => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setStreaming(true);

    try {
      const token = await getToken();
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
- Current step: "${currentStepLabel}" — ${currentStepDescription}
- Step tip: ${currentStepTip}

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
          builderStep: currentStepLabel,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Chat failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let accumulated = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: accumulated };
                return copy;
              });
            }
          } catch (error) {
            console.error(error);
            break;
          }
        }
      }
    } catch (err) {
      console.error("Abby chat error:", err);
      toast({ title: "Chat failed", description: "Try again in a moment", variant: "destructive" });
    } finally {
      setStreaming(false);
    }
  }, [input, messages, streaming, bookId, bookTitle, nodeConfig, currentStepLabel, currentStepDescription, currentStepTip, plan, manuscriptSummary, frameworks, toast]);

  return (
    <AnimatePresence>
      {open && (
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
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Contextual tip */}
          <div className="px-4 py-3 border-b border-border bg-secondary/5 shrink-0">
            <p className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">💡 Tip for this step</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {currentStepTip}
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
            {messages.length === 0 && !showFirstVisit && (
              <div className="text-center py-6">
                <Sparkles className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground/50">Ask Abby anything about this product</p>
              </div>
            )}
            {messages.map((msg, i) => (
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
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask Abby..."
                className="min-h-[36px] max-h-[80px] resize-none text-xs"
                rows={1}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                size="icon"
                className="shrink-0 h-9 w-9"
              >
                {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
