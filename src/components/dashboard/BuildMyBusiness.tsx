import { useState, useEffect, useCallback, useRef, type ChangeEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import {
  Rocket, BookOpen, Loader2, CheckCircle2, Circle, Play,
  Copy, Download, GraduationCap, FileText, Share2, Mail,
  Mic, Lightbulb, AlertCircle, RotateCcw, Sparkles, Upload,
  RefreshCw, ArrowLeft,
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

const ASSET_TYPES = [
  { id: "workbook", label: "Workbook", icon: FileText, color: "text-blue-600", bgColor: "bg-blue-50" },
  { id: "course", label: "Course Outline", icon: GraduationCap, color: "text-purple-600", bgColor: "bg-purple-50" },
  { id: "social", label: "Social Media Pack", icon: Share2, color: "text-pink-600", bgColor: "bg-pink-50" },
  { id: "email", label: "Email Sequence", icon: Mail, color: "text-emerald-600", bgColor: "bg-emerald-50" },
  { id: "speaker", label: "Speaker Kit", icon: Mic, color: "text-orange-600", bgColor: "bg-orange-50" },
  { id: "products", label: "Digital Products", icon: Lightbulb, color: "text-amber-600", bgColor: "bg-amber-50" },
] as const;

type AssetId = (typeof ASSET_TYPES)[number]["id"];
type AssetStatus = "pending" | "generating" | "done" | "error";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-author-tools`;

async function getActiveToken(): Promise<string | null> {
  const { data: cloudSession } = await cloudSupabase.auth.getSession();
  if (cloudSession?.session?.access_token) return cloudSession.session.access_token;
  const { data: sharedSession } = await sharedSupabase.auth.getSession();
  return sharedSession?.session?.access_token || null;
}

async function streamAsset(
  toolType: string,
  book: Book,
  sourceMaterial: string,
  onDelta: (text: string) => void,
  signal: AbortSignal
): Promise<string> {
  const token = await getActiveToken();
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      toolType,
      bookTitle: book.title,
      bookDescription: book.description || "No description provided.",
      authorName: book.author_name || "Author",
      sourceMaterial: sourceMaterial?.trim() || undefined,
      source_platform: "authorsbureau",
    }),
    signal,
  });

  if (resp.status === 429) throw new Error("Rate limit reached. Retrying in a moment…");
  if (resp.status === 402) throw new Error("AI credits exhausted.");
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
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") break;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) {
          accumulated += content;
          onDelta(accumulated);
        }
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  return accumulated;
}

async function saveAssetToDB(bookId: string, authorId: string, assetType: string, content: string) {
  await cloudSupabase.from("generated_assets" as any).upsert(
    { book_id: bookId, author_id: authorId, asset_type: assetType, content, updated_at: new Date().toISOString() },
    { onConflict: "book_id,asset_type" }
  );
}

async function loadAssetsFromDB(bookId: string): Promise<Record<string, string>> {
  const { data } = await cloudSupabase
    .from("generated_assets" as any)
    .select("asset_type, content")
    .eq("book_id", bookId);
  const map: Record<string, string> = {};
  if (data) {
    for (const row of data as any[]) {
      map[row.asset_type] = row.content;
    }
  }
  return map;
}

export default function BuildMyBusiness() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Pipeline state
  const [isRunning, setIsRunning] = useState(false);
  const [statuses, setStatuses] = useState<Record<AssetId, AssetStatus>>(() => {
    const s: any = {};
    ASSET_TYPES.forEach((a) => (s[a.id] = "pending"));
    return s;
  });
  const [results, setResults] = useState<Record<AssetId, string>>(() => {
    const r: any = {};
    ASSET_TYPES.forEach((a) => (r[a.id] = ""));
    return r;
  });
  const [activeTab, setActiveTab] = useState<AssetId>("workbook");
  const [sourceMaterial, setSourceMaterial] = useState("");
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleSourceFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const supported = ["pdf", "docx"];
    if (!ext || !supported.includes(ext)) {
      toast({ title: "Unsupported file type", description: "Please upload a .pdf or .docx file.", variant: "destructive" });
      event.target.value = "";
      return;
    }

    setIsParsingFile(true);
    try {
      let text = "";
      if (ext === "pdf") {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          pages.push(content.items.map((item: any) => item.str).join(" "));
        }
        text = pages.join("\n\n");
      } else if (ext === "docx") {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      }

      const cappedText = text.slice(0, 120000);
      if (text.length > 120000) {
        toast({ title: "Large file trimmed", description: "We imported the first 120,000 characters." });
      }
      setSourceMaterial(cappedText);
      setSourceFileName(file.name);
    } catch (err: any) {
      console.error("File parsing error:", err);
      toast({ title: "Failed to parse file", description: err.message || "Could not extract text.", variant: "destructive" });
    } finally {
      setIsParsingFile(false);
      event.target.value = "";
    }
  };

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

  // Load saved assets when a book is selected
  useEffect(() => {
    if (!selectedBook) return;
    (async () => {
      setLoadingSaved(true);
      const saved = await loadAssetsFromDB(selectedBook.id);
      const newStatuses: any = {};
      const newResults: any = {};
      ASSET_TYPES.forEach((a) => {
        if (saved[a.id]) {
          newStatuses[a.id] = "done";
          newResults[a.id] = saved[a.id];
        } else {
          newStatuses[a.id] = "pending";
          newResults[a.id] = "";
        }
      });
      setStatuses(newStatuses);
      setResults(newResults);
      // If there are saved results, show the first completed tab
      const firstDone = ASSET_TYPES.find((a) => saved[a.id]);
      if (firstDone) setActiveTab(firstDone.id);
      else setActiveTab("workbook");
      setLoadingSaved(false);
    })();
  }, [selectedBook]);

  const completedCount = Object.values(statuses).filter((s) => s === "done").length;
  const progress = (completedCount / ASSET_TYPES.length) * 100;

  const runPipeline = useCallback(async (regenerateOnly?: AssetId[]) => {
    if (!selectedBook || !user) return;
    setIsRunning(true);
    const abort = new AbortController();
    abortRef.current = abort;

    const assetsToGenerate = regenerateOnly
      ? ASSET_TYPES.filter((a) => regenerateOnly.includes(a.id))
      : ASSET_TYPES;

    if (!regenerateOnly) {
      // Reset all
      const freshStatuses: any = {};
      const freshResults: any = {};
      ASSET_TYPES.forEach((a) => { freshStatuses[a.id] = "pending"; freshResults[a.id] = ""; });
      setStatuses(freshStatuses);
      setResults(freshResults);
      setActiveTab("workbook");
    }

    for (const asset of assetsToGenerate) {
      if (abort.signal.aborted) break;

      setStatuses((prev) => ({ ...prev, [asset.id]: "generating" }));
      setActiveTab(asset.id);

      try {
        const finalText = await streamAsset(
          asset.id, selectedBook, sourceMaterial,
          (text) => setResults((prev) => ({ ...prev, [asset.id]: text })),
          abort.signal
        );
        setResults((prev) => ({ ...prev, [asset.id]: finalText }));
        setStatuses((prev) => ({ ...prev, [asset.id]: "done" }));
        // Save to DB
        await saveAssetToDB(selectedBook.id, user.id, asset.id, finalText);
      } catch (err: any) {
        if (abort.signal.aborted) break;
        setStatuses((prev) => ({ ...prev, [asset.id]: "error" }));
        setResults((prev) => ({ ...prev, [asset.id]: `Error: ${err.message}` }));

        if (err.message.includes("Rate limit")) {
          await new Promise((r) => setTimeout(r, 10000));
          if (abort.signal.aborted) break;
          try {
            setStatuses((prev) => ({ ...prev, [asset.id]: "generating" }));
            const finalText = await streamAsset(
              asset.id, selectedBook, sourceMaterial,
              (text) => setResults((prev) => ({ ...prev, [asset.id]: text })),
              abort.signal
            );
            setResults((prev) => ({ ...prev, [asset.id]: finalText }));
            setStatuses((prev) => ({ ...prev, [asset.id]: "done" }));
            await saveAssetToDB(selectedBook.id, user.id, asset.id, finalText);
          } catch {
            setStatuses((prev) => ({ ...prev, [asset.id]: "error" }));
          }
        }
      }
    }

    setIsRunning(false);
  }, [selectedBook, sourceMaterial, user]);

  const handleStop = () => {
    abortRef.current?.abort();
    setIsRunning(false);
  };

  const handleCopy = (id: AssetId) => {
    navigator.clipboard.writeText(results[id]);
    toast({ title: "Copied to clipboard!" });
  };

  const handleDownload = (id: AssetId) => {
    const label = ASSET_TYPES.find((a) => a.id === id)?.label || id;
    const blob = new Blob([results[id]], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label.toLowerCase().replace(/\s+/g, "-")}-${selectedBook?.title.toLowerCase().replace(/\s+/g, "-") || "book"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    const allContent = ASSET_TYPES.map((a) => {
      return `# ${a.label}\n\n${results[a.id] || "(Not generated)"}\n\n---\n\n`;
    }).join("");
    const blob = new Blob([allContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business-assets-${selectedBook?.title.toLowerCase().replace(/\s+/g, "-") || "book"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Book Selection ─────────────────────────────────
  if (!selectedBook) {
    return (
      <div className="max-w-4xl space-y-8">
        <div className="text-center max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
            <Rocket className="h-8 w-8 text-secondary" />
          </div>
          <h2 className="font-heading text-2xl font-bold mb-2">Build My Author Business</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Select a book to generate <strong>6 complete business assets</strong> — workbook, course outline, social media pack, email sequence, speaker kit, and digital product ideas.
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
              Add a book in "My Books" first, then return here to generate your business assets.
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
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="h-3.5 w-3.5" /> Generate business assets →
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Pipeline / Results ─────────────────────────────
  const hasSavedAssets = completedCount > 0 && !isRunning;
  const allDone = completedCount === ASSET_TYPES.length;
  const nothingGenerated = completedCount === 0 && !isRunning;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            handleStop();
            setSelectedBook(null);
            setSourceMaterial("");
            setSourceFileName(null);
          }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {selectedBook.cover_image_url && (
            <img src={selectedBook.cover_image_url} alt={selectedBook.title} className="h-14 w-10 rounded object-cover border border-border" />
          )}
          <div>
            <h2 className="font-heading text-xl font-bold line-clamp-1">{selectedBook.title}</h2>
            <p className="text-xs text-muted-foreground">
              {loadingSaved ? "Loading saved assets…" :
                isRunning ? `Generating assets… ${completedCount}/${ASSET_TYPES.length}` :
                allDone ? "All 6 assets ready ✓" :
                completedCount > 0 ? `${completedCount}/${ASSET_TYPES.length} assets generated` :
                "Ready to generate"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {allDone && (
            <Button variant="outline" size="sm" onClick={handleDownloadAll}>
              <Download className="h-4 w-4 mr-1.5" /> Download All
            </Button>
          )}
          {isRunning && (
            <Button variant="destructive" size="sm" onClick={handleStop}>Stop</Button>
          )}
        </div>
      </div>

      {/* Manuscript Upload */}
      {nothingGenerated && (
        <Card className="border-dashed">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h3 className="font-heading font-semibold text-base mb-1">Upload Your Manuscript</h3>
                <p className="text-sm text-muted-foreground">
                  Upload your book (.pdf or .docx) so the AI generates content based on your actual chapters, not just the description.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-3">
              <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium transition-colors ${
                isParsingFile ? "text-muted-foreground cursor-wait bg-muted" : "cursor-pointer hover:bg-muted"
              }`}>
                {isParsingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isParsingFile ? "Parsing file…" : "Choose PDF or DOCX"}
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  onChange={handleSourceFileUpload}
                  disabled={isParsingFile}
                />
              </label>

              {sourceFileName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate max-w-[200px]">{sourceFileName}</span>
                  <span className="text-muted-foreground/60">({Math.round(sourceMaterial.length / 1000)}k chars)</span>
                  <button type="button" className="text-destructive hover:underline text-xs ml-2"
                    onClick={() => { setSourceMaterial(""); setSourceFileName(null); }}>
                    Remove
                  </button>
                </div>
              )}
            </div>

            <Button
              onClick={() => runPipeline()}
              disabled={isRunning}
              size="lg"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 w-full sm:w-auto"
            >
              <Play className="h-4 w-4 mr-2" />
              Generate All 6 Assets
            </Button>

            <p className="text-xs text-muted-foreground">
              {sourceMaterial ? "✓ Manuscript loaded — AI will use your actual book content." : "No manuscript uploaded — AI will use the book description only."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Progress bar (while running) */}
      {isRunning && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex flex-wrap gap-3">
            {ASSET_TYPES.map((asset) => {
              const status = statuses[asset.id];
              return (
                <div key={asset.id} className="flex items-center gap-1.5 text-xs">
                  {status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  {status === "generating" && <Loader2 className="h-3.5 w-3.5 animate-spin text-secondary" />}
                  {status === "error" && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                  {status === "pending" && <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />}
                  <span className={status === "done" ? "text-foreground font-medium" : "text-muted-foreground"}>
                    {asset.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results */}
      {(isRunning || completedCount > 0) && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AssetId)}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {ASSET_TYPES.map((asset) => {
              const status = statuses[asset.id];
              const Icon = asset.icon;
              return (
                <TabsTrigger key={asset.id} value={asset.id} className="gap-1.5 text-xs">
                  {status === "generating" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : status === "done" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Icon className={`h-3.5 w-3.5 ${asset.color}`} />
                  )}
                  {asset.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {ASSET_TYPES.map((asset) => (
            <TabsContent key={asset.id} value={asset.id}>
              <Card className="shadow-sm">
                <CardContent className="p-0">
                  {results[asset.id] && !results[asset.id].startsWith("Error:") ? (
                    <>
                      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                        <h3 className="font-heading font-semibold text-base flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-md ${asset.bgColor} border border-border`}>
                            <asset.icon className={`h-4 w-4 ${asset.color}`} />
                          </div>
                          {asset.label}
                          {statuses[asset.id] === "generating" && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </h3>
                        {statuses[asset.id] === "done" && (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleCopy(asset.id)}>
                              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDownload(asset.id)}>
                              <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => runPipeline([asset.id])} disabled={isRunning}>
                              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="px-6 py-6 sm:px-8 sm:py-8">
                        <MarkdownRenderer content={results[asset.id]} />
                      </div>
                    </>
                  ) : statuses[asset.id] === "error" ? (
                    <div className="py-16 text-center space-y-3">
                      <AlertCircle className="h-8 w-8 mx-auto text-destructive/60" />
                      <p className="text-sm text-destructive">{results[asset.id]}</p>
                      <Button variant="outline" size="sm" onClick={() => runPipeline([asset.id])} disabled={isRunning}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                      </Button>
                    </div>
                  ) : statuses[asset.id] === "pending" ? (
                    <div className="py-16 text-center text-muted-foreground text-sm">
                      <Circle className="h-8 w-8 mx-auto mb-3 text-muted-foreground/20" />
                      Waiting to generate…
                    </div>
                  ) : (
                    <div className="py-16 text-center text-muted-foreground text-sm">
                      <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-secondary" />
                      Generating {asset.label}…
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Regenerate All button when assets already exist */}
      {hasSavedAssets && !isRunning && (
        <div className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3 border border-border">
          <p className="text-sm text-muted-foreground">
            Want fresh results? Upload a new manuscript or regenerate.
          </p>
          <div className="flex gap-2">
            <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-xs font-medium cursor-pointer hover:bg-muted transition-colors`}>
              <Upload className="h-3.5 w-3.5" /> Upload manuscript
              <input type="file" accept=".pdf,.docx" className="sr-only" onChange={handleSourceFileUpload} disabled={isParsingFile} />
            </label>
            <Button variant="outline" size="sm" onClick={() => runPipeline()} disabled={isRunning}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Regenerate All
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
