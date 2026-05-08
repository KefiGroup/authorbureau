import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RefreshCw, Sparkles, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { generateProductCover, type ProductKind } from "@/lib/generate-product-cover";

interface Props {
  authorId: string;
  nodeId: string;
  bookId?: string | null;
  productKind: ProductKind;
  productTitle: string;
  productSubtitle?: string;
  authorName?: string;
}

/**
 * Shows the AI-generated product cover for a node and lets the author
 * (re)generate it. Polls once after the first generate so the new image
 * appears without a manual refresh.
 */
export default function ProductCoverPreview({
  authorId,
  nodeId,
  bookId,
  productKind,
  productTitle,
  productSubtitle,
  authorName,
}: Props) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadCover = async () => {
    let q = supabase
      .from("author_nodes")
      .select("cover_image_url")
      .eq("author_id", authorId)
      .eq("node_id", nodeId);
    if (bookId) q = q.eq("book_id", bookId);
    const { data } = await q.maybeSingle();
    setCoverUrl((data?.cover_image_url as string | null) || null);
    setLoading(false);
  };

  useEffect(() => {
    void loadCover();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId, nodeId, bookId]);

  const handleGenerate = async (force: boolean) => {
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
        force,
      });
      if (!res.success) {
        toast.error(res.message || "Cover generation failed");
        return;
      }
      if (res.cover_url) {
        setCoverUrl(res.cover_url);
        toast.success(force ? "Cover regenerated" : "Cover generated");
      } else {
        await loadCover();
      }
    } catch (e) {
      toast.error((e as Error).message || "Cover generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6 pb-6">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="shrink-0 w-[160px]">
            <div
              className="w-full rounded-lg shadow-2xl bg-muted flex items-center justify-center overflow-hidden"
              style={{ aspectRatio: "3 / 4" }}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : coverUrl ? (
                <img
                  src={coverUrl}
                  alt={`${productTitle} cover`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">AI Cover Design</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {coverUrl
                ? "This cover was generated to visually match your book. It appears on your public product page."
                : "Generate a cover that visually emulates your book — same palette, mood, and typography."}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {!coverUrl ? (
                <Button size="sm" onClick={() => handleGenerate(false)} disabled={busy}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                  Generate cover
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => handleGenerate(true)} disabled={busy}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                  Regenerate cover
                </Button>
              )}
            </div>
            {coverUrl && (
              <p className="text-xs text-muted-foreground/70">
                Tip: regenerate if the title or subtitle changes.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
