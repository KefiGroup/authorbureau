import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, Loader2 } from "lucide-react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  buildSlides, renderSlide, renderCheatSheet, renderCarouselPdf, renderCarouselPngs,
  type CarouselArgs,
} from "./carouselGraphic";

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "post";

/** Swipe carousel preview + LinkedIn PDF / Instagram PNG / cheat-sheet downloads. */
export default function CarouselPanel({ args, day }: { args: CarouselArgs; day: number }) {
  const slides = useMemo(() => buildSlides(args), [args]);
  const total = slides.length + 1; // + cheat sheet
  const [i, setI] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false, made: string | null = null;
    (async () => {
      const c = i < slides.length ? await renderSlide(args, slides, i) : await renderCheatSheet(args, slides);
      if (cancelled) return;
      made = c.toDataURL("image/jpeg", 0.85); setUrl(made);
    })();
    return () => { cancelled = true; };
  }, [args, slides, i]);

  const base = `day-${String(day).padStart(2, "0")}-${slug(args.theme)}`;
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); toast.success("Download ready"); }
    catch (e) { console.error(e); toast.error("Couldn't create the file. Please try again."); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30" style={{ aspectRatio: "4 / 5" }}>
        {url ? <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Rendering…</div>}
        <button aria-label="Previous slide" disabled={i === 0} onClick={() => setI(i - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button aria-label="Next slide" disabled={i === total - 1} onClick={() => setI(i + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 disabled:opacity-30">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground text-center">
        {i < slides.length ? `Slide ${i + 1} of ${slides.length}` : "Cheat sheet (single image)"}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={!!busy}
          onClick={() => run("pdf", async () => downloadBlob(await renderCarouselPdf(args), `${base}-linkedin-carousel.pdf`))}>
          {busy === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
          LinkedIn PDF
        </Button>
        <Button size="sm" variant="outline" disabled={!!busy}
          onClick={() => run("png", async () => {
            const pngs = await renderCarouselPngs(args);
            const zip = new JSZip();
            pngs.forEach((b, k) => zip.file(`${String(k + 1).padStart(2, "0")}-slide.png`, b));
            downloadBlob(await zip.generateAsync({ type: "blob", compression: "STORE" }), `${base}-instagram-carousel.zip`);
          })}>
          {busy === "png" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Download className="h-3.5 w-3.5 mr-1" />}
          Instagram slides
        </Button>
        <Button size="sm" variant="outline" disabled={!!busy}
          onClick={() => run("cs", async () => {
            const c = await renderCheatSheet(args, slides);
            const b = await new Promise<Blob>((r) => c.toBlob((x) => r(x!), "image/png"));
            downloadBlob(b, `${base}-cheat-sheet.png`);
          })}>
          {busy === "cs" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Download className="h-3.5 w-3.5 mr-1" />}
          Cheat sheet
        </Button>
      </div>
    </div>
  );
}
