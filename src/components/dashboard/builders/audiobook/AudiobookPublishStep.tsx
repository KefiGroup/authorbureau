import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipBack, SkipForward, Download, ExternalLink, Headphones, Clock, BarChart3, BookOpen, Rocket, CheckCircle2, Loader2, Globe } from "lucide-react";
import type { AudiobookStepProps, AudioChapter } from "./types";
import { toast } from "sonner";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";

interface PublishResult {
  success: boolean;
  audiobookId?: string;
  chapterCount?: number;
  channels?: Array<{ channel: string; name: string; submission_url: string }>;
  zipUrl?: string;
  micrositeUrl?: string | null;
  publicAuthorPageUrl?: string | null;
}

export default function AudiobookPublishStep({ stepData, bookTitle, bookId }: AudiobookStepProps) {
  const chapters: AudioChapter[] = stepData.chapters || [];
  const setup = stepData.setup || {};
  const [playing, setPlaying] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [packaging, setPackaging] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);

  const totalMinutes = chapters.reduce((sum, ch) => sum + (ch.estimatedMinutes || 5), 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
  const readyChapters = chapters.filter(ch => ch.status === "audio-generated" || ch.status === "reviewed").length;
  const distribution = (setup.distribution || ["platform"]) as string[];
  const channelMap: Record<string, string> = {
    platform: "platform", acx: "acx", "google-play": "google",
    spotify: "spotify", apple: "apple", findaway: "findaway",
  };

  const callPublish = async (mode: "publish" | "package_only") => {
    if (!bookId) { toast.error("Missing book id"); return null; }
    const token = await getActiveToken();
    if (!token) { toast.error("Not authenticated"); return null; }
    const channels = distribution.map((d) => channelMap[d] || d);
    const res = await fetchWithTimeout(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ba11-publish-audiobook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bookId,
          mode,
          narratorCredit: setup.narratorCredit || "",
          previewChapterIndex: 0,
          description: setup.description || "",
          coverImageUrl: setup.coverImageUrl || "",
          retailPriceUsd: Number(setup.price) || 14.99,
          channels,
        }),
      },
      120000,
    );
    let data: PublishResult & { error?: string } = { success: false };
    try { data = await res.json(); } catch { /* non-JSON */ }
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Publish failed (HTTP ${res.status})`);
    }
    return data;
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const data = await callPublish("publish");
      if (data) {
        setResult(data);
        toast.success("Audiobook is live on your author page!");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setPublishing(false);
    }
  };

  const handlePackageOnly = async () => {
    if (result?.zipUrl) { window.open(result.zipUrl, "_blank"); return; }
    setPackaging(true);
    try {
      const data = await callPublish("package_only");
      if (data?.zipUrl) {
        setResult((prev) => ({ ...(prev || { success: true }), zipUrl: data.zipUrl }));
        window.open(data.zipUrl, "_blank");
      } else {
        toast.error("ZIP could not be generated");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setPackaging(false);
    }
  };

  // ============ CONFIRMATION SCREEN (after publish) ============
  if (result?.success && result.publicAuthorPageUrl) {
    const channelLinks: Record<string, { label: string; url: string; quickStart: string[] }> = {
      acx: {
        label: "Submit to Audible / ACX",
        url: "https://www.acx.com/help/narrators/200484550",
        quickStart: [
          "Sign in to ACX and click 'Add Your Title'",
          "Choose Non-Exclusive distribution (25% royalty, multi-platform)",
          "Upload each chapter MP3 (re-encode to 192 kbps mono 44.1 kHz first)",
          "Add a 1–5 min retail sample + opening/closing credits",
        ],
      },
      google: {
        label: "Submit to Google Play Books",
        url: "https://play.google.com/books/publish/",
        quickStart: [
          "Open the Google Play Books Partner Center",
          "Create a new Audiobook listing using the metadata in manifest.json",
          "Upload chapter MP3s in order (chapter-01.mp3 first)",
          "Set retail price; Google takes 48%, you keep 52%",
        ],
      },
      apple: {
        label: "Submit to Apple Books",
        url: "https://authors.apple.com/support/4814-audiobooks",
        quickStart: ["Apple Books for Authors → New audiobook", "Upload MP3s + 3000×3000 cover", "70% royalty"],
      },
      spotify: {
        label: "Submit via Findaway → Spotify",
        url: "https://findaway.com/spotify",
        quickStart: ["Findaway Voices distributes to Spotify", "Upload the package ZIP", "Author-set retail price"],
      },
      findaway: {
        label: "Submit to Findaway Voices (40+ retailers)",
        url: "https://findawayvoices.com/",
        quickStart: ["One upload → Audible, Spotify, Scribd, Hoopla, libraries", "80% royalty", "Author-set price"],
      },
    };
    const selectedChannels = (result.channels || []).filter((c) => c.channel !== "platform");

    return (
      <div className="space-y-6">
        <Card className="p-6 bg-gradient-to-br from-accent/10 to-secondary/5 border-accent/40">
          <div className="flex items-start gap-3 mb-3">
            <div className="text-3xl">🎉</div>
            <div className="flex-1">
              <h2 className="font-heading text-xl font-bold text-foreground mb-1">Audiobook is now live!</h2>
              <p className="text-sm text-muted-foreground">
                <strong>{bookTitle}</strong> · {result.chapterCount} chapters · live on your storefront and ready to submit to external retailers.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button asChild>
              <a href={result.publicAuthorPageUrl} target="_blank" rel="noopener noreferrer">
                <Globe className="h-4 w-4 mr-2" /> View on Your Author Page
              </a>
            </Button>
            {result.zipUrl && (
              <Button variant="outline" asChild>
                <a href={result.zipUrl} target="_blank" rel="noopener noreferrer" download>
                  <Download className="h-4 w-4 mr-2" /> Download Submission ZIP
                </a>
              </Button>
            )}
          </div>
        </Card>

        {selectedChannels.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Submit to External Retailers</h3>
            {selectedChannels.map((c) => {
              const link = channelLinks[c.channel];
              if (!link) return null;
              return (
                <Card key={c.channel} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-sm">{c.name}</h4>
                      <ol className="text-xs text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                        {link.quickStart.map((step, i) => <li key={i}>{step}</li>)}
                      </ol>
                    </div>
                    <Button size="sm" asChild className="shrink-0">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open
                      </a>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="p-4 bg-muted/30">
          <p className="text-xs text-muted-foreground">
            💡 The submission ZIP contains every chapter MP3, a <code>manifest.json</code> with per-channel specs, and a <code>README.txt</code> with re-encode instructions for ACX. A copy of these submission packages has also been emailed to you.
          </p>
        </Card>
      </div>
    );
  }

  // ============ DEFAULT (pre-publish) SCREEN ============
  return (
    <div className="space-y-6">

      <AbbyRecommendationCard>
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Rocket className="h-4 w-4 text-secondary" />
            <span className="text-sm font-semibold text-foreground">Abby's Distribution Strategy</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            Your audiobook is <strong>~{totalHours} hours</strong> across <strong>{chapters.length} chapters</strong>. At <strong>${setup.price || "14.99"}</strong>, audiobooks on this platform earn an average of <strong>$300–$1,200/month</strong> in passive revenue.
          </p>
          {distribution.includes("acx") && (
            <p className="text-sm text-foreground leading-relaxed">
              For <strong>Audible/ACX</strong>: Upload via acx.com. Choose <strong>non-exclusive</strong> distribution to sell on multiple platforms simultaneously. Royalties: 25% non-exclusive, 40% exclusive.
            </p>
          )}
          {distribution.includes("google-play") && (
            <p className="text-sm text-foreground leading-relaxed">
              For <strong>Google Play Books</strong>: Submit via the Google Play Books Partner Center. Google takes 48%, you keep 52%.
            </p>
          )}
          {readyChapters < chapters.length && (
            <p className="text-sm text-amber-700 font-medium">
              ⚠ {chapters.length - readyChapters} chapter{chapters.length - readyChapters > 1 ? "s" : ""} still need audio. Complete them before publishing.
            </p>
          )}
        </div>
      </AbbyRecommendationCard>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <Headphones className="h-5 w-5 text-secondary mx-auto mb-1.5" />
          <p className="text-lg font-bold">{totalHours}h</p>
          <p className="text-[10px] text-muted-foreground">Total Length</p>
        </Card>
        <Card className="p-4 text-center">
          <BookOpen className="h-5 w-5 text-accent mx-auto mb-1.5" />
          <p className="text-lg font-bold">{readyChapters}/{chapters.length}</p>
          <p className="text-[10px] text-muted-foreground">Chapters Ready</p>
        </Card>
        <Card className="p-4 text-center">
          <BarChart3 className="h-5 w-5 text-primary mx-auto mb-1.5" />
          <p className="text-lg font-bold">${setup.price || "14.99"}</p>
          <p className="text-[10px] text-muted-foreground">Price</p>
        </Card>
      </div>

      {/* Distribution checklist */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Distribution Checklist</h3>
        {[
          { label: "All chapters have audio", done: readyChapters === chapters.length },
          { label: "Audio meets quality standards (192kbps / 44.1kHz)", done: readyChapters > 0 },
          { label: "Cover art ready (3000x3000px recommended)", done: false },
          { label: "Metadata & pricing set", done: !!setup.price },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${item.done ? "text-accent" : "text-muted-foreground/30"}`} />
            <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
          </div>
        ))}
      </Card>

      {/* Mini player preview */}
      <Card className="overflow-hidden">
        <div className="p-4 bg-muted/30 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Audiobook Preview</p>
          <h3 className="font-heading text-lg font-bold">{setup.title || bookTitle}</h3>
        </div>

        {/* Player controls */}
        <div className="p-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveChapter(Math.max(0, activeChapter - 1))}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveChapter(Math.min(chapters.length - 1, activeChapter + 1))}>
            <SkipForward className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <p className="text-sm font-medium">{chapters[activeChapter]?.title || "Chapter 1"}</p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> {chapters[activeChapter]?.estimatedMinutes || 5} min
            </p>
          </div>
        </div>

        {/* Chapter list */}
        <div className="border-t border-border max-h-48 overflow-y-auto">
          {chapters.map((ch, idx) => (
            <button
              key={ch.id}
              className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-muted/30 text-xs ${activeChapter === idx ? "bg-secondary/5" : ""}`}
              onClick={() => setActiveChapter(idx)}
            >
              <span className="text-muted-foreground w-5 shrink-0">{idx + 1}</span>
              <span className="flex-1 truncate font-medium">{ch.title}</span>
              <Badge variant={ch.status === "reviewed" || ch.status === "audio-generated" ? "default" : "secondary"} className="text-[8px]">
                {ch.status === "reviewed" ? "✓" : ch.status === "audio-generated" ? "Ready" : "—"}
              </Badge>
            </button>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" disabled={packaging || publishing || readyChapters === 0} onClick={handlePackageOnly}>
          {packaging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Export Audio Files
        </Button>
        <Button disabled={readyChapters === 0 || publishing || packaging} onClick={handlePublish}>
          {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
          {publishing ? "Publishing…" : "Publish & Distribute Audiobook"}
        </Button>
      </div>
      {readyChapters === 0 && (
        <p className="text-xs text-muted-foreground text-center">Generate audio for at least one chapter before publishing.</p>
      )}
    </div>
  );
}
