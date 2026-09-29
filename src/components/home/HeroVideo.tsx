import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted) v.play().catch(() => {});
    setMuted(v.muted);
  };

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div
        className="absolute -inset-5 rounded-lg bg-secondary/25 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative rounded-lg border border-secondary bg-background p-3 shadow-[var(--shadow-gold)] sm:p-4">
        <div className="mb-3 flex items-center gap-3 px-1">
          <span className="h-px flex-1 bg-secondary/40" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            45-second demo
          </span>
          <span className="h-px flex-1 bg-secondary/40" aria-hidden="true" />
        </div>
        <div className="relative overflow-hidden rounded-md border border-secondary/70 bg-primary">
          <video
            ref={videoRef}
            className="aspect-video h-full w-full"
            src="/video/authors-bureau-demo.mp4"
            poster="/video/authors-bureau-demo-poster.webp"
            autoPlay
            muted
            loop
            playsInline
            controls
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={toggleMute}
            aria-label={muted ? "Unmute demo video" : "Mute demo video"}
            className="absolute right-3 top-3 h-10 w-10 rounded-full border-secondary/70 bg-primary/90 text-secondary backdrop-blur hover:bg-secondary hover:text-secondary-foreground"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
        <p className="px-2 pt-3 text-center text-sm text-primary">
          See how Abby turns one book into 28 revenue streams in 45 seconds.
        </p>
      </div>
    </div>
  );
}
