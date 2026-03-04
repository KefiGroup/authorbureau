import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import {
  Rocket, BookOpen, Loader2, Send, ArrowLeft, Sparkles, User, RotateCcw,
  Wrench, MessageCircleHeart,
} from "lucide-react";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";

interface Book {
  id: string;
  title: string;
  description: string | null;
  author_name: string | null;
  cover_image_url: string | null;
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBuilding, setIsBuilding] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch user's books
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
      } catch (err) {
        console.error("Failed to fetch books:", err);
      }
      setLoadingBooks(false);
    })();
  }, [user]);

  // When book is selected, auto-start the first consultation message
  useEffect(() => {
    if (selectedBook && messages.length === 0) {
      sendMessage("I'd like to build a business around my book. Please analyze my book and advise me on the best strategy.", true);
    }
  }, [selectedBook]);

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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: updatedMessages,
          bookId: selectedBook.id,
        }),
        signal: abort.signal,
      });

      if (!resp.ok || !resp.body) {
        const errText = await resp.text();
        throw new Error(errText || "Request failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let accumulated = "";

      // Add assistant message placeholder
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
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: accumulated };
                return copy;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (err: any) {
      if (!abort.signal.aborted) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
        // Remove the empty assistant message if it was added
        setMessages(prev => prev.filter((m, i) => !(i === prev.length - 1 && m.role === "assistant" && !m.content)));
      }
    } finally {
      setIsStreaming(false);
    }
  }, [selectedBook, messages, isStreaming, toast]);

  // Parse BUILD_REQUEST blocks from assistant messages
  const parseBuildRequests = (content: string) => {
    const regex = /===BUILD_REQUEST===([\s\S]*?)===END_BUILD_REQUEST===/g;
    const requests: Array<Record<string, string>> = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      const block = match[1];
      const req: Record<string, string> = {};
      block.split("\n").forEach(line => {
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          const value = line.slice(colonIdx + 1).trim();
          if (key && value) req[key] = value;
        }
      });
      if (req.product_type) requests.push(req);
    }
    return requests;
  };

  // Execute a build request
  const executeBuild = async (buildReq: Record<string, string>) => {
    if (!selectedBook || !user) return;

    const toolType = buildReq.product_type;
    const validTypes = ["workbook", "course", "social", "email", "speaker", "products"];
    if (!validTypes.includes(toolType)) {
      toast({ title: "Unknown product type", description: `"${toolType}" is not a recognized build type.`, variant: "destructive" });
      return;
    }

    setIsBuilding(toolType);
    toast({ title: "Building started", description: `Generating ${toolType} for "${selectedBook.title}"…` });

    try {
      const token = await getActiveToken();
      const resp = await fetch(AI_TOOLS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          toolType,
          bookTitle: selectedBook.title,
          bookDescription: selectedBook.description || "No description provided.",
          authorName: selectedBook.author_name || "Author",
          additionalContext: buildReq.content_focus || buildReq.special_instructions || "",
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Generation failed");

      // Stream and collect
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

      // Save to DB
      await cloudSupabase.from("generated_assets" as any).upsert(
        { book_id: selectedBook.id, author_id: user.id, asset_type: toolType, content: accumulated, updated_at: new Date().toISOString() },
        { onConflict: "book_id,asset_type" }
      );

      // Populate domain tables
      try {
        await fetch(POPULATE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ assetType: toolType, bookId: selectedBook.id, rawContent: accumulated }),
        });
      } catch (err) {
        console.error("Populate error:", err);
      }

      toast({ title: "Build complete! ✅", description: `${toolType} has been generated and saved.` });

      // Add confirmation to chat
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✅ **${toolType.charAt(0).toUpperCase() + toolType.slice(1)} has been built successfully!**\n\nThe content has been generated and saved to your library. You can view and edit it in the corresponding section of your dashboard.\n\nWould you like me to build the next recommended product, or would you like to discuss your strategy further?`,
      }]);
    } catch (err: any) {
      toast({ title: "Build failed", description: err.message, variant: "destructive" });
    } finally {
      setIsBuilding(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setSelectedBook(null);
    setInput("");
  };

  // ─── Book Selection ─────────────────────────────────
  if (!selectedBook) {
    return (
      <div className="max-w-4xl space-y-8">
        <div className="text-center max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4 text-2xl">
            👩‍💼
          </div>
          <h2 className="font-heading text-2xl font-bold mb-1">Meet Abby</h2>
          <p className="text-sm text-secondary font-medium mb-2">Your AI Business Consultant</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Hi! I'm Abby, your personal business strategist. Pick a book and I'll walk you through a tailored plan to turn it into a thriving business — one step at a time.
          </p>
        </div>

        {loadingBooks ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your books…
          </div>
        ) : books.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-12 px-8 text-center border-dashed max-w-md mx-auto">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <h3 className="font-heading font-semibold mb-2">No books found</h3>
            <p className="text-sm text-muted-foreground">
              Add a book in "My Books" first, then return here to start your business strategy.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <Card
                key={book.id}
                className="overflow-hidden cursor-pointer hover:shadow-[var(--shadow-card-hover)] hover:border-secondary/30 transition-all group"
                onClick={() => setSelectedBook(book)}
              >
                <div className="aspect-[3/2] bg-muted flex items-center justify-center overflow-hidden">
                  {book.cover_image_url ? (
                    <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover" />
                  ) : (
                    <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-heading font-semibold text-sm line-clamp-1">{book.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {book.description || "No description"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Chat Interface ─────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border mb-4 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 text-lg">
            👩‍💼
          </div>
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-sm truncate">Abby</h2>
            <p className="text-xs text-muted-foreground truncate">Strategy for: {selectedBook.title}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs gap-1.5">
          <RotateCcw className="h-3 w-3" /> New Session
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
        {messages.filter(m => !(m.role === "user" && messages.indexOf(m) === 0 && messages.length > 1)).length === 0 && !isStreaming && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Starting consultation…
          </div>
        )}

        {messages.map((msg, idx) => {
          // Hide the auto-start user message
          if (idx === 0 && msg.role === "user" && msg.content.includes("I'd like to build a business")) return null;

          const buildRequests = msg.role === "assistant" ? parseBuildRequests(msg.content) : [];
          // Clean BUILD_REQUEST blocks from displayed content
          const displayContent = msg.content.replace(/===BUILD_REQUEST===[\s\S]*?===END_BUILD_REQUEST===/g, "").trim();

          return (
            <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-1 text-sm">
                  👩‍💼
                </div>
              )}
              <div className={`max-w-[85%] ${msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3"
                : "bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <MarkdownRenderer content={displayContent} />
                  </div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}

                {/* Build Request Cards */}
                {buildRequests.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {buildRequests.map((req, i) => (
                      <Card key={i} className="border-secondary/30 bg-background">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Wrench className="h-4 w-4 text-secondary" />
                            <span className="font-heading font-semibold text-sm">
                              Ready to Build: {req.product_type?.charAt(0).toUpperCase() + req.product_type?.slice(1)}
                            </span>
                          </div>
                          {req.target_audience && (
                            <p className="text-xs text-muted-foreground mb-1">Audience: {req.target_audience}</p>
                          )}
                          {req.pricing_strategy && (
                            <p className="text-xs text-muted-foreground mb-3">Pricing: {req.pricing_strategy}</p>
                          )}
                          <Button
                            size="sm"
                            className="w-full gap-2"
                            onClick={() => executeBuild(req)}
                            disabled={!!isBuilding}
                          >
                            {isBuilding === req.product_type ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Building…
                              </>
                            ) : (
                              <>
                                <Rocket className="h-3.5 w-3.5" />
                                Approve & Build
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          );
        })}

        {isStreaming && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.content && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 text-sm">
              👩‍💼
            </div>
            <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Abby is thinking…
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border pt-4">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your business strategy…"
            className="resize-none min-h-[44px] max-h-[120px]"
            rows={1}
            disabled={isStreaming}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="h-[44px] w-[44px] flex-shrink-0"
          >
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Abby • AI Business Consultant by AuthorsBureau
        </p>
      </div>
    </div>
  );
}
