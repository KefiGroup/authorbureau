import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { TIERS } from "@/hooks/useAuth";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { isBusinessPlanMessage } from "@/components/dashboard/BusinessPlanActions";
import type { AuthorFramework } from "@/components/dashboard/FrameworksEditor";
import type { BuildMode } from "@/components/dashboard/FrameworkInterviewModal";
import type { Book, ChatMessage } from "./build-my-business/types";
import BookSelectionView from "./build-my-business/BookSelectionView";
import ReadingAnimationView from "./build-my-business/ReadingAnimationView";
import ChatView from "./build-my-business/ChatView";

const CONSULTANT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/business-consultant`;
const POPULATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/populate-assets`;
const AI_TOOLS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-author-tools`;
const CONSULTATION_SESSION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consultation-session`;

const BOOTSTRAP_PROMPTS = [
  "start a brand new consultation",
  "i'd like to build a business around my book",
];

const isBootstrapOnlySession = (msgs: ChatMessage[] | null): boolean => {
  if (!msgs || msgs.length !== 1) return false;
  const [only] = msgs;
  if (only.role !== "user") return false;
  const content = only.content.toLowerCase();
  return BOOTSTRAP_PROMPTS.some((prompt) => content.includes(prompt));
};

async function getActiveToken(): Promise<string | null> {
  const { data: cloudSession } = await cloudSupabase.auth.getSession();
  if (cloudSession?.session?.access_token) return cloudSession.session.access_token;
  const { data: sharedSession } = await sharedSupabase.auth.getSession();
  return sharedSession?.session?.access_token || null;
}

