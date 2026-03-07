import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import BusinessPlanActions, { isBusinessPlanMessage } from "@/components/dashboard/BusinessPlanActions";
import BuildAuthorBusinessButton from "@/components/dashboard/BuildAuthorBusinessButton";
import SavedBusinessPlan from "@/components/dashboard/SavedBusinessPlan";
import FrameworkInterviewModal, { type BuildMode } from "@/components/dashboard/FrameworkInterviewModal";
import ManuscriptUpload from "@/components/dashboard/ManuscriptUpload";
import type { AuthorFramework } from "@/components/dashboard/FrameworksEditor";
import {
  Rocket, BookOpen, Loader2, Send, ArrowLeft, Sparkles, User, RotateCcw,
  Wrench, MessageCircleHeart, Crown, ExternalLink, FileText, Upload,
  TrendingUp, BarChart3, Hammer, CheckCircle2,
} from "lucide-react";
import { TIERS } from "@/hooks/useAuth";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";

interface Book {
  id: string;
  title: string;
  description: string | null;
  author_name: string | null;
  cover_image_url: string | null;
  genre?: string | null;
  subtitle?: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CONSULTANT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`;
const POPULATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/populate-assets`;
const AI_TOOLS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-author-tools`;

async function getActiveToken(): Promise<string | null> {
  const { data: cloudSession } = await cloudSupabase.auth.getSession();
  if (cloudSession?.session?.access_token) return cloudSession.session.access_token;
  const { data: sharedSession } = await sharedSupabase.auth.getSession();
  return sharedSession?.session?.access_token || null;
}

export default function BuildMyBusiness() {
  const navigate = useNavigate();
  const { user, isPremium, isAdmin, tier } = useAuth();
  const { toast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [analyzedBookIds, setAnalyzedBookIds] = useState<Set<string>>(new Set());
  const [manuscriptBookIds, setManuscriptBookIds] = useState<Set<string>>(new Set());
  const [planSummaries, setPlanSummaries] = useState<Record<string, any>>({});
  const [authorName, setAuthorName] = useState("");

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBuilding, setIsBuilding] = useState<string | null>(null);
  const [pendingBuildReq, setPendingBuildReq] = useState<Record<string, string> | null>(null);
  const [showFrameworkModal, setShowFrameworkModal] = useState(false);
  const [showManuscriptGate, setShowManuscriptGate] = useState(false);
  const [pendingBookSelection, setPendingBookSelection] = useState<Book | null>(null);
  const [abbyReading, setAbbyReading] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [shouldAutoStart, setShouldAutoStart] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch user's books + analysis status
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingBooks(true);
      try {
        const token = await getActiveToken();
        if (!token) { setLoadingBooks(false); return; }
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
          { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );
        const result = await response.json();
        if (response.ok) setBooks(result.books || []);

        // Get author name
        const { data: profile } = await cloudSupabase
          .from("author_profiles")
          .select("pen_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profile?.pen_name) setAuthorName(profile.pen_name);

        // Check analysis and manuscript status
        const fetchedBooks = result.books || [];
        if (fetchedBooks.length > 0) {
          const { data: assets } = await cloudSupabase
            .from("generated_assets")
            .select("book_id, asset_type, content")
            .eq("author_id", user.id)
            .in("asset_type", ["business_plan", "source_material"]);

          const analyzed = new Set<string>();
          const manuscripts = new Set<string>();
          const summaries: Record<string, any> = {};
          (assets || []).forEach((a: any) => {
            if (a.asset_type === "business_plan") {
              analyzed.add(a.book_id);
              try {
                const parsed = JSON.parse(a.content);
                summaries[a.book_id] = parsed;
              } catch {
                summaries[a.book_id] = { products: [] };
              }
            }
            if (a.asset_type === "source_material") manuscripts.add(a.book_id);
          });
          setAnalyzedBookIds(analyzed);
          setManuscriptBookIds(manuscripts);
          setPlanSummaries(summaries);
        }
      } catch (err) {
        console.error("Failed to fetch books:", err);
      }
      setLoadingBooks(false);
    })();
  }, [user]);

  const CONSULTATION_SESSION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consultation-session`;

