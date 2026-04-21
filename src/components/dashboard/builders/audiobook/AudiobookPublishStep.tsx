import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipBack, SkipForward, Download, ExternalLink, Headphones, Clock, BarChart3, BookOpen, Rocket, CheckCircle2, Loader2 } from "lucide-react";
import type { AudiobookStepProps, AudioChapter } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { toAbbyError } from "@/lib/abby-error";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";

export default function AudiobookPublishStep({ stepData, bookTitle, bookId }: AudiobookStepProps) {
  const chapters: AudioChapter[] = stepData.chapters || [];
  const setup = stepData.setup || {};
  const [playing, setPlaying] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const totalMinutes = chapters.reduce((sum, ch) => sum + (ch.estimatedMinutes || 5), 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
  const readyChapters = chapters.filter(ch => ch.status === "audio-generated" || ch.status === "reviewed").length;
  const distribution = (setup.distribution || ["platform"]) as string[];

  const handlePublish = async () => {
    if (!bookId) { toast.error("Missing book id"); return; }
    setPublishing(true);
    try {
      const channelMap: Record<string, string> = {
        platform: "platform", acx: "acx", "google-play": "google",
        spotify: "spotify", apple: "apple", findaway: "findaway",
      };
      const channels = distribution.map((d) => channelMap[d] || d);
      const { data, error } = await supabase.functions.invoke("distribute-audiobook", {
        body: {
          bookId,
          narratorCredit: setup.narratorCredit || "",
          previewChapterIndex: 0,
          description: setup.description || "",
          coverImageUrl: setup.coverImageUrl || "",
          retailPriceUsd: Number(setup.price) || 14.99,
          channels,
        },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Distribution failed");
      setPublished(true);
      toast.success("Audiobook published! Check your email for submission packages.");
    } catch (e: any) {
      toast.error(toAbbyError(e?.message || String(e)));
    } finally {
      setPublishing(false);
    }
  };

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
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" /> Export Audio Files
        </Button>
        <Button disabled={readyChapters < chapters.length}>
          <ExternalLink className="h-4 w-4 mr-2" /> Publish Audiobook
        </Button>
      </div>
    </div>
  );
}
