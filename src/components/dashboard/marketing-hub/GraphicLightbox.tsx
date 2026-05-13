import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = [string, string]; // [label, url]

interface Props {
  /** All available graphic variants. Use [["Graphic", url]] for single-variant posts. */
  variants: Variant[];
  /** Caption / context line shown in the dialog header. */
  title?: string;
  /** Called when the user clicks "Download this size" in the dialog footer. */
  onDownload?: (url: string, label: string) => void;
  /** Trigger element (thumbnail image, Preview button, etc.). */
  children: React.ReactNode;
}

/**
 * Click-to-zoom lightbox for social-post graphics. Renders the trigger as-is
 * (via DialogTrigger asChild) and shows the full-size image in a dialog with
 * an optional size selector when the post has multiple variants.
 */
export default function GraphicLightbox({ variants, title, onDownload, children }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  if (!variants.length) return <>{children}</>;

  const [activeLabel, activeUrl] = variants[Math.min(activeIdx, variants.length - 1)];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[92vw] sm:max-w-4xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium text-foreground line-clamp-2">
            {title || "Graphic preview"}
          </DialogTitle>
        </DialogHeader>

        {variants.length > 1 && (
          <div className="flex flex-wrap gap-1.5 pb-1">
            {variants.map(([label], i) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveIdx(i)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs border transition",
                  i === activeIdx
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center bg-muted/20 rounded-md overflow-hidden">
          <img
            src={activeUrl}
            alt={activeLabel}
            className="max-h-[75vh] max-w-full w-auto h-auto object-contain"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownload?.(activeUrl, activeLabel.split(" ")[0].toLowerCase())}
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Download {variants.length > 1 ? activeLabel : "graphic"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
