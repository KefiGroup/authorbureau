import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ChevronRight, ChevronLeft, FileText, ArrowRight,
  Loader2, MessageCircle, X, Send, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import type { AbbyPlan } from "@/components/dashboard/BusinessPlanCard";
// Builder first-visit welcome retired with the legacy UniversalBuilderStudio flow.
const FIRST_VISIT_KEY = (id: string) => `ab_builder_welcome_seen_${id}`;
const hasSeenBuilderFirstVisit = (id: string) => {
  try { return typeof window !== "undefined" && localStorage.getItem(FIRST_VISIT_KEY(id)) === "1"; }
  catch { return true; }
};
const markBuilderFirstVisitSeen = (id: string) => {
  try { localStorage.setItem(FIRST_VISIT_KEY(id), "1"); } catch { /* ignore */ }
};

interface Props {
  bookId: string;
  bookTitle: string;
  productNode: string; // e.g. "workbook", "course", "social-media"
  productLabel: string;
  className?: string;
}

const EXECUTE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abby-execute`;
const AI_GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`;

export default function AbbyAdvisorPanel({ bookId, bookTitle, productNode, productLabel, className }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [plan, setPlan] = useState<AbbyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showFirstVisit, setShowFirstVisit] = useState(() => !hasSeenBuilderFirstVisit(productNode));

  const getToken = async (): Promise<string> => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  };

  // Load business plan on open
  // Generate contextual advice for this specific product
  const generateContextualAdvice = useCallback((planData: AbbyPlan) => {
    // Find this product in the plan
    let productInfo: any = null;
    let tierName = "";
    for (const tier of ["brand", "build", "yield"] as const) {
      const pkg = planData.packages[tier];
      if (!pkg?.products) continue;
      const match = pkg.products.find(p =>
        p.node?.toLowerCase().includes(productNode.toLowerCase()) ||
        productNode.toLowerCase().includes(p.node?.toLowerCase() || "")
      );
      if (match) {
        productInfo = match;
        tierName = pkg.label;
        break;
      }
    }

    if (productInfo) {
      setAdvice(`**📋 From your Business Plan (${tierName}):**\n\n` +
        `**${productInfo.title}** — ${productInfo.pricing}\n\n` +
        `${productInfo.reasoning}\n\n` +
        `**Revenue target:** ${productInfo.monthly_revenue_low} – ${productInfo.monthly_revenue_high}/month\n\n` +
        `💡 *Tip: Ask me anything about building this product — I have your full plan context!*`
      );
    } else {
      setAdvice(`I'm ready to help with **${productLabel}**! Ask me about creating content, design tips, pricing, or publishing strategy. Just type below!`);
    }
  }, [productNode, productLabel]);

  useEffect(() => {
    if (!isOpen || plan) return;
    (async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const resp = await fetch(EXECUTE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "status", bookId }),
        });
        const data = await resp.json();
        if (data.plan) {
          setPlan(data.plan);
          generateContextualAdvice(data.plan);
        }
      } catch (err) {
        console.error("Failed to load plan:", err);
      }
      setLoading(false);
    })();
  }, [isOpen, bookId, plan, generateContextualAdvice]);

  // Chat with Abby in context
  const sendChat = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    try {
      const token = await getToken();
      const resp = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [
            { role: "system", content: `You are Abby, providing practical advice about building "${productLabel}" for the book "${bookTitle}". Focus ONLY on this specific product — how to create it, design it, price it, and publish/sell it. Never suggest leaving this page or going to Analyze with Abby. ${plan ? `Business plan context: ${JSON.stringify(plan)}` : "No business plan — that's fine, give direct actionable advice about this product."}. Keep responses brief and actionable.` },
            ...newMessages,
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
      setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);

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
              setChatMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: accumulated };
                return copy;
              });
            }
          } catch (error) { console.error(error); break; }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsStreaming(false);
    }
  }, [input, chatMessages, isStreaming, bookId, bookTitle, productLabel, plan]);

  // Floating toggle button
  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow ${className}`}
        title="Ask Abby for advice"
      >
        <Sparkles className="h-6 w-6" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        className="fixed top-0 right-0 bottom-0 z-40 w-96 bg-card border-l border-border shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-secondary/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest">Abby Advisor</p>
              <p className="text-[11px] text-muted-foreground">{productLabel} — {bookTitle}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* First Visit Welcome — replaced by inline tip card */}
              {showFirstVisit && (
                <Card className="p-3 border-primary/20 bg-primary/5">
                  <p className="text-sm font-medium mb-1">Welcome to {productLabel}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Ask Abby anything about creating, designing, pricing, or publishing this product.
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowFirstVisit(false);
                      markBuilderFirstVisitSeen(productNode);
                    }}
                  >
                    Got it
                  </Button>
                </Card>
              )}

              {/* Plan Context */}
              {advice && (
                <Card className="p-3 border-secondary/20 bg-secondary/5">
                  <MarkdownRenderer content={advice} />
                </Card>
              )}

              {!plan && !advice && (
                <Card className="p-3 border-secondary/20 bg-secondary/5">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold">Ask me anything about {productLabel}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        I can help with content creation, design, pricing, and publishing strategy. Just type below!
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Chat Messages */}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
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
            </>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-3 border-t border-border bg-muted/30">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
              placeholder="Ask Abby about this product..."
              className="min-h-[40px] max-h-[100px] resize-none text-sm"
              rows={1}
            />
            <Button
              onClick={sendChat}
              disabled={!input.trim() || isStreaming}
              size="icon"
              className="shrink-0"
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