  const getSessionHeaders = useCallback(async () => {
    const token = await getActiveToken();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    };
  }, []);

  const updateSessionId = (id: string | null) => {
    setSessionId(id);
    sessionIdRef.current = id;
  };

  const saveSession = useCallback(async (msgs: ChatMessage[], bookId?: string) => {
    const targetBookId = bookId || selectedBook?.id;
    if (!user || !targetBookId || msgs.length === 0) return;
    try {
      const headers = await getSessionHeaders();
      const currentSessionId = sessionIdRef.current;
      const resp = await fetch(CONSULTATION_SESSION_URL, {
        method: "POST", headers,
        body: JSON.stringify({ action: "save", book_id: targetBookId, session_id: currentSessionId, messages: msgs }),
      });
      const result = await resp.json();
      if (result.id && !currentSessionId) updateSessionId(result.id);
    } catch (err) {
      console.error("Failed to save session:", err);
    }
  }, [user, selectedBook, getSessionHeaders]);

  const loadExistingSession = useCallback(async (bookId: string): Promise<ChatMessage[] | null> => {
    if (!user) return null;
    try {
      const headers = await getSessionHeaders();
      const resp = await fetch(CONSULTATION_SESSION_URL, {
        method: "POST", headers,
        body: JSON.stringify({ action: "load", book_id: bookId }),
      });
      const result = await resp.json();
      if (result.session) {
        updateSessionId(result.session.id);
        return result.session.messages as ChatMessage[];
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    }
    return null;
  }, [user, getSessionHeaders]);

  useEffect(() => {
    if (!isStreaming && messages.length > 0 && selectedBook) saveSession(messages);
  }, [isStreaming, messages.length, saveSession, selectedBook]);

  const messagesRef = useRef<ChatMessage[]>([]);
  const selectedBookRef = useRef<Book | null>(null);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { selectedBookRef.current = selectedBook; }, [selectedBook]);
  useEffect(() => {
    return () => {
      if (messagesRef.current.length > 0 && selectedBookRef.current) saveSession(messagesRef.current, selectedBookRef.current.id);
    };
  }, [saveSession]);

  const skipLoadRef = useRef(false);
  useEffect(() => {
    if (!selectedBook) return;
    if (skipLoadRef.current) { skipLoadRef.current = false; return; }
    (async () => {
      const existing = await loadExistingSession(selectedBook.id);
      if (existing && existing.length > 0) {
        setMessages(existing);
        setAbbyReading(false);
        toast({ title: "Session restored", description: "Your previous conversation with Abby has been loaded." });
      }
    })();
  }, [selectedBook]);

  useEffect(() => {
    if (shouldAutoStart && selectedBook && !isStreaming && !abbyReading && messages.length === 0) {
      setShouldAutoStart(false);
      sendMessage("I'd like to build a business around my book. Please analyze my book and advise me on the best strategy.", true);
    }
  }, [shouldAutoStart, abbyReading, selectedBook, messages.length, isStreaming]);

  const sendMessage = useCallback(async (content: string, isAutoStart = false) => {
    if (!selectedBook || !content.trim() || isStreaming) return;
    const userMsg: ChatMessage = { role: "user", content: content.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const token = await getActiveToken();
      const resp = await fetch(CONSULTANT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: updatedMessages, bookId: selectedBook.id, isPremium: isPremium || isAdmin, subscriptionTier: tier, subscriptionStatus: isPremium || isAdmin ? "active" : "none" }),
        signal: abort.signal,
      });
      if (!resp.ok || !resp.body) throw new Error(await resp.text() || "Request failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let accumulated = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
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
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              accumulated += delta;
              setMessages(prev => { const copy = [...prev]; copy[copy.length - 1] = { role: "assistant", content: accumulated }; return copy; });
            }
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }

      if (accumulated && isBusinessPlanMessage(accumulated) && selectedBook && user) {
        try {
          const saveToken = await getActiveToken();
          await fetch(CONSULTANT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${saveToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ action: "save-plan", bookId: selectedBook.id, content: accumulated }),
          });
        } catch {}
      }
    } catch (err: any) {
      if (!abort.signal.aborted) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
        setMessages(prev => prev.filter((m, i) => !(i === prev.length - 1 && m.role === "assistant" && !m.content)));
      }
    } finally {
      setIsStreaming(false);
    }
  }, [selectedBook, messages, isStreaming, toast]);

  const parseBuildRequests = (content: string) => {
    const regex = /===BUILD_REQUEST===([\s\S]*?)===END_BUILD_REQUEST===/g;
    const requests: Array<Record<string, string>> = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      const block = match[1];
      const req: Record<string, string> = {};
      block.split("\n").forEach(line => {
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0) { const key = line.slice(0, colonIdx).trim(); const value = line.slice(colonIdx + 1).trim(); if (key && value) req[key] = value; }
      });
      if (req.product_type) requests.push(req);
    }
    return requests;
  };

  const NAV_CONFIG: Record<string, { label: string; icon: string; tab: string }> = {
    build: { label: "B · Build Authority", icon: "🏗️", tab: "revenue-streams" },
    bridge: { label: "B · Bridge Channels", icon: "🌉", tab: "marketing-channels" },
    yield: { label: "Y · Yield Revenue", icon: "💰", tab: "authority-builders" },
    profile: { label: "Author Profile", icon: "👤", tab: "profile" },
  };

  const parseNavMarkers = (content: string): string[] => {
    const regex = /===NAV:(\w+)===/g;
    const markers: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (NAV_CONFIG[match[1]] && !markers.includes(match[1])) markers.push(match[1]);
    }
    return markers;
  };

  const getProductLink = (productType: string): { label: string; path: string } | null => {
    if (!selectedBook) return null;
    if (productType === "workbook") return { label: "Open Workbook Studio", path: `/dashboard?section=workbooks&bookId=${selectedBook.id}` };
    const base = `/dashboard/book/${selectedBook.id}`;
    const map: Record<string, { label: string; tab: string }> = {
      course: { label: "View Course", tab: "automate" },
      social: { label: "View Social Content", tab: "automate" },
      webinar: { label: "View Webinar", tab: "automate" },
      speaker: { label: "View Speaking Profile", tab: "broadcast" },
      email: { label: "View Email Flows", tab: "automate" },
    };
    const entry = map[productType];
    if (!entry) return null;
    return { label: entry.label, path: `${base}?tab=${entry.tab}` };
  };

  const startBuild = (buildReq: Record<string, string>) => {
    if (!selectedBook || !user) return;
    if (!isPremium && !isAdmin) {
      toast({ title: "Premium Required", description: "Subscribe to unlock AI builders.", variant: "destructive" });
      return;
    }
    setPendingBuildReq(buildReq);
    setShowFrameworkModal(true);
  };

  const handleFrameworkConfirm = async (frameworks: AuthorFramework[], buildMode: BuildMode) => {
    setShowFrameworkModal(false);
    if (!pendingBuildReq) return;
    const validFrameworks = frameworks.filter(fw => fw.name.trim());
    if (buildMode === "one-each" && validFrameworks.length > 1) {
      setPendingBuildReq(null);
      for (const fw of validFrameworks) {
        await executeBuild({ ...pendingBuildReq, build_mode: buildMode, content_focus: `Focus exclusively on the "${fw.name}" framework: ${fw.description || ""}` }, [fw]);
      }
    } else {
      executeBuild({ ...pendingBuildReq, build_mode: buildMode }, validFrameworks);
      setPendingBuildReq(null);
    }
  };

  const executeBuild = async (buildReq: Record<string, string>, frameworks: AuthorFramework[] = []) => {
    if (!selectedBook || !user) return;
    const typeMap: Record<string, string> = {
      workbook: "workbook", workbooks: "workbook", course: "course", courses: "course",
      "online-course": "course", "online course": "course", social: "social", "social-media": "social",
      "social media": "social", email: "email", "email-marketing": "email", speaker: "speaker",
      speaking: "speaker", keynote: "speaker", keynotes: "speaker", products: "products",
      webinar: "workbook", webinars: "workbook", coaching: "course", "1-on-1-coaching": "course",
      audiobook: "workbook", "home-study": "workbook",
    };
    const rawType = buildReq.product_type.toLowerCase().trim();
    const toolType = typeMap[rawType];
    if (!toolType) { toast({ title: "Unknown product type", variant: "destructive" }); return; }

    setIsBuilding(toolType);
    toast({ title: "Building started", description: `Generating ${toolType}…` });

    try {
      const token = await getActiveToken();
      const resp = await fetch(AI_TOOLS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          toolType, bookTitle: selectedBook.title, bookDescription: selectedBook.description || "",
          authorName: selectedBook.author_name || "Author",
          additionalContext: buildReq.content_focus || buildReq.special_instructions || "",
          frameworks: frameworks.length > 0 ? frameworks : undefined,
          frameworkName: frameworks.length === 1 ? frameworks[0].name : undefined,
        }),
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
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) accumulated += delta;
          } catch { break; }
        }
      }

      const isOneEach = buildReq.build_mode === "one-each";
      if (isOneEach) {
        await cloudSupabase.from("generated_assets" as any).insert({
          book_id: selectedBook.id, author_id: user.id, asset_type: toolType, content: accumulated, updated_at: new Date().toISOString(),
        });
      } else {
        await cloudSupabase.from("generated_assets" as any).upsert(
          { book_id: selectedBook.id, author_id: user.id, asset_type: toolType, content: accumulated, updated_at: new Date().toISOString() },
          { onConflict: "book_id,asset_type" }
        );
      }

      try {
        await fetch(POPULATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ assetType: toolType, bookId: selectedBook.id, rawContent: accumulated, appendMode: isOneEach, frameworkName: frameworks.length === 1 ? frameworks[0].name : undefined }),
        });
      } catch {}

      const productLink = getProductLink(toolType);
      const linkText = productLink ? `\n\n👉 [${productLink.label} →](${productLink.path})` : "";
      const frameworkLabel = frameworks.length === 1 ? frameworks[0].name : undefined;
      const builtLabel = frameworkLabel ? `${toolType.charAt(0).toUpperCase() + toolType.slice(1)} for "${frameworkLabel}"` : `${toolType.charAt(0).toUpperCase() + toolType.slice(1)}`;

      toast({ title: "Build complete! ✅", description: `${builtLabel} has been generated and saved.` });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✅ **${builtLabel} has been built successfully!**\n\nThe content has been generated and saved.${linkText}\n\nWould you like me to build the next recommended product?`,
      }]);
    } catch (err: any) {
      toast({ title: "Build failed", description: err.message, variant: "destructive" });
    } finally {
      setIsBuilding(null);
    }
  };

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    try {
      const token = await getActiveToken();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ priceId: TIERS.starter.price_id }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error);
      if (result.url) window.open(result.url, "_blank");
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleReset = async (goBackToBookSelect = false) => {
    if (sessionId) {
      try {
        const headers = await getSessionHeaders();
        await fetch(CONSULTATION_SESSION_URL, { method: "POST", headers, body: JSON.stringify({ action: "reset", session_id: sessionId }) });
      } catch {}
    }
    setMessages([]); updateSessionId(null); setInput(""); setAbbyReading(false); setReadingProgress(0);
    if (goBackToBookSelect) setSelectedBook(null);
    else if (selectedBook) { skipLoadRef.current = true; setShouldAutoStart(true); }
  };

  const handleBookSelect = async (book: Book) => {
    if (!user) return;
    const { data } = await cloudSupabase.from("generated_assets").select("id").eq("book_id", book.id).eq("author_id", user.id).eq("asset_type", "source_material").maybeSingle();
    if (data) startWithReadingAnimation(book);
    else { setPendingBookSelection(book); setShowManuscriptGate(true); }
  };

  const startWithReadingAnimation = (book: Book) => {
    setSelectedBook(book); setAbbyReading(true); setReadingProgress(0);
    const duration = 8000; const interval = 100; let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      setReadingProgress(Math.min((elapsed / duration) * 100, 100));
      if (elapsed >= duration) { clearInterval(timer); setAbbyReading(false); setShouldAutoStart(true); }
    }, interval);
  };

  const handleManuscriptGateSkip = () => {
    setShowManuscriptGate(false);
    if (pendingBookSelection) { setSelectedBook(pendingBookSelection); setPendingBookSelection(null); setShouldAutoStart(true); }
  };

  const handleManuscriptUploaded = () => {
    setShowManuscriptGate(false);
    if (pendingBookSelection) { startWithReadingAnimation(pendingBookSelection); setPendingBookSelection(null); }
  };

  // Computed values
  const analyzedBooks = books.filter(b => analyzedBookIds.has(b.id));
  const unanalyzedBooks = books.filter(b => !analyzedBookIds.has(b.id));
  const totalStreams = Object.values(planSummaries).reduce((sum: number, p: any) => sum + (p?.products?.length || 0), 0);
  const totalBuilt = 0; // TODO: count from generated_assets

  // ─── Book Selection (STATE A & B) ─────────────────────────────
  if (!selectedBook) {
    const hasAnalyzed = analyzedBooks.length > 0;

    return (
      <>
      <div className="max-w-5xl space-y-8">
        {/* STATE A: No books analyzed */}
        {!hasAnalyzed ? (
          <>
            {/* Abby Greeting */}
            <div className="text-center max-w-xl mx-auto pt-4">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <motion.div
                  className="w-20 h-20 rounded-full bg-secondary/10 border-[3px] border-secondary/40 flex items-center justify-center text-3xl"
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  👩‍💼
                </motion.div>
                <motion.div
                  className="absolute -top-1 -right-1 text-lg"
                  animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  ✨
                </motion.div>
              </div>
              <h2 className="font-heading text-2xl font-bold mb-1">
                Hi{authorName ? ` ${authorName}` : ""}!
              </h2>
              <p className="text-sm text-secondary font-semibold mb-2">Your AI Business Consultant</p>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
                I've helped 500+ authors turn their books into thriving businesses. Let me show you what's possible with yours.
              </p>
            </div>

            {/* What You'll Get */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 text-center mb-3">
                What You'll Get (FREE)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
                {[
                  { emoji: "📄", title: "Personalized Business Plan", desc: "Up to 27 revenue streams mapped from your book content" },
                  { emoji: "🏷️", title: "Branded Product Recommendations", desc: "Product names, pricing, and descriptions ready to build", highlight: true },
                  { emoji: "📈", title: "Revenue Projections", desc: "Monthly and yearly estimates based on your genre and audience" },
                ].map((card) => (
                  <Card key={card.title} className={`p-4 text-center ${card.highlight ? "ring-1 ring-secondary/30 bg-secondary/5" : ""}`}>
                    <span className="text-2xl mb-2 block">{card.emoji}</span>
                    {card.highlight && <span className="text-[9px] font-bold uppercase tracking-wider text-secondary mb-1 block">Most Valuable</span>}
                    <h4 className="font-heading font-semibold text-sm mb-1">{card.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                  </Card>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                ⏱️ Takes about 5 minutes · 💬 Interactive chat · 📄 Saved forever
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 max-w-3xl mx-auto">
              <div className="flex-1 border-t border-border" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Select a Book to Begin</span>
              <div className="flex-1 border-t border-border" />
            </div>
          </>
        ) : (
          /* STATE B: Some books analyzed */
          <>
            <div>
              <h2 className="font-heading text-2xl font-bold">Your ABBY Business Plans</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Abby has analyzed {analyzedBooks.length} of your {books.length} book{books.length !== 1 ? "s" : ""}. Here's what she found.
              </p>
            </div>

            {/* Portfolio Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-4 flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-secondary shrink-0" />
                <div>
                  <p className="text-xl font-bold font-heading">{totalStreams}</p>
                  <p className="text-[11px] text-muted-foreground">Revenue Streams Mapped</p>
                </div>
              </Card>
              <Card className="p-4 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-accent shrink-0" />
                <div>
                  <p className="text-xl font-bold font-heading">$4K–$8K/mo</p>
                  <p className="text-[11px] text-muted-foreground">Projected Revenue</p>
                </div>
              </Card>
              <Card className="p-4 flex items-center gap-3">
                <Hammer className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xl font-bold font-heading">{totalBuilt}</p>
                  <p className="text-[11px] text-muted-foreground">Products Built So Far</p>
                </div>
              </Card>
            </div>

            {/* Analyzed Books */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 border-t border-border" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Analyzed Books</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <div className="space-y-3">
                {analyzedBooks.map((book) => {
                  const plan = planSummaries[book.id] || {};
                  const streamCount = plan.products?.length || 0;
                  return (
                    <Card key={book.id} className="p-4 flex gap-4">
                      <div className="w-[100px] h-[140px] rounded-lg overflow-hidden bg-muted shrink-0">
                        {book.cover_image_url ? (
                          <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center"><BookOpen className="h-6 w-6 text-muted-foreground/30" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-semibold text-base truncate">{book.title}</h3>
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[10px] font-semibold shrink-0">
                            <CheckCircle2 className="h-3 w-3" /> Analyzed
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {streamCount} streams mapped · Revenue projected
                        </p>
                        <div className="flex gap-2 flex-wrap pt-1">
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleBookSelect(book)}>
                            View Full Plan
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleBookSelect(book)}>
                            Chat with Abby
                          </Button>
                          <Button size="sm" className="text-xs h-7 bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => navigate(`/dashboard/book/${book.id}?tab=revenue-streams`)}>
                            Start Building →
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Not Yet Analyzed */}
            {unanalyzedBooks.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Not Yet Analyzed</span>
                  <div className="flex-1 border-t border-border" />
                </div>
              </div>
            )}
          </>
        )}

        {/* Book Cards for selection (unanalyzed or all if none analyzed) */}
        {(hasAnalyzed ? unanalyzedBooks : books).length > 0 && (
          <>
            {loadingBooks ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your books…
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(hasAnalyzed ? unanalyzedBooks : books).map((book) => {
                  const hasManuscript = manuscriptBookIds.has(book.id);
                  return (
                    <Card
                      key={book.id}
                      className="overflow-hidden cursor-pointer hover:shadow-[var(--shadow-card-hover)] hover:border-secondary/30 transition-all group"
                      onClick={() => handleBookSelect(book)}
                    >
                      <div className="aspect-[3/2] bg-muted flex items-center justify-center overflow-hidden">
                        {book.cover_image_url ? (
                          <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover" />
                        ) : (
                          <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                        )}
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <h3 className="font-heading font-semibold text-sm line-clamp-1">{book.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 italic">
                          {book.subtitle || book.genre || ""}
                        </p>
                        {hasAnalyzed && (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            ⏳ Not Analyzed
                          </span>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <Button size="sm" className="flex-1 text-xs bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            {hasManuscript ? "Analyze This Book →" : "Upload Manuscript First"}
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic text-center">
                          Abby will read your book and create a custom business plan
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {books.length === 0 && !loadingBooks && (
          <Card className="flex flex-col items-center justify-center py-12 px-8 text-center border-dashed max-w-md mx-auto">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <h3 className="font-heading font-semibold mb-2">No books found</h3>
            <p className="text-sm text-muted-foreground">Add a book in "My Books Hub" first.</p>
          </Card>
        )}
      </div>

      {/* Manuscript Gate Dialog */}
      <Dialog open={showManuscriptGate} onOpenChange={(o) => !o && setShowManuscriptGate(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-lg">👩‍💼</div>
              <div>
                <DialogTitle className="font-heading text-base">Abby needs your manuscript</DialogTitle>
                <DialogDescription className="text-xs">
                  To give you the best strategy for <strong>"{pendingBookSelection?.title}"</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground leading-relaxed">
              <p>"Before we start, I'd love to <strong>read your entire book</strong> so I can give you strategic advice based on your actual content."</p>
              <p className="mt-2 text-xs italic">— Abby, Your AI Business Consultant</p>
            </div>
            {pendingBookSelection && (
              <ManuscriptUpload bookId={pendingBookSelection.id} bookTitle={pendingBookSelection.title} onUploadComplete={handleManuscriptUploaded} onContinue={handleManuscriptUploaded} />
            )}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 border-t border-border" />
            </div>
            <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={handleManuscriptGateSkip}>
              Skip — consult without manuscript (less personalized)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </>
    );
  }

  // ─── Reading Animation ─────────────────────────────
  if (abbyReading) {
    const readingStages = [
      { threshold: 0, text: "Opening your manuscript...", emoji: "📖" },
      { threshold: 15, text: "Reading chapter by chapter...", emoji: "📚" },
      { threshold: 35, text: "Identifying your unique frameworks...", emoji: "🔍" },
      { threshold: 55, text: "Analyzing your methodology...", emoji: "🧠" },
      { threshold: 75, text: "Mapping business opportunities...", emoji: "💡" },
      { threshold: 90, text: "Preparing your strategic brief...", emoji: "✨" },
    ];
    const currentStage = [...readingStages].reverse().find(s => readingProgress >= s.threshold) || readingStages[0];

    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] max-w-lg mx-auto text-center">
        <motion.div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center text-3xl mb-6"
          animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          👩‍💼
        </motion.div>
        <h2 className="font-heading text-xl font-bold mb-2">Abby is reading your book</h2>
        <p className="text-sm text-muted-foreground mb-6">"{selectedBook?.title}"</p>
        <div className="w-full max-w-xs mb-4">
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <motion.div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-secondary to-secondary/70" style={{ width: `${readingProgress}%` }} transition={{ duration: 0.1 }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{Math.round(readingProgress)}%</p>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={currentStage.text} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 text-sm font-medium">
            <span className="text-lg">{currentStage.emoji}</span><span>{currentStage.text}</span>
          </motion.div>
        </AnimatePresence>
        <p className="text-[11px] text-muted-foreground mt-8 max-w-sm">
          Abby reads your entire manuscript to understand your unique theories, frameworks, and methodology.
        </p>
      </div>
    );
  }

  // ─── Chat Interface ─────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl">
      <div className="flex items-center gap-3 pb-4 border-b border-border mb-4 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => handleReset(true)} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 text-lg">👩‍💼</div>
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-sm truncate">Abby — Business Advisor</h2>
            <p className="text-xs text-muted-foreground truncate">Strategy for: {selectedBook.title}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => handleReset(false)} className="text-xs gap-1.5">
          <RotateCcw className="h-3 w-3" /> New Session
        </Button>
      </div>

      {!(isPremium || isAdmin) && (
        <div className="mb-4 flex-shrink-0">
          <Card className="border-secondary/40 bg-gradient-to-r from-secondary/5 via-secondary/10 to-secondary/5 overflow-hidden">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <Crown className="h-4 w-4 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">You're on the Free Plan</p>
                <p className="text-[11px] text-muted-foreground">Abby's consultation is free. Subscribe to unlock AI builders.</p>
              </div>
              <Button size="sm" className="flex-shrink-0 gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full text-xs px-4"
                onClick={handleSubscribe} disabled={checkoutLoading}>
                {checkoutLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Crown className="h-3 w-3" />}
                Subscribe
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {user && (
        <div className="mb-4 flex-shrink-0">
          <SavedBusinessPlan bookId={selectedBook.id} bookTitle={selectedBook.title} authorId={user.id} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
        {messages.filter(m => !(m.role === "user" && messages.indexOf(m) === 0 && messages.length > 1)).length === 0 && !isStreaming && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Starting analysis…
          </div>
        )}

        {messages.map((msg, idx) => {
          if (idx === 0 && msg.role === "user" && msg.content.includes("I'd like to build a business")) return null;
          const buildRequests = msg.role === "assistant" ? parseBuildRequests(msg.content) : [];
          const hasSubscribeCta = msg.role === "assistant" && msg.content.includes("===SUBSCRIBE_CTA===");
          const navMarkers = msg.role === "assistant" ? parseNavMarkers(msg.content) : [];
          const displayContent = msg.content
            .replace(/===BUILD_REQUEST===[\s\S]*?===END_BUILD_REQUEST===/g, "")
            .replace(/===SUBSCRIBE_CTA===/g, "")
            .replace(/===NAV:\w+===/g, "")
            .trim();

          return (
            <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-1 text-sm">👩‍💼</div>
              )}
              <div className={`max-w-[85%] ${msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3"
                : `rounded-2xl rounded-bl-md px-5 py-4 ${displayContent.includes("This is your complete ABBY Business Plan") ? "border-l-4 border-secondary bg-secondary/5" : ""}`
              }`}>
                {msg.role === "assistant" ? <div><MarkdownRenderer content={displayContent} /></div> : <p className="text-sm">{msg.content}</p>}

                {buildRequests.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {buildRequests.map((req, i) => {
                      const canBuild = isPremium || isAdmin;
                      return (
                        <Card key={i} className="border-secondary/30 bg-background">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Wrench className="h-4 w-4 text-secondary" />
                              <span className="font-heading font-semibold text-sm">Ready to Build: {req.product_type?.charAt(0).toUpperCase() + req.product_type?.slice(1)}</span>
                            </div>
                            {req.target_audience && <p className="text-xs text-muted-foreground mb-1">Audience: {req.target_audience}</p>}
                            {req.pricing_strategy && <p className="text-xs text-muted-foreground mb-3">Pricing: {req.pricing_strategy}</p>}
                            {canBuild ? (
                              <Button size="sm" className="w-full gap-2" onClick={() => startBuild(req)} disabled={!!isBuilding}>
                                {isBuilding === req.product_type ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Building…</> : <><Rocket className="h-3.5 w-3.5" />Approve & Build</>}
                              </Button>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5"><Crown className="h-3.5 w-3.5" />Premium required</p>
                                <Button size="sm" className="w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={handleSubscribe} disabled={checkoutLoading}>
                                  {checkoutLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening…</> : <><Crown className="h-3.5 w-3.5" /> Subscribe to Build</>}
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {hasSubscribeCta && !(isPremium || isAdmin) && (
                  <div className="mt-5">
                    <Card className="border-2 border-secondary/40 bg-gradient-to-br from-secondary/5 via-secondary/10 to-accent/10 shadow-lg">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center"><Crown className="h-4 w-4 text-secondary" /></div>
                          <div>
                            <span className="font-heading font-bold text-sm block">🚀 Activate ABBY Premium</span>
                            <span className="text-[11px] text-muted-foreground">Turn this plan into real products</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                          Your business plan is ready. Subscribe to unlock <strong>all 27 AI-powered builders</strong>.
                        </p>
                        <Button className="w-full gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold rounded-full h-10" onClick={handleSubscribe} disabled={checkoutLoading}>
                          {checkoutLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening…</> : <><Crown className="h-4 w-4" /> Subscribe & Start Building →</>}
                        </Button>
                        <p className="text-[10px] text-muted-foreground mt-2 text-center">Cancel anytime • Your plan is saved</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {msg.role === "assistant" && user && !isStreaming && isBusinessPlanMessage(displayContent) && (
                  <BusinessPlanActions content={displayContent} bookId={selectedBook.id} bookTitle={selectedBook.title} authorId={user.id} />
                )}

                {msg.role === "assistant" && !isStreaming && navMarkers.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {navMarkers.map((key) => {
                      const cfg = NAV_CONFIG[key];
                      if (!cfg) return null;
                      return (
                        <Button key={key} size="sm" className="gap-2 rounded-full" variant={key === navMarkers[0] ? "default" : "outline"}
                          onClick={() => {
                            if (key === "profile") navigate("/dashboard?section=profile");
                            else if (selectedBook) navigate(`/dashboard/book/${selectedBook.id}?tab=${cfg.tab}`);
                          }}>
                          <span>{cfg.icon}</span>{cfg.label}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1"><User className="h-4 w-4 text-primary" /></div>
              )}
            </div>
          );
        })}

        {isStreaming && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.content && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 text-sm">👩‍💼</div>
            <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Abby is thinking…</div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="flex-shrink-0 border-t border-border pt-4">
        <div className="flex gap-2 items-end">
          <Textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask about your business strategy…" className="resize-none min-h-[44px] max-h-[120px]" rows={1} disabled={isStreaming} />
          <Button size="icon" onClick={() => sendMessage(input)} disabled={!input.trim() || isStreaming} className="h-[44px] w-[44px] flex-shrink-0">
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">Abby • AI Business Consultant by Authors Bureau</p>
      </div>

      <FrameworkInterviewModal open={showFrameworkModal} onClose={() => { setShowFrameworkModal(false); setPendingBuildReq(null); }}
        onConfirm={handleFrameworkConfirm} productType={pendingBuildReq?.product_type || "product"} bookTitle={selectedBook?.title || ""} bookId={selectedBook?.id} />
    </div>
  );
}
