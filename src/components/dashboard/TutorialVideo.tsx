import { useRef, useState } from "react";
import { CirclePlay, Clock3, Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface TutorialVideoProps {
  title: string;
  description: string;
  duration: string;
  src: string;
  poster: string;
  captions: string;
}

export default function TutorialVideo({
  title,
  description,
  duration,
  src,
  poster,
  captions,
}: TutorialVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  const close = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      videoRef.current?.pause();
      setPlaying(false);
    }
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => setPlaying(false));
    else video.pause();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const enterFullscreen = () => videoRef.current?.requestFullscreen?.();

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-secondary/30 bg-card shadow-sm">
        <div className="grid items-stretch md:grid-cols-[minmax(260px,0.72fr)_1fr]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group relative min-h-44 overflow-hidden border-b border-secondary/20 text-left md:border-b-0 md:border-r"
            aria-label={`Play ${title}`}
          >
            <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-primary/35 transition-colors group-hover:bg-primary/25" aria-hidden="true" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-secondary/70 bg-primary/95 text-secondary shadow-lg transition-transform group-hover:scale-105">
                <CirclePlay className="h-8 w-8" />
              </span>
            </span>
          </button>

          <div className="flex flex-col justify-center p-5 sm:p-6">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-secondary">
              <span>Video guide</span>
              <span aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" /> {duration}
              </span>
            </div>
            <h2 className="font-heading text-xl font-bold text-foreground">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
            <Button type="button" onClick={() => setOpen(true)} className="mt-4 w-fit">
              <Play className="mr-2 h-4 w-4 fill-current" /> Watch guide
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-w-5xl overflow-hidden border-secondary/30 bg-primary p-0 text-primary-foreground sm:rounded-lg">
          <div className="sr-only">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
          <div className="relative bg-primary">
            <video
              ref={videoRef}
              className="aspect-video w-full bg-primary"
              poster={poster}
              preload="metadata"
              playsInline
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              controls
            >
              <source src={src} type="video/mp4" />
              <track kind="captions" src={captions} srcLang="en" label="English" default />
              Your browser cannot play this tutorial video.
            </video>

            {!playing && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={togglePlayback}
                aria-label="Play tutorial"
                className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-secondary/70 bg-primary/95 text-secondary hover:bg-secondary hover:text-secondary-foreground"
              >
                <Play className="h-7 w-7 fill-current" />
              </Button>
            )}

            <div className="absolute right-3 top-3 flex gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={togglePlayback}
                aria-label={playing ? "Pause tutorial" : "Play tutorial"}
                className="h-9 w-9 rounded-full border-secondary/60 bg-primary/90 text-secondary hover:bg-secondary hover:text-secondary-foreground"
              >
                {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={toggleMute}
                aria-label={muted ? "Unmute tutorial" : "Mute tutorial"}
                className="h-9 w-9 rounded-full border-secondary/60 bg-primary/90 text-secondary hover:bg-secondary hover:text-secondary-foreground"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={enterFullscreen}
                aria-label="View tutorial fullscreen"
                className="h-9 w-9 rounded-full border-secondary/60 bg-primary/90 text-secondary hover:bg-secondary hover:text-secondary-foreground"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}