/**
 * CarouselPreview
 * Renders the 5-slide Instagram carousel slides for a BP-03 post and lets the
 * author download all 5 slides as branded PNGs (one per slide).
 *
 * Shipping path: client-side canvas only — no server roundtrip — so it works
 * inside both the BP-03 builder review step and the Marketing Hub calendar.
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface CarouselSlide {
  headline: string;
  body: string;
}

export interface CarouselPreviewProps {
  slides: CarouselSlide[];
  bookTitle?: string;
  authorName?: string;
  bookColor?: string | null;
  filenamePrefix?: string;
}

const SIZE = 1080; // Instagram square per slide
const DEFAULT_BRAND = "#0d9488";

function renderSlide(opts: {
  index: number;
  total: number;
  slide: CarouselSlide;
  bookTitle: string;
  authorName: string;
  bookColor: string;
}): string {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  // Background — gradient using book color
  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, opts.bookColor);
  grad.addColorStop(1, "#0f172a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Slide indicator
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 28px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textBaseline = "top";
  ctx.fillText(`${opts.index + 1} / ${opts.total}`, 64, 56);

  // Author name (top right)
  ctx.textAlign = "right";
  ctx.fillText(opts.authorName, SIZE - 64, 56);
  ctx.textAlign = "left";

  // Headline
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 86px Georgia, 'Times New Roman', serif";
  wrapText(ctx, opts.slide.headline, 80, 280, SIZE - 160, 100);

  // Body
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "400 40px system-ui, -apple-system, Segoe UI, Roboto";
  wrapText(ctx, opts.slide.body, 80, 600, SIZE - 160, 56);

  // Footer — book title
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "500 28px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(opts.bookTitle, 80, SIZE - 96);

  return canvas.toDataURL("image/png");
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = (text || "").split(/\s+/);
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}

export default function CarouselPreview({
  slides,
  bookTitle = "your book",
  authorName = "Author",
  bookColor,
  filenamePrefix = "carousel",
}: CarouselPreviewProps) {
  const [downloading, setDownloading] = useState(false);

  const safeSlides = useMemo(
    () => (Array.isArray(slides) ? slides.filter(Boolean).slice(0, 5) : []),
    [slides],
  );

  if (safeSlides.length === 0) return null;

  const brand = bookColor || DEFAULT_BRAND;

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      for (let i = 0; i < safeSlides.length; i++) {
        const dataUrl = renderSlide({
          index: i,
          total: safeSlides.length,
          slide: safeSlides[i],
          bookTitle,
          authorName,
          bookColor: brand,
        });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${filenamePrefix}-slide-${i + 1}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // small gap so the browser doesn't drop downloads
        await new Promise((r) => setTimeout(r, 150));
      }
      toast.success(`Downloaded ${safeSlides.length} carousel slides`);
    } catch (e) {
      toast.error("Couldn't download slides");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground">
          Instagram carousel · {safeSlides.length} slides
        </p>
        <Button size="sm" variant="outline" onClick={handleDownloadAll} disabled={downloading}>
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5 mr-1" />
          )}
          Download all {safeSlides.length}
        </Button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {safeSlides.map((slide, i) => (
          <div
            key={i}
            className="shrink-0 w-44 aspect-square rounded-lg p-3 flex flex-col justify-between text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${brand}, #0f172a)` }}
          >
            <div className="flex items-center justify-between text-[10px] font-medium opacity-90">
              <span>{i + 1} / {safeSlides.length}</span>
              <span className="truncate ml-2">{authorName}</span>
            </div>
            <div className="text-[13px] font-serif font-bold leading-snug line-clamp-3">
              {slide.headline || "—"}
            </div>
            <div className="text-[10px] opacity-90 line-clamp-2">{slide.body || ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
