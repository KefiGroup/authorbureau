import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Headphones, Play, Pause, Download, Sparkles, Volume2, Loader2, CheckCircle2, AlertCircle, Upload, ArrowLeft, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ManuscriptUpload from "@/components/dashboard/ManuscriptUpload";
import { useNavigate } from "react-router-dom";

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
  error?: string;
}

interface Props {
  bookId: string;
  bookTitle: string;
  userId: string;
}

export default function AudiobookStudio({ bookId, bookTitle, userId }: Props) {
  const navigate = useNavigate();
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

  // Load voices
  useEffect(() => {
    async function loadVoices() {
      try {
        const { data, error } = await supabase.functions.invoke("elevenlabs-tts-audiobook", {
          body: { action: "list-voices" },
        });
        if (error) throw error;
        setVoices(data.voices || []);
      } catch (e) {
        console.error("Failed to load voices:", e);
      }
    }
    loadVoices();
  }, []);

  // Auto-load manuscript from generated_assets
  const loadManuscript = useCallback(async () => {
    setLoadingManuscript(true);
    try {
      const { data } = await supabase
        .from("generated_assets")
        .select("content")
        .eq("book_id", bookId)
        .eq("asset_type", "source_material")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.content) {
        setManuscript(data.content);
        setShowUploadFallback(false);
      }
    } catch (e) {
      console.error("No manuscript found:", e);
    }
    setLoadingManuscript(false);
  }, [bookId]);

  useEffect(() => { loadManuscript(); }, [loadManuscript]);

  // Split manuscript into chapters
  const parseChapters = useCallback(() => {
    if (!manuscript.trim()) {
      toast({ title: "No text", description: "Please upload your manuscript first.", variant: "destructive" });
      return;
    }

    const chapterRegex = /(?:^|\n)(chapter\s+\d+[:\s].*|#{1,3}\s+.+)/gi;
    const matches = [...manuscript.matchAll(chapterRegex)];
    let parsed: ChapterAudio[] = [];

    if (matches.length >= 2) {
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
      const { data, error } = await supabase.functions.invoke("elevenlabs-tts-audiobook", {
        body: { action: "preview-voice", voiceKey: selectedVoice },
      });
      if (error) throw error;
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
      idx === i ? { ...ch, status: "done", audioUrl: chunkUrls[0], error: undefined } : ch
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
    const session = (await supabase.auth.getSession()).data.session;
    const authToken = session?.access_token || "";
    try {
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

  const doneCount = chapters.filter(c => c.status === "done").length;
  const progressPercent = chapters.length > 0 ? Math.round((doneCount / chapters.length) * 100) : 0;
  const hasManuscript = manuscript.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with back navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate(`/dashboard/book/${bookId}?tab=automate`)}>
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
                  Upload your manuscript once in the Book Hub Overview — it will automatically flow into all product studios (Audiobook, Workbooks, Social Media, etc.)
                </p>
              </div>
              <Button size="sm" onClick={() => setShowUploadFallback(!showUploadFallback)}>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {showUploadFallback ? "Hide Uploader" : "Upload Manuscript Now"}
              </Button>
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
                      <a href={ch.audioUrl} download={`${ch.title}.mp3`} target="_blank" rel="noopener">
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </a>
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
    </div>
  );
}
