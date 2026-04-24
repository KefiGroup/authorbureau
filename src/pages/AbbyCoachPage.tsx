import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, Send, Loader2, ArrowLeft, MessageSquarePlus } from "lucide-react";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface ChatMessage {
  id?: string;
  role: "user" | "abby";
  content: string;
  created_at?: string;
}

const SUGGESTED_QUESTIONS = [
  "What should I focus on next to grow my revenue?",
  "How is my email list growing compared to last month?",
  "Which of my nodes is performing best?",
  "What's the fastest way to get my first 1,000 subscribers?",
  "How do I price my coaching packages?",
  "What's my projected annual revenue if I activate all nodes?",
];

export default function AbbyCoachPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [penName, setPenName] = useState("Author");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load author profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("author_profiles")
      .select("id, pen_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAuthorId(data.id);
          setPenName(data.pen_name || "Author");
        }
      });
  }, [user]);

  // Load conversation history
  useEffect(() => {
    if (!authorId) return;
    supabase
      .from("abby_conversations")
      .select("id, role, content, created_at")
      .eq("author_id", authorId)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        setMessages((data as ChatMessage[]) || []);
        setLoading(false);
      });
  }, [authorId]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;

    const userMsg: ChatMessage = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("No auth token");

      const history = messages.map((m) => ({ role: m.role === "abby" ? "assistant" : "user", content: m.content }));

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abby-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: msg,
            conversation_history: history,
          }),
        }
      );

      const result = await resp.json();
      if (result.success && result.reply) {
        setMessages((prev) => [...prev, { role: "abby", content: result.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: "abby", content: "I'm having trouble right now. Please try again in a moment!" }]);
      }
    } catch (err) {
      console.error("ABBY chat error:", err);
      setMessages((prev) => [...prev, { role: "abby", content: "Something went wrong. Please try again!" }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages]);

  const clearConversation = async () => {
    if (!authorId) return;
    await supabase.from("abby_conversations").delete().eq("author_id", authorId);
    setMessages([]);
  };

  if (!user) return null;

  return (
    <DashboardLayout bare>
      <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <h1 className="text-base font-bold">ABBY — Your AI Business Coach</h1>
              <p className="text-xs text-muted-foreground">Ask me anything about your author business</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={clearConversation} className="gap-1.5 text-xs">
            <MessageSquarePlus className="h-3.5 w-3.5" />
            New Conversation
          </Button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          {/* Suggested questions when empty */}
          {!loading && messages.length === 0 && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-secondary" />
                </div>
                <h2 className="text-lg font-bold mb-1">Hi {penName}! 👋</h2>
                <p className="text-sm text-muted-foreground">I know everything about your author business. Ask me anything!</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <Card
                    key={i}
                    className="p-3 cursor-pointer hover:border-secondary/50 hover:bg-secondary/5 transition-colors"
                    onClick={() => sendMessage(q)}
                  >
                    <p className="text-xs text-foreground leading-relaxed">{q}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-start gap-2.5 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "abby" ? (
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-4 w-4 text-secondary" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary-foreground">
                      {penName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className={`rounded-xl px-3.5 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}>
                  {msg.role === "abby" ? (
                    <MarkdownRenderer content={msg.content} />
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {sending && (
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-secondary" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask ABBY anything..."
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            rows={1}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending}
            size="icon"
            className="shrink-0 h-11 w-11"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
