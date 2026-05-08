import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RefreshCw, Sparkles, ImageIcon, Check } from "lucide-react";
import { toast } from "sonner";
import { generateProductCover, type ProductKind } from "@/lib/generate-product-cover";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

interface Props {
  authorId: string;
  nodeId: string;
  bookId?: string | null;
  productKind: ProductKind;
  productTitle: string;
  productSubtitle?: string;
  authorName?: string;
}

interface HistEntry {
  url: string;
  created_at: string;
  is_active: boolean;
}

const MAX_DESIGNS = 3;

export default function ProductCoverPreview({
  authorId,
  nodeId,
  bookId,
  productKind,
  productTitle,
  productSubtitle,
  authorName,
}: Props) {
  const [history, setHistory] = useState<HistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const autoStartedRef = useRef<string | null>(null);

  const loadCover = async (): Promise<HistEntry[]> => {
    let q = supabase
      .from("author_nodes")
      .select("cover_image_url, cover_image_history")
      .eq("author_id", authorId)
      .eq("node_id", nodeId);
    if (bookId) q = q.eq("book_id", bookId);
    const { data } = await q.maybeSingle();
    const raw = (data as any)?.cover_image_history;
    let h: HistEntry[] = Array.isArray(raw) ? raw : [];
    // Backfill view if only legacy single URL exists.
    if (h.length === 0 && (data as any)?.cover_image_url) {
      h = [{ url: (data as any).cover_image_url, created_at: new Date().toISOString(), is_active: true }];
    }
    setHistory(h);
    setLoading(false);
    return h;
  };

  // Auto-generate up to 3 designs on first load when none exist yet.
  useEffect(() => {
    const key = `${authorId}::${nodeId}::${bookId ?? ""}`;
    let cancelled = false;
    (async () => {
      const initial = await loadCover();
      if (cancelled) return;
      if (
        initial.length === 0 &&
        productTitle &&
        productTitle.trim().length > 0 &&
        autoStartedRef.current !== key
      ) {
        autoStartedRef.current = key;
        setAutoBusy(true);
        try {
          let count = initial.length;
          while (count < MAX_DESIGNS && !cancelled) {
            const res = await generateProductCover({
              authorId,
              nodeId,
              bookId: bookId ?? null,
              productKind,
              productTitle,
              productSubtitle,
              authorName,
              force: count > 0,
            });
            if (!res.success) {
              toast.error(res.message || "Cover generation failed");
              break;
            }
            const next = await loadCover();
            if (cancelled) return;
            if (next.length <= count) break; // safety
            count = next.length;
          }
        } finally {
          if (!cancelled) setAutoBusy(false);
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId, nodeId, bookId, productTitle]);


  const activeUrl = history.find((h) => h.is_active)?.url || history[0]?.url || null;
  const atCap = history.length >= MAX_DESIGNS;

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const res = await generateProductCover({
        authorId,
        nodeId,
        bookId: bookId ?? null,
        productKind,
        productTitle,
        productSubtitle,
        authorName,
        force: history.length > 0,
      });
      if (!res.success) {
        toast.error(res.message || "Cover generation failed");
        return;
      }
      await loadCover();
      toast.success(history.length === 0 ? "Cover generated" : "New design saved");
    } catch (e) {
      toast.error((e as Error).message || "Cover generation failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerateSlot = async (idx: number) => {
    if (regeneratingIdx !== null || busy) return;
    setRegeneratingIdx(idx);
    try {
      const res = await generateProductCover({
        authorId,
        nodeId,
        bookId: bookId ?? null,
        productKind,
        productTitle,
        productSubtitle,
        authorName,
        force: true,
        regenerateSlotIndex: idx,
      });
      if (!res.success) {
        toast.error(res.message || "Regeneration failed");
        return;
      }
      await loadCover();
      toast.success("Design regenerated");
    } catch (e) {
      toast.error((e as Error).message || "Regeneration failed");
    } finally {
      setRegeneratingIdx(null);
    }
  };

  const handlePick = async (url: string) => {
    if (url === activeUrl) return;
    setSwitching(url);
    // Optimistic
    setHistory((prev) => prev.map((h) => ({ ...h, is_active: h.url === url })));
    try {
      const token = await getActiveToken();
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/set-active-product-cover`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ authorId, nodeId, bookId: bookId ?? null, url }),
        },
        25_000,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data as any)?.success) {
        await loadCover();
        toast.error((data as any)?.message || `Couldn't switch design (HTTP ${res.status})`);
        return;
      }
      toast.success("Active design updated");
    } catch (e) {
      await loadCover();
      toast.error((e as Error).message || "Couldn't switch design");
    } finally {
      setSwitching(null);
    }
  };

  // Build 3 slots — fill with history, pad with empty.
  const slots: (HistEntry | null)[] = Array.from({ length: MAX_DESIGNS }, (_, i) => history[i] || null);

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6 pb-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">AI Cover Designs</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {history.length}/{MAX_DESIGNS} saved
          </span>
        </div>

        {history.length > 0 && (
          <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground space-y-1">
            <div>
              <span className="font-medium text-foreground">How to choose:</span> the design with the gold ring + “Active” badge is the one shown on your public author page. Click any other saved design to make it the active one — the public page updates instantly.
            </div>
            <div>
              <span className="font-medium text-foreground">Variety:</span> all 3 designs follow your book cover with slight variations in fonts, colours, and styling. Use <span className="font-medium text-foreground">Redo</span> on any tile to regenerate that design in place.
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {slots.map((slot, idx) => {
              if (!slot) {
                const generating = autoBusy;
                const slotNum = idx + 1;
                return (
                  <div
                    key={`empty-${idx}`}
                    className="rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex flex-col items-center justify-center gap-1 p-2 text-center"
                    style={{ aspectRatio: "3 / 4" }}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
                        <span className="text-[10px] text-muted-foreground/70 leading-tight">
                          Generating design {slotNum} of {MAX_DESIGNS}…
                        </span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                        <span className="text-[10px] text-muted-foreground/60 leading-tight">Empty slot</span>
                      </>
                    )}
                  </div>
                );
              }
              const isActive = slot.url === activeUrl;
              const isSwitching = switching === slot.url;
              const isRegenThis = regeneratingIdx === idx;
              const pickDisabled = isActive || !!switching || regeneratingIdx !== null;
              return (
                <div
                  key={slot.url}
                  role="button"
                  tabIndex={pickDisabled ? -1 : 0}
                  onClick={() => { if (!pickDisabled) handlePick(slot.url); }}
                  onKeyDown={(e) => {
                    if (!pickDisabled && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      handlePick(slot.url);
                    }
                  }}
                  className={`group relative rounded-lg overflow-hidden bg-muted transition-all ${
                    isActive
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-2xl cursor-default"
                      : pickDisabled
                      ? "ring-1 ring-border opacity-60"
                      : "ring-1 ring-border hover:ring-primary/60 hover:scale-[1.02] cursor-pointer"
                  }`}
                  style={{ aspectRatio: "3 / 4" }}
                  title={isActive ? "This design is shown on your public page" : "Click to use this design on your public page"}
                >
                  <img
                    src={slot.url}
                    alt={`${productTitle} cover design ${idx + 1}`}
                    className="w-full h-full object-contain bg-neutral-900"
                  />
                  {isActive && (
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 shadow">
                      <Check className="h-3 w-3" /> Active
                    </div>
                  )}
                  {/* Per-slot regenerate button — same art direction, fixes typos/blurbs */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void handleRegenerateSlot(idx); }}
                    disabled={isRegenThis || regeneratingIdx !== null || busy}
                    className="absolute bottom-2 right-2 z-10 bg-black/80 hover:bg-black text-white text-[11px] font-semibold px-2 py-1 rounded-md shadow-lg ring-1 ring-white/20 flex items-center gap-1 transition-colors disabled:opacity-80"
                    title="Redo this design — same art direction, regenerates in place (does not use a new slot)"
                  >
                    {isRegenThis ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    {isRegenThis ? "Regenerating…" : "Redo"}
                  </button>
                  {!isActive && !isRegenThis && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-semibold text-white uppercase tracking-wide">Use this design</span>
                    </div>
                  )}
                  {(isSwitching || isRegenThis) && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {history.length === 0
              ? "Generate a cover that visually emulates your book — same palette, mood, and typography."
              : "The active design appears on your public product page. Click any saved design to switch — no republish needed. Use Redo on a tile to regenerate that design in place."}
          </p>
          {history.length === 0 && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleGenerate} disabled={busy}>
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                Generate cover
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
