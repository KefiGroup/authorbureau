import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

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
    <div className="relative mx-auto w-full max-w-xl">
      <div
        className="absolute -inset-8 rounded-[2.5rem] bg-secondary/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative overflow-hidden rounded-2xl border-2 border-secondary/50 bg-primary shadow-[var(--shadow-gold)]">
        <video
          ref={videoRef}
          className="aspect-video h-full w-full"
          src="/video/authors-bureau-demo.mp4"
          poster="/video/authors-bureau-demo-poster.webp"
          autoPlay
          muted
          loop
          playsInline
        />
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute demo video" : "Mute demo video"}
          className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full border border-secondary/50 bg-primary/80 text-secondary backdrop-blur transition-colors hover:bg-secondary hover:text-secondary-foreground"
        >
          {muted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
      </div>
      <p className="mt-3 text-center text-sm text-primary-foreground/60">
        See how Abby turns one book into 28 revenue streams — in 45 seconds.
      </p>
    </div>
  );
}
