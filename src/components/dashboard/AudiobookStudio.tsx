import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Headphones, Play, Pause, Download, Sparkles, Volume2, Loader2, CheckCircle2, AlertCircle, Upload, ArrowLeft, FileText, FolderDown, Send, Lock, PartyPopper, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ManuscriptUpload from "@/components/dashboard/ManuscriptUpload";
import { useNavigate } from "react-router-dom";
import { useAuth, hasTierAccess } from "@/hooks/useAuth";
import DistributeAudiobookModal from "@/components/dashboard/audiobook/DistributeAudiobookModal";

interface Voice {
  key: string;
  name: string;
  voiceId: string;
}

interface ChapterAudio {
  index: number;
  title: string;
  text: string;
  status: "pending" | "generating" | "done" | "error";
  audioUrl?: string;
  audioUrls?: string[];
  error?: string;
}

interface Props {
  bookId: string;
  bookTitle: string;
  userId: string;
}

export default function AudiobookStudio({ bookId, bookTitle, userId }: Props) {
  const navigate = useNavigate();
  const { tier } = useAuth();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("sarah");
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [manuscript, setManuscript] = useState("");
  const [chapters, setChapters] = useState<ChapterAudio[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(-1);
  const [loadingManuscript, setLoadingManuscript] = useState(true);
  const [showUploadFallback, setShowUploadFallback] = useState(false);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const [playingIndex, setPlayingIndex] = useState(-1);
  const [distributionStatus, setDistributionStatus] = useState<"idle" | "distributing" | "distributed">("idle");
  const [showDistributeModal, setShowDistributeModal] = useState(false);

  // Load voices — use shared-backend token pattern so the call works on
  // freshly-restored sessions where supabase.auth.getSession() is still empty.
  useEffect(() => {
    (async () => {
      try {
        const { getActiveToken, fetchWithTimeout } = await import("@/lib/get-active-token");
        let token = await getActiveToken();
        for (let i = 0; i < 8 && !token; i++) {
          await new Promise((r) => setTimeout(r, 300));
          token = await getActiveToken();
        }
        const res = await fetchWithTimeout(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts-audiobook`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ action: "list-voices" }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `list-voices failed (${res.status})`);
        setVoices(data?.voices || []);
      } catch (e) {
        console.error("[AudiobookStudio] Failed to load voices:", e);
      }
    })();
  }, []);

  // Auto-load manuscript via edge function (handles shared-backend auth + service-role read).
  // Resilient to refresh-time auth bootstrap: retries token resolution and falls
  // back to get-manuscript-source if the primary endpoint can't find the asset.
  const loadManuscript = useCallback(async () => {
    setLoadingManuscript(true);
    try {
      const { getActiveToken, fetchWithTimeout } = await import("@/lib/get-active-token");

      // Wait for shared-auth restoration before treating "no token" as failure.
      let token = await getActiveToken();
      for (let i = 0; i < 8 && !token; i++) {
        await new Promise(r => setTimeout(r, 300));
        token = await getActiveToken();
      }
      if (!token) {
        console.warn("[AudiobookStudio] No auth token after retries — keeping prior manuscript state.");
        setLoadingManuscript(false);
        return;
      }

      const tryEndpoint = async (path: string, payload: Record<string, unknown>) => {
        const resp = await fetchWithTimeout(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          },
          25000
        );
        const text = await resp.text();
        let data: any = null;
        try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }
        return { ok: resp.ok, status: resp.status, data };
      };

      // Primary path
      const primary = await tryEndpoint("get-book-manuscript", { book_id: bookId });
      console.log("[AudiobookStudio] get-book-manuscript:", primary.status, primary.data?.code, primary.data?.characterCount);

      let content: string | null =
        (primary.ok && typeof primary.data?.content === "string" && primary.data.content.length > 0)
          ? primary.data.content
          : null;

      // Fallback to legacy endpoint if primary returned no content (proven path).
      if (!content) {
        const fallback = await tryEndpoint("get-manuscript-source", { bookId });
        console.log("[AudiobookStudio] get-manuscript-source fallback:", fallback.status, fallback.data?.success, fallback.data?.error);
        if (fallback.data?.success && typeof fallback.data?.content === "string") {
          content = fallback.data.content;
        }
      }

      if (content) {
        setManuscript(content);
        setShowUploadFallback(false);
      } else {
        console.warn("[AudiobookStudio] No manuscript returned for book:", bookId);
      }
    } catch (e) {
      console.error("[AudiobookStudio] manuscript load error:", e);
    }
    setLoadingManuscript(false);
  }, [bookId]);

  useEffect(() => { loadManuscript(); }, [loadManuscript]);

  // Restore previously parsed chapters & generated audio from storage
  useEffect(() => {
    const storageKey = `audiobook-chapters-${bookId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed: ChapterAudio[] = JSON.parse(saved);
        if (parsed.length > 0) {
          setChapters(parsed);
        }
      } catch (error) { console.error(error); }
    }

    // Also check storage bucket for any previously generated audio files
    (async () => {
      try {
        const { data: files } = await supabase.storage
          .from("audiobook-audio")
          .list(`${userId}/${bookId}`, { limit: 200 });
        if (files && files.length > 0) {
          const audioMap = new Map<number, string>();
          for (const f of files) {
            const match = f.name.match(/chapter-(\d+)/);
            if (match) {
              const idx = parseInt(match[1], 10);
              const { data: urlData } = supabase.storage
                .from("audiobook-audio")
                .getPublicUrl(`${userId}/${bookId}/${f.name}`);
              audioMap.set(idx, urlData.publicUrl);
            }
          }
          if (audioMap.size > 0) {
            setChapters(prev => {
              if (prev.length === 0) return prev;
              return prev.map(ch => {
                const url = audioMap.get(ch.index);
                if (url && ch.status !== "done") {
                  return { ...ch, status: "done" as const, audioUrl: url };
                }
                return ch;
              });
            });
          }
        }
      } catch (e) {
        console.error("Failed to check existing audio files:", e);
      }
    })();
  }, [bookId, userId]);

  // Check if audiobook is already distributed
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("audiobooks")
          .select("status")
          .eq("book_id", bookId)
          .eq("author_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.status === "distributing" || data?.status === "distributed") {
          setDistributionStatus(data.status === "distributed" ? "distributed" : "distributing");
        }
      } catch (error) { console.error(error); }
    })();
  }, [bookId, userId]);

  // Split manuscript into chapters
  const parseChapters = useCallback(() => {
    if (!manuscript.trim()) {
      toast({ title: "No text", description: "Please upload your manuscript first.", variant: "destructive" });
      return;
    }

    // Try multiple heading patterns to detect chapters
    const headingPatterns = [
      /(?:^|\n)(chapter\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)[:\s\-–—].*)/gi,
      /(?:^|\n)(#{1,3}\s+.+)/g,
      /(?:^|\n)(CHAPTER\s+.+)/g,
      /(?:^|\n)(Part\s+(?:\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve)[:\s\-–—].*)/gi,
      /(?:^|\n)(\d+\.\s+[A-Z][^\n]{3,})/g,
    ];

    let matches: RegExpMatchArray[] = [];
    for (const regex of headingPatterns) {
      const found = [...manuscript.matchAll(regex)];
      if (found.length >= 2) {
        matches = found;
        break;
      }
    }

    // If still no matches, try splitting on lines that are short, all-caps or title-case, preceded by blank lines
    if (matches.length < 2) {
      const titleLineRegex = /(?:^|\n\n)([A-Z][A-Z\s\d:'\-–—]{4,80})\n/g;
      const titleMatches = [...manuscript.matchAll(titleLineRegex)];
      if (titleMatches.length >= 2) {
        matches = titleMatches;
      }
    }

    let parsed: ChapterAudio[] = [];

    if (matches.length >= 2) {
      // Sort by position in text to ensure correct order
      matches.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index!;
        const end = i < matches.length - 1 ? matches[i + 1].index! : manuscript.length;
        const chapterText = manuscript.slice(start, end).trim();
        const titleMatch = chapterText.match(/^(.+?)[\n\r]/);
        parsed.push({
          index: i,
          title: titleMatch?.[1]?.replace(/^#+\s*/, "").trim() || `Chapter ${i + 1}`,
          text: chapterText,
          status: "pending",
        });
      }
    } else {
      const words = manuscript.split(/\s+/);
      const chunkSize = 3000;
      let chunkIndex = 0;
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join(" ");
        parsed.push({
          index: chunkIndex,
          title: `Part ${chunkIndex + 1}`,
          text: chunk,
          status: "pending",
        });
        chunkIndex++;
      }
    }

    setChapters(parsed);
    toast({ title: `${parsed.length} chapters detected`, description: "Ready to generate audio." });
  }, [manuscript]);

  // Persist chapters to localStorage whenever they change
  useEffect(() => {
    if (chapters.length > 0) {
      localStorage.setItem(`audiobook-chapters-${bookId}`, JSON.stringify(chapters));
    }
  }, [chapters, bookId]);

  // Preview voice
  const handlePreviewVoice = async () => {
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
      setIsPreviewPlaying(false);
      return;
    }
    setLoadingPreview(true);
    try {
      const { getActiveToken, fetchWithTimeout } = await import("@/lib/get-active-token");
      const token = await getActiveToken();
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts-audiobook`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ action: "preview-voice", voiceKey: selectedVoice }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `preview failed (${res.status})`);
      const audioUrl = `data:audio/mpeg;base64,${data.audioBase64}`;
      const audio = new Audio(audioUrl);
      audio.onended = () => { setIsPreviewPlaying(false); setPreviewAudio(null); };
      audio.play();
      setPreviewAudio(audio);
      setIsPreviewPlaying(true);
    } catch (e) {
      toast({ title: "Preview failed", description: String(e), variant: "destructive" });
    }
    setLoadingPreview(false);
  };

  // Split text into chunks client-side (same logic as server)
  const splitTextIntoChunks = (text: string, maxLen = 4500): string[] => {
    if (text.length <= maxLen) return [text];
    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= maxLen) {
        chunks.push(remaining);
        break;
      }
      let splitAt = remaining.lastIndexOf(". ", maxLen);
      if (splitAt < maxLen * 0.5) splitAt = remaining.lastIndexOf("! ", maxLen);
      if (splitAt < maxLen * 0.5) splitAt = remaining.lastIndexOf("? ", maxLen);
      if (splitAt < maxLen * 0.5) splitAt = remaining.lastIndexOf("\n", maxLen);
      if (splitAt < maxLen * 0.3) splitAt = maxLen;
      else splitAt += 2;
      chunks.push(remaining.slice(0, splitAt).trim());
      remaining = remaining.slice(splitAt).trim();
    }
    return chunks;
  };

  // Generate a single chapter by index
  const generateChapter = async (i: number, authToken: string) => {
    setCurrentChapter(i);
    setChapters(prev => prev.map((ch, idx) => idx === i ? { ...ch, status: "generating", error: undefined } : ch));

    const chunks = splitTextIntoChunks(chapters[i].text);
    const chunkUrls: string[] = [];

    for (let c = 0; c < chunks.length; c++) {
      setChapters(prev => prev.map((ch, idx) =>
        idx === i ? { ...ch, error: `Generating chunk ${c + 1} of ${chunks.length}...` } : ch
      ));

      const previousContext = c > 0 ? chunks[c - 1].slice(-200) : undefined;
      const nextContext = c < chunks.length - 1 ? chunks[c + 1].slice(0, 200) : undefined;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts-audiobook`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            action: "generate-chunk",
            bookId,
            voiceKey: selectedVoice,
            chunkText: chunks[c],
            chapterIndex: i,
            chunkIndex: c,
            previousContext,
            nextContext,
          }),
        }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(err.error || "Generation failed");
      }
      const result = await response.json();
      chunkUrls.push(result.audioUrl);
    }

    setChapters(prev => prev.map((ch, idx) =>
      idx === i ? { ...ch, status: "done", audioUrl: chunkUrls[0], audioUrls: chunkUrls, error: undefined } : ch
    ));
  };

  // Regenerate a single chapter (with $9 confirmation gate)
  const [regenConfirmIndex, setRegenConfirmIndex] = useState<number | null>(null);

  const handleRegenerateSingle = (i: number) => {
    setRegenConfirmIndex(i);
  };

  const confirmRegenerate = async () => {
    if (regenConfirmIndex === null) return;
    const i = regenConfirmIndex;
    setRegenConfirmIndex(null);
    // TODO: Wire Stripe $9 payment here before allowing regeneration
    toast({ title: "Regeneration started", description: `Payment of $9 will be required in production.` });
    await handleGenerateSingle(i);
  };

  // Generate a single chapter
  const handleGenerateSingle = async (i: number) => {
    setIsGenerating(true);
    try {
      const { getActiveToken } = await import("@/lib/get-active-token");
      let authToken = await getActiveToken();
      if (!authToken) {
        await new Promise(r => setTimeout(r, 800));
        authToken = await getActiveToken();
      }
      if (!authToken) throw new Error("Not signed in. Please refresh and sign in again.");

      await generateChapter(i, authToken);
      toast({ title: `${chapters[i].title} generated!` });
    } catch (e: any) {
      setChapters(prev => prev.map((ch, idx) => idx === i ? { ...ch, status: "error", error: e.message } : ch));
      toast({ title: `${chapters[i].title} failed`, description: e.message, variant: "destructive" });
    }
    setIsGenerating(false);
    setCurrentChapter(-1);
  };

  // Play a chapter
  const handlePlayChapter = (index: number) => {
    const ch = chapters[index];
    if (!ch?.audioUrl) return;
    if (playingIndex === index && playerRef.current) {
      playerRef.current.pause();
      setPlayingIndex(-1);
      return;
    }
    if (playerRef.current) playerRef.current.pause();
    const audio = new Audio(ch.audioUrl);
    audio.onended = () => setPlayingIndex(-1);
    audio.play();
    playerRef.current = audio;
    setPlayingIndex(index);
  };

  // Programmatic download helper
  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  };

  const handleDownloadChapter = async (ch: ChapterAudio) => {
    const urls = ch.audioUrls || (ch.audioUrl ? [ch.audioUrl] : []);
    for (let i = 0; i < urls.length; i++) {
      const suffix = urls.length > 1 ? `-part${i + 1}` : "";
      const filename = `${bookTitle} - ${ch.title}${suffix}.mp3`;
      await downloadFile(urls[i], filename);
      if (urls.length > 1) await new Promise(r => setTimeout(r, 500)); // stagger downloads
    }
    toast({ title: "Download started", description: `${ch.title} (${urls.length} file${urls.length > 1 ? "s" : ""})` });
  };

  const handleDownloadAll = async () => {
    const doneChapters = chapters.filter(c => c.status === "done");
    if (doneChapters.length === 0) return;
    toast({ title: "Downloading all chapters…", description: `${doneChapters.length} chapters will be downloaded.` });
    for (const ch of doneChapters) {
      await handleDownloadChapter(ch);
      await new Promise(r => setTimeout(r, 800));
    }
  };
  const doneCount = chapters.filter(c => c.status === "done").length;
  const progressPercent = chapters.length > 0 ? Math.round((doneCount / chapters.length) * 100) : 0;
  const hasManuscript = manuscript.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with back navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate(`/book-hub/${bookId}?tab=marketing-channels`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
          <Headphones className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading text-xl font-bold">Audiobook Studio</h2>
          {bookTitle && <p className="text-sm text-muted-foreground truncate">{bookTitle}</p>}
        </div>
      </div>

      {/* Manuscript Status Banner */}
      {loadingManuscript ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading your manuscript…</span>
          </CardContent>
        </Card>
      ) : hasManuscript ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Manuscript auto-loaded</p>
            <p className="text-xs text-muted-foreground">
              {Math.round(manuscript.length / 1000)}k characters · ~{Math.round(manuscript.split(/\s+/).length)} words
            </p>
          </div>
          {chapters.length === 0 && (
            <Button size="sm" variant="secondary" onClick={parseChapters}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Parse Chapters
            </Button>
          )}
        </div>
      ) : (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="py-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">No manuscript found for this book</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  Upload your manuscript once in your Book Hub — it will automatically flow into all product studios (Audiobook, Workbooks, Social Media, etc.). Or upload it here just for the audiobook.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/book/${bookId}?tab=overview`)}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Open Book Hub
                </Button>
                <Button size="sm" onClick={() => setShowUploadFallback(!showUploadFallback)}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {showUploadFallback ? "Hide Uploader" : "Upload Manuscript Here"}
                </Button>
              </div>
            </div>
            {showUploadFallback && (
              <div className="mt-4 pt-4 border-t border-border">
                <ManuscriptUpload
                  bookId={bookId}
                  bookTitle={bookTitle}
                  onUploadComplete={() => {
                    setShowUploadFallback(false);
                    loadManuscript();
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Voice Selection — only show if manuscript is loaded */}
      {hasManuscript && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Choose a Narrator Voice</CardTitle>
            <CardDescription>Select from professional AI voices optimized for long-form narration.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {voices.map(v => (
                  <SelectItem key={v.key} value={v.key}>
                    <span className="flex items-center gap-2">
                      <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {v.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handlePreviewVoice} disabled={loadingPreview}>
              {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> :
                isPreviewPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {isPreviewPlaying ? "Stop" : "Preview"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Chapters & Generation */}
      {chapters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Generate Audiobook</CardTitle>
            <CardDescription>
              Generate audio for each chapter using ElevenLabs. This may take several minutes for long books.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(isGenerating || doneCount > 0) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{doneCount} / {chapters.length} chapters</span>
                  <span>{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {chapters.map((ch, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    ch.status === "generating" ? "border-primary/50 bg-primary/5" :
                    ch.status === "done" ? "border-green-500/30 bg-green-500/5" :
                    ch.status === "error" ? "border-destructive/30 bg-destructive/5" :
                    "border-border"
                  }`}
                >
                  <div className="shrink-0">
                    {ch.status === "generating" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {ch.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                    {ch.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
                    {ch.status === "pending" && <span className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 block" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ch.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ch.text.length.toLocaleString()} chars · ~{Math.round(ch.text.length / 15 / 60)} min
                    </p>
                    {ch.status === "generating" && ch.error && (
                      <p className="text-xs text-primary mt-0.5">{ch.error}</p>
                    )}
                    {ch.status === "error" && ch.error && <p className="text-xs text-destructive mt-0.5">{ch.error}</p>}
                  </div>
                  {ch.status === "done" && ch.audioUrl && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handlePlayChapter(i)}>
                        {playingIndex === i ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDownloadChapter(ch)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      {!isGenerating && (
                        <Button size="sm" variant="outline" className="shrink-0 text-xs text-amber-600 border-amber-500/30" onClick={() => handleRegenerateSingle(i)}>
                          Regenerate ($9)
                        </Button>
                      )}
                    </div>
                  )}
                  {ch.status === "pending" && !isGenerating && (
                    <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => handleGenerateSingle(i)}>
                      <Sparkles className="h-3 w-3 mr-1" />Generate
                    </Button>
                  )}
                  {ch.status === "error" && !isGenerating && (
                    <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => handleGenerateSingle(i)}>
                      <Sparkles className="h-3 w-3 mr-1" />Retry
                    </Button>
                  )}
                  {ch.status === "generating" && (
                    <Badge variant="outline" className="text-xs shrink-0">Generating…</Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Regenerate confirmation dialog */}
            {regenConfirmIndex !== null && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <p className="text-sm font-medium">Re-generate "{chapters[regenConfirmIndex]?.title}"?</p>
                <p className="text-xs text-muted-foreground">
                  Re-generating a chapter costs <span className="font-semibold">$9</span>. This will replace the existing audio.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={confirmRegenerate}>
                    Yes, Regenerate ($9)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRegenConfirmIndex(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Your Audiobook Files — downloadable library */}
      {doneCount > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">3. Your Audiobook Files</CardTitle>
                <CardDescription>{doneCount} chapter{doneCount !== 1 ? "s" : ""} ready to download</CardDescription>
              </div>
              <Button size="sm" onClick={handleDownloadAll} className="gap-1.5">
                <FolderDown className="h-4 w-4" />
                Download All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border rounded-lg border">
              {chapters.filter(c => c.status === "done").map((ch) => {
                const urls = ch.audioUrls || (ch.audioUrl ? [ch.audioUrl] : []);
                return (
                  <div key={ch.index} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Headphones className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{bookTitle} — {ch.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {urls.length} file{urls.length !== 1 ? "s" : ""} · ~{Math.round(ch.text.length / 15 / 60)} min
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handlePlayChapter(ch.index)}>
                        {playingIndex === ch.index ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => handleDownloadChapter(ch)}>
                        <Download className="h-3.5 w-3.5" />
                        {urls.length > 1 ? `Download (${urls.length} parts)` : "Download MP3"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribution CTA — shown when all chapters are done */}
      {doneCount > 0 && doneCount === chapters.length && distributionStatus === "idle" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm font-semibold">All chapters generated! Ready to distribute.</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Package your audiobook and send it to PublishNow for distribution on Audible, Spotify & Apple Books.
                </p>
              </div>
              {hasTierAccess(tier, "yield") ? (
                <Button onClick={() => setShowDistributeModal(true)} className="gap-1.5 shrink-0">
                  <Send className="h-4 w-4" />
                  Save & Distribute Audiobook
                </Button>
              ) : (
                <Button variant="outline" className="gap-1.5 shrink-0 opacity-80" disabled>
                  <Lock className="h-4 w-4" />
                  Enterprise Only
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribution in Progress Banner */}
      {distributionStatus !== "idle" && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="py-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <PartyPopper className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {distributionStatus === "distributing"
                    ? "Your audiobook has been sent to PublishNow!"
                    : "Your audiobook has been distributed!"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  You can track its distribution status in the AI Publishing Studio.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => window.open("https://publishnow.io", "_blank")}
              >
                Go to AI Publishing Studio <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribute Modal */}
      <DistributeAudiobookModal
        open={showDistributeModal}
        onOpenChange={setShowDistributeModal}
        bookId={bookId}
        bookTitle={bookTitle}
        userId={userId}
        chapters={chapters.filter(c => c.status === "done").map(c => ({
          index: c.index,
          title: c.title,
          audioUrl: c.audioUrl,
          audioUrls: c.audioUrls,
        }))}
        onDistributed={() => setDistributionStatus("distributing")}
      />
    </div>
  );
}
