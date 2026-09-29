import { useState } from "react";
import { Link } from "react-router-dom";
import { Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function DemoVideoModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="group border-2 border-secondary/60 bg-transparent text-secondary hover:bg-secondary hover:text-secondary-foreground text-base font-semibold rounded-full px-8"
        >
          <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-transform group-hover:scale-110">
            <Play className="ml-0.5 h-3 w-3 fill-current" />
          </span>
          Watch 45-Sec Demo
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[min(1100px,94vw)] border-secondary/40 bg-primary p-0 shadow-[var(--shadow-gold)]">
        <DialogTitle className="sr-only">Authors Bureau 45 second demo</DialogTitle>
        <div className="p-4 sm:p-6">
          <div className="overflow-hidden rounded-xl border border-secondary/30 bg-primary">
            {open && (
              <video
                className="aspect-video h-full w-full"
                src="/video/authors-bureau-demo.mp4"
                poster="/video/authors-bureau-demo-poster.webp"
                controls
                autoPlay
                playsInline
              />
            )}
          </div>

          <div className="mt-5 flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-primary-foreground/70">
              From one book to 28 revenue streams, built for you by Abby.
            </p>
            <Button
              asChild
              size="lg"
              className="rounded-full bg-secondary px-8 text-base font-semibold text-secondary-foreground hover:bg-secondary/90"
            >
              <Link to="/auth">Start for Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
