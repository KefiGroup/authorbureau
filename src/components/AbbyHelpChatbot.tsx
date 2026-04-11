import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sparkles, X, ChevronDown, HelpCircle, Bug, MessageSquare, Send, Paperclip, ArrowUp, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type ConversationMode = "help" | "bug" | "feedback";
type BugStep = "page" | "description" | "screenshot" | "priority" | "confirm";
type FeedbackStep = "type" | "description" | "importance" | "confirm";

const STORAGE_KEY = "abby_help_chat";
const OPENED_KEY = "abby_help_opened";

const PAGE_OPTIONS = [
  "Dashboard", "My Books Hub", "Analyze with Abby", "Brand Products",
  "Build Authority", "Yield Revenue", "Author Profile", "My Microsite",
  "Reading Club", "Admin Panel", "Homepage", "Directory", "Other"
];

function getContextGreeting(user: any, pathname: string): string {
  const name = user?.user_metadata?.display_name?.split(" ")[0] || user?.email?.split("@")[0] || "";
  
  if (!user) {
    return "Hi! I'm Abby, your guide to Authors Bureau. I can help you understand how the platform works, how to get your book featured, or answer any questions. What can I help you with?";
  }
  if (pathname.includes("/dashboard/book/")) {
    return `Hi ${name}! This is where you manage your book and track your monetization journey. Need help adding a book, setting up your microsite, or starting an analysis?`;
  }
  if (pathname === "/dashboard" || pathname === "/my-books") {
    return `Hi ${name}! I see you're in your dashboard. Need help with anything? You can also report a bug or share feedback anytime — just click the buttons above.`;
  }
  return `Welcome back, ${name}! Need help with anything? I can guide you through the dashboard, help with your microsite, or answer questions about building your author business.`;
}

function detectCurrentPage(pathname: string): string {
  if (pathname === "/") return "Homepage";
  if (pathname === "/directory") return "Directory";
  if (pathname === "/reading-club") return "Reading Club";
  if (pathname.includes("/dashboard/book/")) return "My Books Hub";
  if (pathname === "/dashboard" || pathname === "/my-books") return "Dashboard";
  if (pathname === "/admin") return "Admin Panel";
  return "Other";
}

