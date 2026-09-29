import { useState } from "react";
import { Link } from "react-router-dom";
import { Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DemoVideoSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="bg-primary py-20" aria-labelledby="demo-video-heading">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="demo-video-heading" className="mb-3 font-heading text-3xl font-bold text-primary-foreground md:text-4xl">
            See Authors Bureau in <span className="text-gradient-gold">45 seconds</span>
          </h2>
          <p className="mb-10 text-lg text-primary-foreground/70">
            From one book to 28 revenue streams, built for you by Abby.
          </p>
        </div>

        <div className="mx-auto max-w-[960px] overflow-hidden rounded-2xl border border-secondary/30 shadow-[var(--shadow-gold)]">
          <div className="relative aspect-video bg-primary">
            {playing ? (
              <video
                className="h-full w-full"
                src="/video/authors-bureau-demo.mp4"
                poster="/video/authors-bureau-demo-poster.webp"
                controls
                autoPlay
                playsInline
                preload="none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="group absolute inset-0 h-full w-full"
                aria-label="Play the Authors Bureau demo video"
              >
                <img
                  src="/video/authors-bureau-demo-poster.webp"
                  alt="Authors Bureau — Your Story is Your LIFE"
                  className="h-full w-full object-cover"
                  loading="lazy"
                  width={1280}
                  height={720}
                />
                <span className="absolute inset-0 flex items-center justify-center bg-primary/30 transition-colors group-hover:bg-primary/10">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-[var(--shadow-gold)] transition-transform group-hover:scale-110">
                    <Play className="ml-1 h-9 w-9 fill-current" />
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-10 text-center">
          <Button asChild size="lg" className="rounded-full bg-secondary px-8 text-base font-semibold text-secondary-foreground hover:bg-secondary/90">
            <Link to="/auth">Start for Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
