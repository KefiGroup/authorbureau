import { useRef, useState } from "react";
import { Play, Pause, Headphones, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Chapter {
  index: number;
  title?: string;
  audio_url: string;
}

interface Props {
  /** Full chapter list (for the visible track-list). */
  chapters?: Chapter[];
  /** Fallback flat list of chapter URLs if `chapters` is missing. */
  chapterUrls?: string[];
  /** Sample chapter URL — always playable, used for the big "Listen to Sample" button. */
  previewUrl?: string | null;
  /** How many chapters are unlocked for sampling (the rest require purchase). */
  freeChapterCount?: number;
  /** Theme tokens. */
  accent: string;
  cardBg: string;
  cardBorder: string;
  headingText: string;
  bodyText: string;
  mutedText: string;
}

/**
 * Public audiobook microsite preview player.
 * - Anyone can play the first `freeChapterCount` chapters (default 1).
 * - Remaining chapters are visible but locked with a buy prompt.
 */
export default function AudiobookPreviewPlayer({
  chapters,
  chapterUrls,
  previewUrl,
  freeChapterCount = 1,
  accent,
  cardBg,
  cardBorder,
  headingText,
  bodyText,
  mutedText,
}: Props) {
  const list: Chapter[] =
    chapters && chapters.length > 0
      ? chapters
      : (chapterUrls || []).map((url, i) => ({ index: i, audio_url: url, title: `Chapter ${i + 1}` }));

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  if (list.length === 0 && !previewUrl) return null;

  const playChapter = (index: number, url: string) => {
    if (!audioRef.current) return;
    if (activeIndex === index && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    audioRef.current.src = url;
    audioRef.current.play().catch(() => {});
    setActiveIndex(index);
    setIsPlaying(true);
  };

  const samplePreviewUrl = previewUrl || list[0]?.audio_url;

  return (
    <Card className="p-5 space-y-4" style={{ background: cardBg, borderColor: cardBorder }}>
      <div className="flex items-center gap-3">
        <div
          className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `${accent}20`, color: accent }}
        >
          <Headphones className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold" style={{ color: headingText }}>
            Listen to a Free Sample
          </h3>
          <p className="text-xs" style={{ color: mutedText }}>
            {list.length} chapter{list.length === 1 ? "" : "s"} · Sample the first chapter free, buy to unlock the rest.
          </p>
        </div>
        {samplePreviewUrl && (
          <Button
            size="sm"
            className="shrink-0 rounded-full"
            style={{ background: accent, color: "white" }}
            onClick={() => playChapter(0, samplePreviewUrl)}
          >
            {isPlaying && activeIndex === 0 ? (
              <>
                <Pause className="h-3.5 w-3.5 mr-1.5" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 mr-1.5" /> Play sample
              </>
            )}
          </Button>
        )}
      </div>

      {list.length > 0 && (
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {list.map((ch) => {
            const isLocked = ch.index >= freeChapterCount;
            const isActive = activeIndex === ch.index;
            return (
              <button
                key={ch.index}
                disabled={isLocked}
                onClick={() => !isLocked && playChapter(ch.index, ch.audio_url)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                  isLocked ? "opacity-60 cursor-not-allowed" : "hover:bg-black/5"
                }`}
                style={isActive ? { background: `${accent}15` } : undefined}
              >
                <span
                  className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
                  style={{
                    background: isLocked ? "transparent" : isActive ? accent : `${accent}15`,
                    color: isLocked ? mutedText : isActive ? "white" : accent,
                    border: isLocked ? `1px solid ${cardBorder}` : "none",
                  }}
                >
                  {isLocked ? <Lock className="h-3 w-3" /> : isActive && isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </span>
                <span className="flex-1 truncate" style={{ color: bodyText }}>
                  {ch.title || `Chapter ${ch.index + 1}`}
                </span>
                {isLocked && (
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: mutedText }}>
                    Buy to unlock
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        controls
        className="w-full"
        style={{ display: activeIndex >= 0 ? "block" : "none" }}
      />
    </Card>
  );
}