export default function BuildMyBusiness({ onNavigate }: { onNavigate?: (section: string) => void }) {
  const { user, isPremium, isAdmin, tier } = useAuth();
  const { toast } = useToast();

  // Book state
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [analyzedBookIds, setAnalyzedBookIds] = useState<Set<string>>(new Set());
  const [manuscriptBookIds, setManuscriptBookIds] = useState<Set<string>>(new Set());
  const [planSummaries, setPlanSummaries] = useState<Record<string, any>>({});
  const [authorName, setAuthorName] = useState("");

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBuildingPlan, setIsBuildingPlan] = useState(false);
  const [isBuilding, setIsBuilding] = useState<string | null>(null);
  const [pendingBuildReq, setPendingBuildReq] = useState<Record<string, string> | null>(null);
  const [showFrameworkModal, setShowFrameworkModal] = useState(false);
  const [showManuscriptGate, setShowManuscriptGate] = useState(false);
  const [pendingBookSelection, setPendingBookSelection] = useState<Book | null>(null);
  const [abbyReading, setAbbyReading] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [shouldAutoStart, setShouldAutoStart] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const selectedBookRef = useRef<Book | null>(null);
  const skipLoadRef = useRef(false);

  // Checkout state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Sync refs
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { selectedBookRef.current = selectedBook; }, [selectedBook]);

  // ─── Fetch books + analysis status ───
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

        const { data: profile } = await cloudSupabase
          .from("author_profiles").select("pen_name").eq("user_id", user.id).maybeSingle();
        if (profile?.pen_name) setAuthorName(profile.pen_name);

        const fetchedBooks = result.books || [];
        if (fetchedBooks.length > 0) {
          const bookIds = fetchedBooks.map((b: Book) => b.id);
          try {
            const statusResp = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-manuscript`,
              { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action: "batch-status", bookIds }) }
            );
            const statusResult = await statusResp.json();
            if (statusResp.ok) {
              setManuscriptBookIds(new Set(statusResult.manuscripts || []));
              setAnalyzedBookIds(new Set(statusResult.analyzed || []));
              setPlanSummaries(statusResult.summaries || {});
            }
          } catch (err) { console.error("Failed to fetch asset status:", err); }
        }
      } catch (err) { console.error("Failed to fetch books:", err); }
      setLoadingBooks(false);
    })();
  }, [user]);

  // ─── Session helpers ───
  const updateSessionId = (id: string | null) => { setSessionId(id); sessionIdRef.current = id; };

  const getSessionHeaders = useCallback(async () => {
    const token = await getActiveToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };
  }, []);

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
    } catch (err) { console.error("Failed to save session:", err); }
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
      if (result.session) { updateSessionId(result.session.id); return result.session.messages as ChatMessage[]; }
    } catch (err) { console.error("Failed to load session:", err); }
    return null;
  }, [user, getSessionHeaders]);

  // Auto-save on stream end
  useEffect(() => {
    if (!isStreaming && messages.length > 0 && selectedBook) saveSession(messages);
  }, [isStreaming, messages.length, saveSession, selectedBook, messages]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (messagesRef.current.length > 0 && selectedBookRef.current) saveSession(messagesRef.current, selectedBookRef.current.id);
    };
  }, [saveSession]);

  // Load existing session when book selected
  useEffect(() => {
    if (!selectedBook) { setSessionLoaded(false); return; }
    if (skipLoadRef.current) { skipLoadRef.current = false; setSessionLoaded(true); return; }
    setSessionLoaded(false);
    (async () => {
      try {
        console.log("[BuildMyBusiness] Loading session for book:", selectedBook.id);
        const existing = await loadExistingSession(selectedBook.id);
        console.log("[BuildMyBusiness] Session load result:", existing?.length ?? "null");
        if (existing && existing.length > 0) {
          if (isBootstrapOnlySession(existing)) {
            console.warn("[BuildMyBusiness] Ignoring bootstrap-only stale session and restarting consultation");
            const staleSessionId = sessionIdRef.current;
            if (staleSessionId) {
              try {
                const headers = await getSessionHeaders();
                await fetch(CONSULTATION_SESSION_URL, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({ action: "reset", session_id: staleSessionId }),
                });
              } catch (resetErr) {
                console.error("[BuildMyBusiness] Failed to reset stale session:", resetErr);
              }
            }
            updateSessionId(null);
            setMessages([]);
            setShouldAutoStart(true);
            setAbbyReading(false);
          } else {
            setMessages(existing);
            setAbbyReading(false);
            setShouldAutoStart(false);
            toast({ title: "Session restored", description: "Your previous conversation with Abby has been loaded." });
          }
        }
      } catch (err) {
        console.error("[BuildMyBusiness] Session load error:", err);
      } finally {
        setSessionLoaded(true);
      }
    })();
  }, [selectedBook, loadExistingSession, toast, getSessionHeaders]);

  // ─── Send message ───
  const sendMessage = useCallback(async (content: string) => {
    if (!selectedBook || !content.trim() || isStreaming) return;
    const userMsg: ChatMessage = { role: "user", content: content.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);

    const lowerContent = content.toLowerCase();
    const lastAssistantMsg = messages.filter(m => m.role === "assistant").pop()?.content?.toLowerCase() || "";
    const isPlanTrigger = (lowerContent.includes("yes") || lowerContent.includes("let's go") || lowerContent.includes("ready") || lowerContent.includes("go ahead") || lowerContent.includes("🚀") || lowerContent.includes("show my revenue headline") || lowerContent.includes("show my foundation") || lowerContent.includes("show build authority") || lowerContent.includes("show yield revenue") || lowerContent.includes("show my monetisation") || lowerContent.includes("show me how to unlock"))
      && (lastAssistantMsg.includes("ready for me to build") || lastAssistantMsg.includes("ready to build") || lastAssistantMsg.includes("business plan") || lastAssistantMsg.includes("===next:"));
    if (isPlanTrigger) setIsBuildingPlan(true);

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
          } catch (error) { textBuffer = line + "\n" + textBuffer; break; }
        }
      }

      const allAssistantContent = [...messages.filter(m => m.role === "assistant").map(m => m.content), accumulated].join("\n\n");
      if (accumulated && isBusinessPlanMessage(allAssistantContent) && selectedBook && user) {
        try {
          const saveToken = await getActiveToken();
          // Save the business plan
          await fetch(CONSULTANT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${saveToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ action: "save-plan", bookId: selectedBook.id, content: allAssistantContent }),
          });
          // Generate unique consultation promo codes (fire-and-forget)
          cloudSupabase.functions.invoke("generate-consultation-promos").catch(err => {
            console.error("Failed to generate consultation promos:", err);
          });
        } catch (error) { console.error(error); }
      }
    } catch (err: unknown) {
      if (!abort.signal.aborted) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast({ title: "Error", description: message, variant: "destructive" });
        setMessages(prev => prev.filter((m, i) => !(i === prev.length - 1 && m.role === "assistant" && !m.content)));
      }
    } finally {
      setIsStreaming(false);
      setIsBuildingPlan(false);
    }
  }, [selectedBook, messages, isStreaming, toast, isAdmin, isPremium, tier, user]);

  // Auto-start consultation
  useEffect(() => {
    console.log("[BuildMyBusiness] Auto-start check:", { shouldAutoStart, sessionLoaded, hasBook: !!selectedBook, isStreaming, abbyReading, msgLen: messages.length });
    if (shouldAutoStart && sessionLoaded && selectedBook && !isStreaming && !abbyReading && messages.length === 0) {
      console.log("[BuildMyBusiness] AUTO-START firing for book:", selectedBook.id);
      setShouldAutoStart(false);
      sendMessage("Start a brand new consultation. Begin with TURN 1 — GREETING & OPPORTUNITY REVEAL exactly as specified in your consultation sequence. Do not skip any turns or assume previous context.");
    }
  }, [shouldAutoStart, sessionLoaded, abbyReading, selectedBook, messages.length, isStreaming, sendMessage]);

  // ─── Build handlers ───
  const getProductLink = (productType: string): { label: string; path: string } | null => {
    if (!selectedBook) return null;
    if (productType === "workbook") return { label: "Open Workbook Studio", path: `/dashboard?section=workbooks&bookId=${selectedBook.id}` };
    const base = `/dashboard/book/${selectedBook.id}`;
    const map: Record<string, { label: string; tab: string }> = {
      course: { label: "View Course", tab: "automate" }, social: { label: "View Social Content", tab: "automate" },
      webinar: { label: "View Webinar", tab: "automate" }, speaker: { label: "View Speaking Profile", tab: "broadcast" },
      email: { label: "View Email Flows", tab: "automate" },
    };
    const entry = map[productType];
    return entry ? { label: entry.label, path: `${base}?tab=${entry.tab}` } : null;
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
          } catch (error) { console.error(error); break; }
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
      } catch (error) { console.error(error); }

      const productLink = getProductLink(toolType);
      const linkText = productLink ? `\n\n👉 [${productLink.label} →](${productLink.path})` : "";
      const frameworkLabel = frameworks.length === 1 ? frameworks[0].name : undefined;
      const builtLabel = frameworkLabel ? `${toolType.charAt(0).toUpperCase() + toolType.slice(1)} for "${frameworkLabel}"` : `${toolType.charAt(0).toUpperCase() + toolType.slice(1)}`;

      toast({ title: "Build complete! ✅", description: `${builtLabel} has been generated and saved.` });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✅ **${builtLabel} has been built successfully!**\n\nThe content has been generated and saved.${linkText}\n\nWould you like me to build the next recommended product?`,
      }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Build failed";
      toast({ title: "Build failed", description: message, variant: "destructive" });
    } finally {
      setIsBuilding(null);
    }
  };

  const handleFrameworkConfirm = async (frameworks: AuthorFramework[], buildMode: BuildMode) => {
    setShowFrameworkModal(false);
    if (!pendingBuildReq) return;
    const validFrameworks = frameworks.filter(fw => fw.name.trim());
    if (buildMode === "one-each" && validFrameworks.length > 1) {
      const req = pendingBuildReq;
      setPendingBuildReq(null);
      for (const fw of validFrameworks) {
        await executeBuild({ ...req, build_mode: buildMode, content_focus: `Focus exclusively on the "${fw.name}" framework: ${fw.description || ""}` }, [fw]);
      }
    } else {
      executeBuild({ ...pendingBuildReq, build_mode: buildMode }, validFrameworks);
      setPendingBuildReq(null);
    }
  };

  // ─── Subscription handlers ───
  const handleSubscribeTier = async (tierKey: "brand" | "build" | "yield", promoCode?: string) => {
    setCheckoutLoading(true);
    try {
      const token = await getActiveToken();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ priceId: TIERS[tierKey].price_id, source_platform: "authorsbureau", ...(promoCode ? { promoCode } : {}) }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error);
      if (result.url) window.open(result.url, "_blank");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Checkout failed";
      toast({ title: "Checkout failed", description: message, variant: "destructive" });
    } finally { setCheckoutLoading(false); }
  };

  const handleSubscribe = () => handleSubscribeTier("brand");

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await cloudSupabase.functions.invoke("customer-portal", { body: { source_platform: "authorsbureau" } });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Portal error";
      toast({ title: "Portal error", description: message, variant: "destructive" });
    }
    setPortalLoading(false);
  };

  // ─── Reset ───
  const handleReset = async (goBackToBookSelect = false) => {
    if (sessionId) {
      try {
        const headers = await getSessionHeaders();
        await fetch(CONSULTATION_SESSION_URL, { method: "POST", headers, body: JSON.stringify({ action: "reset", session_id: sessionId }) });
      } catch (error) { console.error(error); }
    }
    setMessages([]); updateSessionId(null); setInput(""); setAbbyReading(false); setReadingProgress(0);
    if (goBackToBookSelect) setSelectedBook(null);
    else if (selectedBook) { skipLoadRef.current = true; setShouldAutoStart(true); }
  };

  // ─── Book selection handlers ───
  const startWithReadingAnimation = (book: Book) => {
    setSelectedBook(book); setAbbyReading(true); setReadingProgress(0);
    const duration = 8000; const interval = 100; let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      setReadingProgress(Math.min((elapsed / duration) * 100, 100));
      if (elapsed >= duration) { clearInterval(timer); setAbbyReading(false); setShouldAutoStart(true); }
    }, interval);
  };

  const handleBookSelect = async (book: Book, skipAnimation = false) => {
    if (!user) return;
    if (skipAnimation || analyzedBookIds.has(book.id)) {
      setSelectedBook(book); setShouldAutoStart(true); return;
    }
    const { data } = await cloudSupabase.from("generated_assets").select("id").eq("book_id", book.id).eq("author_id", user.id).eq("asset_type", "source_material").maybeSingle();
    if (data) startWithReadingAnimation(book);
    else { setPendingBookSelection(book); setShowManuscriptGate(true); }
  };

  const handleManuscriptGateSkip = () => {
    setShowManuscriptGate(false);
    if (pendingBookSelection) { setSelectedBook(pendingBookSelection); setPendingBookSelection(null); setShouldAutoStart(true); }
  };

  const handleManuscriptUploaded = () => {
    setShowManuscriptGate(false);
    if (pendingBookSelection) { startWithReadingAnimation(pendingBookSelection); setPendingBookSelection(null); }
  };

  // ─── Render ───
  if (!selectedBook) {
    return (
      <BookSelectionView
        books={books} loadingBooks={loadingBooks} analyzedBookIds={analyzedBookIds}
        manuscriptBookIds={manuscriptBookIds} planSummaries={planSummaries} authorName={authorName}
        onBookSelect={handleBookSelect} onManuscriptUploaded={handleManuscriptUploaded}
        onManuscriptGateSkip={handleManuscriptGateSkip} showManuscriptGate={showManuscriptGate}
        setShowManuscriptGate={setShowManuscriptGate} pendingBookSelection={pendingBookSelection}
      />
    );
  }

  if (abbyReading) {
    return <ReadingAnimationView selectedBook={selectedBook} readingProgress={readingProgress} />;
  }

  return (
    <ChatView
      selectedBook={selectedBook} messages={messages} input={input} setInput={setInput}
      isStreaming={isStreaming} isBuildingPlan={isBuildingPlan} isBuilding={isBuilding}
      isPremium={isPremium} isAdmin={isAdmin} tier={tier} userId={user?.id || ""}
      checkoutLoading={checkoutLoading} portalLoading={portalLoading}
      showFrameworkModal={showFrameworkModal} pendingBuildReq={pendingBuildReq}
      onSendMessage={sendMessage} onReset={handleReset} onSubscribe={handleSubscribe}
      onSubscribeTier={handleSubscribeTier} onManageSubscription={handleManageSubscription}
      onStartBuild={startBuild} onFrameworkConfirm={handleFrameworkConfirm}
      onCloseFrameworkModal={() => { setShowFrameworkModal(false); setPendingBuildReq(null); }}
    />
  );
}