export default function AbbyHelpChatbot() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(() => sessionStorage.getItem(OPENED_KEY) === "true");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) { return []; }
  });
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [mode, setMode] = useState<ConversationMode>("help");
  const MAX_INPUT_LENGTH = 2000;
  const MAX_SESSION_MESSAGES = 50;

  // Bug report state
  const [bugStep, setBugStep] = useState<BugStep>("page");
  const [bugData, setBugData] = useState({ page: "", description: "", screenshotUrl: "", priority: "" });

  // Feedback state
  const [feedbackStep, setFeedbackStep] = useState<FeedbackStep>("type");
  const [feedbackData, setFeedbackData] = useState({ type: "", description: "", importance: "" });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamingRef = useRef("");

  // Save messages to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: Date.now() }]);
  }, []);

  // Listen for external open requests (e.g. from FAQ page buttons)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const requestedMode = detail?.mode || "help";
      setIsOpen(true);
      setHasBeenOpened(true);
      sessionStorage.setItem(OPENED_KEY, "true");
      if (requestedMode === "bug") {
        setMode("bug");
        setBugStep("page");
        setBugData(prev => ({ ...prev, page: detectCurrentPage(location.pathname) }));
        addMessage("assistant", "I'm sorry you're experiencing an issue! Let me help you report it. Which page were you on?");
      } else if (requestedMode === "feedback") {
        setMode("feedback");
        setFeedbackStep("type");
        addMessage("assistant", "I'd love to hear your thoughts! What type of feedback do you have?");
      } else {
        if (messages.length === 0) {
          const greeting = getContextGreeting(user, location.pathname);
          addMessage("assistant", greeting);
        }
      }
    };
    window.addEventListener("abby-open", handler);
    return () => window.removeEventListener("abby-open", handler);
  }, [location.pathname, user, messages.length, addMessage]);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setHasBeenOpened(true);
    sessionStorage.setItem(OPENED_KEY, "true");
    if (messages.length === 0) {
      const greeting = getContextGreeting(user, location.pathname);
      addMessage("assistant", greeting);
    }
  }, [messages.length, user, location.pathname, addMessage]);

  const closeChat = () => setIsOpen(false);

  const startNewConversation = () => {
    setMessages([]);
    setMode("help");
    setBugStep("page");
    setBugData({ page: "", description: "", screenshotUrl: "", priority: "" });
    setFeedbackStep("type");
    setFeedbackData({ type: "", description: "", importance: "" });
    sessionStorage.removeItem(STORAGE_KEY);
    const greeting = getContextGreeting(user, location.pathname);
    addMessage("assistant", greeting);
  };

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  }, []);

  // Stream AI response
  const streamResponse = useCallback(async (userMessages: { role: string; content: string }[]) => {
    if (sessionExpired) return;
    setIsStreaming(true);
    streamingRef.current = "";
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abby-help-chat`;

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        // Use anon key for unauthenticated requests
        headers["apikey"] = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      }

      const resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: userMessages }),
      });

      if (resp.status === 401) {
        setSessionExpired(true);
        addMessage("assistant", "Your session has expired. Please sign in again to continue chatting.");
        setIsStreaming(false);
        return;
      }

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        addMessage("assistant", errData.error || "Sorry, I'm having trouble connecting. Please try again in a moment.");
        setIsStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let firstToken = true;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              streamingRef.current += content;
              const soFar = streamingRef.current;
              setMessages(prev => {
                if (firstToken) {
                  firstToken = false;
                  return [...prev, { role: "assistant", content: soFar, timestamp: Date.now() }];
                }
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: soFar } : m);
                }
                return [...prev, { role: "assistant", content: soFar, timestamp: Date.now() }];
              });
            }
          } catch (error) {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      addMessage("assistant", "Sorry, I'm having trouble connecting. Please try again in a moment.");
    }
    setIsStreaming(false);
  }, [addMessage, getAuthToken, sessionExpired]);

  const sendMessage = useCallback(() => {
    const text = input.trim().slice(0, MAX_INPUT_LENGTH);
    if (!text || isStreaming || sessionExpired) return;

    // Session message cap
    if (messages.length >= MAX_SESSION_MESSAGES) {
      addMessage("assistant", "We've reached the conversation limit. Please start a new conversation to continue.");
      return;
    }

    setInput("");
    addMessage("user", text);

    // Detect mode switches
    const lower = text.toLowerCase();
    if (mode === "help" && (lower.includes("bug") || lower.includes("broken") || lower.includes("not working") || lower.includes("issue"))) {
      setMode("bug");
      setBugStep("page");
      setBugData(prev => ({ ...prev, page: detectCurrentPage(location.pathname) }));
      addMessage("assistant", "I'm sorry you're experiencing an issue! Let me help you report it. Which page were you on? (I've auto-selected your current page below)");
      return;
    }
    if (mode === "help" && (lower.includes("feedback") || lower.includes("suggest") || lower.includes("wish") || lower.includes("feature"))) {
      setMode("feedback");
      setFeedbackStep("type");
      addMessage("assistant", "I'd love to hear your thoughts! What type of feedback do you have?");
      return;
    }

    // Build context for AI
    const chatHistory = [...messages, { role: "user" as const, content: text }]
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({ role: m.role, content: m.content }));

    streamResponse(chatHistory);
  }, [input, isStreaming, sessionExpired, messages, mode, location.pathname, addMessage, streamResponse]);

  // Submit actions for structured flows
  const submitAction = async (action: string, data: any): Promise<boolean> => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abby-help-chat`;
    try {
      const token = await getAuthToken();
      if (!token) {
        setSessionExpired(true);
        return false;
      }
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, data }),
      });
      if (resp.status === 401) {
        setSessionExpired(true);
        addMessage("assistant", "Your session has expired. Please sign in again.");
        return false;
      }
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        addMessage("assistant", errData.error || "Something went wrong. Please try again.");
        return false;
      }
      return true;
    } catch (error) {
      addMessage("assistant", "Something went wrong. Please try again.");
      return false;
    }
  };

  const submitBugReport = () => {
    addMessage("assistant", "✅ Your bug report has been submitted! Our team will review it within 24 hours. Is there anything else I can help with?");
    submitAction("submit_bug_report", {
      pageUrl: bugData.page,
      description: bugData.description,
      screenshotUrl: bugData.screenshotUrl || null,
      priority: bugData.priority,
    });
    setMode("help");
  };

  const submitFeedback = () => {
    addMessage("assistant", "✅ Thank you for your feedback! It's been shared with the team. Your input helps us build a better platform for all authors. Is there anything else?");
    submitAction("submit_feedback", {
      type: feedbackData.type,
      description: feedbackData.description,
      importance: feedbackData.importance,
    });
    setMode("help");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick action handlers
  const startBugReport = () => {
    setMode("bug");
    setBugStep("page");
    setBugData(prev => ({ ...prev, page: detectCurrentPage(location.pathname) }));
    addMessage("assistant", "I'm sorry you're experiencing an issue! Let me help you report it. Which page were you on?");
  };

  const startFeedback = () => {
    setMode("feedback");
    setFeedbackStep("type");
    addMessage("assistant", "I'd love to hear your thoughts! What type of feedback do you have?");
  };

  // Relative timestamp
  const relativeTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  // No auth gate — chatbot is visible on all pages

  // Hide chatbot when journey onboarding modal is open
  const journeyModalOpen = typeof document !== 'undefined' && !!document.querySelector('[data-journey-onboarding]');

  return (
    <>
      {/* Floating trigger button — hidden inside builder studios or when journey onboarding is open */}
      {!isOpen && !journeyModalOpen && !(location.search.includes("builder=") || ["workbook","course","home-study","training-program","social-media","email-marketing","audiobook","podcast","coaching","group-coaching","memberships","book-sales","special-editions","lead-magnet","big-ticket"].some(s => location.search.includes(`section=${s}`))) && (
        <div className="fixed z-[9999] group" style={{ bottom: isMobile ? 16 : 24, right: isMobile ? 16 : 24 }}>
          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-[#1B2A4A] text-white text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg">
              Need help? Ask Abby
            </div>
          </div>
          {/* Pulse ring */}
          {!hasBeenOpened && (
            <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(212,168,67,0.3)", animationDuration: "5s" }} />
          )}
          <button
            data-abby-trigger
            onClick={(e) => { e.stopPropagation(); openChat(); }}
            className="relative rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            style={{
              width: isMobile ? 48 : 56,
              height: isMobile ? 48 : 56,
              background: "linear-gradient(135deg, #D4A843, #C4922E)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <Sparkles className="text-white" size={isMobile ? 22 : 26} />
          </button>
        </div>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "fixed z-[9999] flex flex-col bg-white overflow-hidden",
            "animate-in slide-in-from-bottom-4 duration-300",
            isMobile
              ? "inset-0 rounded-none"
              : "rounded-2xl"
          )}
          style={isMobile ? {} : {
            bottom: 24, right: 24, width: 380, height: 520,
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 shrink-0" style={{ height: 56, background: "#1B2A4A" }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #D4A843, #C4922E)" }}>
                <Sparkles className="text-white" size={14} />
              </div>
              <span className="text-white text-sm font-semibold">Abby — Help & Support</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={startNewConversation} className="p-1.5 hover:bg-white/10 rounded text-white" title="New conversation">
                <RotateCcw size={16} />
              </button>
              {!isMobile && (
                <button onClick={closeChat} className="p-1.5 hover:bg-white/10 rounded text-white" title="Minimize">
                  <ChevronDown size={18} />
                </button>
              )}
              <button onClick={closeChat} className="p-1.5 hover:bg-white/10 rounded text-white" title="Close">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 px-3 py-2.5 border-b border-[#E5E7EB] shrink-0 bg-white">
            <button onClick={() => { setMode("help"); addMessage("assistant", "What would you like help with?"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[#1B2A4A] text-[#1B2A4A] hover:bg-[#1B2A4A]/5 transition-colors">
              <HelpCircle size={14} /> How do I...?
            </button>
            <button onClick={startBugReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors">
              <Bug size={14} /> Report a Bug
            </button>
            <button onClick={startFeedback}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[#D4A843] text-[#D4A843] hover:bg-[#D4A843]/5 transition-colors">
              <MessageSquare size={14} /> Feedback
            </button>
          </div>

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ background: "#F9FAFB" }}>
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (i === 0 || messages[i - 1]?.role === "user") && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5"
                    style={{ background: "linear-gradient(135deg, #D4A843, #C4922E)" }}>
                    <Sparkles className="text-white" size={12} />
                  </div>
                )}
                {msg.role === "assistant" && i > 0 && messages[i - 1]?.role === "assistant" && (
                  <div className="w-6 mr-2 shrink-0" />
                )}
                <div className={cn(
                  "rounded-xl px-3 py-2 text-sm max-w-[85%]",
                  msg.role === "user"
                    ? "text-white"
                    : "bg-white border border-[#E5E7EB]"
                )} style={msg.role === "user" ? { background: "#D4A843" } : {}}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none [&>p]:mb-1 [&>ul]:mb-1 [&>ol]:mb-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isStreaming && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, #D4A843, #C4922E)" }}>
                  <Sparkles className="text-white" size={12} />
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {/* Structured flow UI */}
            {mode === "bug" && (
              <BugReportFlow
                step={bugStep}
                data={bugData}
                currentPage={detectCurrentPage(location.pathname)}
                onUpdate={(field, value) => setBugData(prev => ({ ...prev, [field]: value }))}
                onNext={(nextStep) => {
                  if (nextStep === "description") {
                    addMessage("assistant", "Got it. Can you describe what happened? What did you expect to see vs. what actually happened?");
                  } else if (nextStep === "screenshot") {
                    addMessage("assistant", "Would you like to attach a screenshot? It really helps our team fix things faster.");
                  } else if (nextStep === "priority") {
                    addMessage("assistant", "How urgent is this?");
                  } else if (nextStep === "confirm") {
                    addMessage("assistant", `Here's your bug report summary:\n\n**Page:** ${bugData.page}\n**Description:** ${bugData.description.slice(0, 200)}${bugData.description.length > 200 ? "..." : ""}\n**Priority:** ${bugData.priority}\n\nReady to submit?`);
                  }
                  setBugStep(nextStep);
                }}
                onSubmit={submitBugReport}
              />
            )}

            {mode === "feedback" && (
              <FeedbackFlow
                step={feedbackStep}
                data={feedbackData}
                onUpdate={(field, value) => setFeedbackData(prev => ({ ...prev, [field]: value }))}
                onNext={(nextStep) => {
                  if (nextStep === "description") {
                    addMessage("assistant", "Tell me more! What would you like to see?");
                  } else if (nextStep === "importance") {
                    addMessage("assistant", "How important is this to you?");
                  } else if (nextStep === "confirm") {
                    addMessage("assistant", `Here's your feedback summary:\n\n**Type:** ${feedbackData.type}\n**Description:** ${feedbackData.description.slice(0, 200)}${feedbackData.description.length > 200 ? "..." : ""}\n**Importance:** ${feedbackData.importance}\n\nReady to submit?`);
                  }
                  setFeedbackStep(nextStep);
                }}
                onSubmit={submitFeedback}
              />
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="flex items-end gap-2 px-3 py-2.5 border-t border-[#E5E7EB] bg-white shrink-0">
            {sessionExpired ? (
              <p className="text-sm text-destructive py-2 text-center w-full">Your session has expired. Please sign in again.</p>
            ) : messages.length >= MAX_SESSION_MESSAGES ? (
              <p className="text-sm text-muted-foreground py-2 text-center w-full">Conversation limit reached. Start a new conversation.</p>
            ) : (
            <>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
              onKeyDown={handleKeyDown}
              placeholder="Ask Abby anything..."
              maxLength={MAX_INPUT_LENGTH}
              rows={1}
              className="flex-1 resize-none text-sm outline-none placeholder:text-gray-400 max-h-20 min-h-[36px] py-2"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-40"
              style={{ background: input.trim() ? "#D4A843" : "#D1D5DB" }}
            >
              <ArrowUp className="text-white" size={16} />
            </button>
            </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Bug Report structured flow
function BugReportFlow({ step, data, currentPage, onUpdate, onNext, onSubmit }: {
  step: BugStep;
  data: { page: string; description: string; screenshotUrl: string; priority: string };
  currentPage: string;
  onUpdate: (field: string, value: string) => void;
  onNext: (step: BugStep) => void;
  onSubmit: () => void;
}) {
  const [desc, setDesc] = useState("");

  if (step === "page") {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 space-y-2">
        <select
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
          value={data.page || currentPage}
          onChange={e => onUpdate("page", e.target.value)}
        >
          {PAGE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={() => { if (!data.page) onUpdate("page", currentPage); onNext("description"); }}
          className="w-full text-sm font-medium py-2 rounded-lg text-white" style={{ background: "#D4A843" }}>
          Continue
        </button>
      </div>
    );
  }

  if (step === "description") {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 space-y-2">
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Describe what happened..."
          rows={4}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none"
        />
        <button onClick={() => { onUpdate("description", desc); onNext("priority"); }}
          disabled={!desc.trim()}
          className="w-full text-sm font-medium py-2 rounded-lg text-white disabled:opacity-40" style={{ background: "#D4A843" }}>
          Continue
        </button>
      </div>
    );
  }

  if (step === "priority") {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 space-y-2">
        {[
          { value: "critical", label: "Blocking me — I can't use the platform", color: "#DC2626" },
          { value: "medium", label: "Annoying but I can work around it", color: "#F59E0B" },
          { value: "low", label: "Minor issue — just noticed it", color: "#9CA3AF" },
        ].map(opt => (
          <button key={opt.value} onClick={() => { onUpdate("priority", opt.value); onNext("confirm"); }}
            className="w-full text-left text-sm px-3 py-2.5 rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: opt.color }}>
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 space-y-2">
        <button onClick={onSubmit}
          className="w-full text-sm font-medium py-2 rounded-lg text-white" style={{ background: "#D4A843" }}>
          Submit Bug Report
        </button>
        <button onClick={() => onNext("page")}
          className="w-full text-sm font-medium py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
          Edit
        </button>
      </div>
    );
  }

  return null;
}

// Feedback structured flow
function FeedbackFlow({ step, data, onUpdate, onNext, onSubmit }: {
  step: FeedbackStep;
  data: { type: string; description: string; importance: string };
  onUpdate: (field: string, value: string) => void;
  onNext: (step: FeedbackStep) => void;
  onSubmit: () => void;
}) {
  const [desc, setDesc] = useState("");

  if (step === "type") {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 space-y-2">
        {[
          { value: "feature_request", label: "Feature Request — something new I'd like", color: "#3B82F6" },
          { value: "improvement", label: "Improvement — something existing could be better", color: "#10B981" },
          { value: "general", label: "General Feedback — compliment, suggestion, or other", color: "#D4A843" },
        ].map(opt => (
          <button key={opt.value} onClick={() => { onUpdate("type", opt.value); onNext("description"); }}
            className="w-full text-left text-sm px-3 py-2.5 rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: opt.color }}>
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (step === "description") {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 space-y-2">
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Tell me more..."
          rows={4}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none"
        />
        <button onClick={() => { onUpdate("description", desc); onNext("importance"); }}
          disabled={!desc.trim()}
          className="w-full text-sm font-medium py-2 rounded-lg text-white disabled:opacity-40" style={{ background: "#D4A843" }}>
          Continue
        </button>
      </div>
    );
  }

  if (step === "importance") {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 space-y-2">
        {[
          { value: "must_have", label: "Must-have — critical for my workflow" },
          { value: "nice_to_have", label: "Nice-to-have — would improve my experience" },
          { value: "just_a_thought", label: "Just a thought — take it or leave it" },
        ].map(opt => (
          <button key={opt.value} onClick={() => { onUpdate("importance", opt.value); onNext("confirm"); }}
            className="w-full text-left text-sm px-3 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 space-y-2">
        <button onClick={onSubmit}
          className="w-full text-sm font-medium py-2 rounded-lg text-white" style={{ background: "#D4A843" }}>
          Submit Feedback
        </button>
        <button onClick={() => onNext("type")}
          className="w-full text-sm font-medium py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
          Edit
        </button>
      </div>
    );
  }

  return null;
}
