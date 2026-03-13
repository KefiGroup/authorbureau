import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/shared-backend";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  CheckCircle2, Eye, Edit, Loader2, Package, GraduationCap,
  BookOpen, Headphones, Video, Podcast, FileText, Download,
} from "lucide-react";
import HomeStudyExportModal from "./HomeStudyExportModal";
import { toast } from "@/hooks/use-toast";

interface DraftProduct {
  id: string;
  title: string;
  type: string;
  bookTitle: string;
  bookId: string;
  table: string;
  status: string;
  description?: string;
  price?: number;
  createdAt: string;
}

const typeIcons: Record<string, React.ElementType> = {
  courses: GraduationCap,
  home_study_courses: BookOpen,
  webinars: Video,
  audiobooks: Headphones,
  podcasts: Podcast,
  workbooks: FileText,
  social_media_content: FileText,
  email_flows: FileText,
  coaching_packages: FileText,
};

const typeLabels: Record<string, string> = {
  courses: "Online Course",
  home_study_courses: "Home Study Course",
  webinars: "Webinar",
  audiobooks: "Audiobook",
  podcasts: "Podcast",
  workbooks: "Workbook",
  social_media_content: "Social Media Calendar",
  email_flows: "Email Marketing",
  coaching_packages: "Coaching Package",
};

const TABLES = ["courses", "home_study_courses", "audiobooks", "podcasts", "social_media_content", "email_flows", "coaching_packages"] as const;

interface Props {
  onNavigate?: (section: string) => void;
}

export default function ReviewProductsPage({ onNavigate }: Props) {
  const { user } = useAuth();
  const [products, setProducts] = useState<DraftProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [confirmProduct, setConfirmProduct] = useState<DraftProduct | null>(null);
  const [previewProduct, setPreviewProduct] = useState<DraftProduct | null>(null);
  const [exportProduct, setExportProduct] = useState<DraftProduct | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchDrafts();
  }, [user]);

  const fetchDrafts = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch all tables in parallel for performance (BUG-058)
      const results = await Promise.all(
        TABLES.map(async (table) => {
          const { data } = await supabase
            .from(table)
            .select("id, title, book_id, created_at, status, description")
            .eq("author_id", user.id)
            .in("status", ["draft", "ready_for_review"]);
          return { table, data: data || [] };
        })
      );

      const drafts: DraftProduct[] = [];
      for (const { table, data } of results) {
        for (const item of data as any[]) {
          drafts.push({
            id: item.id,
            title: item.title,
            type: typeLabels[table] || table,
            bookTitle: "",
            bookId: item.book_id,
            table,
            status: item.status,
            description: item.description || undefined,
            createdAt: item.created_at,
          });
        }
      }

      // Get book titles in a single query
      const bookIds = [...new Set(drafts.map(d => d.bookId).filter(Boolean))];
      if (bookIds.length > 0) {
        const { data: books } = await supabase
          .from("books")
          .select("id, title")
          .in("id", bookIds);
        const titleMap: Record<string, string> = {};
        (books || []).forEach((b: any) => { titleMap[b.id] = b.title; });
        drafts.forEach(d => { d.bookTitle = titleMap[d.bookId] || "Unknown Book"; });
      }

      setProducts(drafts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error("Failed to fetch drafts:", err);
    }

    setLoading(false);
  };

  const handlePublish = async (product: DraftProduct) => {
    setPublishing(product.id);
    setConfirmProduct(null);
    try {
      // Update status to "published" (the only way a product becomes "live") — BUG-059
      const { error } = await supabase
        .from(product.table as any)
        .update({ status: "published" })
        .eq("id", product.id);
      if (error) throw error;
      toast({ title: "Published! ✅", description: `${product.title} is now live on your microsite.` });
      setProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (err) {
      toast({ title: "Publish failed", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
    } finally {
      setPublishing(null);
    }
  };

  const draftCount = products.filter(p => p.status === "draft").length;
  const reviewCount = products.filter(p => p.status === "ready_for_review").length;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Review & Publish Your Products</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All AI-generated products start as drafts. Review each one, make edits if needed, then publish to your microsite.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xl font-bold font-heading">{products.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Drafts</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold font-heading text-secondary">{reviewCount}</p>
          <p className="text-[10px] text-muted-foreground">Ready for Review</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold font-heading text-accent">{draftCount}</p>
          <p className="text-[10px] text-muted-foreground">In Draft</p>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <Card className="py-16 text-center border-dashed">
          <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">No Products to Review</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
            Build products from the Build Authority, Bridge Channels, or Yield Revenue sections, then they'll appear here for review.
          </p>
          <Button variant="outline" onClick={() => onNavigate?.("revenue-streams")}>
            Start Building Products →
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {products.map((product) => {
            const Icon = typeIcons[product.table] || FileText;
            return (
              <Card key={product.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-heading font-semibold text-sm">{product.title}</h4>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        product.status === "ready_for_review"
                          ? "bg-secondary/15 text-secondary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {product.status === "ready_for_review" ? "Ready for Review" : "Draft"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {product.type} · {product.bookTitle}
                    </p>
                    {product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    {product.table === "home_study_courses" && (
                      <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setExportProduct(product)}>
                        <Download className="h-3 w-3 mr-1" /> Download / Print
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setPreviewProduct(product)}>
                      <Eye className="h-3 w-3 mr-1" /> Preview
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => onNavigate?.("my-books")}>
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-8 bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={() => setConfirmProduct(product)}
                      disabled={publishing === product.id}
                    >
                      {publishing === product.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <><CheckCircle2 className="h-3 w-3 mr-1" /> Publish to Microsite</>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Publish Confirmation Dialog */}
      <Dialog open={!!confirmProduct} onOpenChange={() => setConfirmProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish to Microsite?</DialogTitle>
            <DialogDescription>
              This will add "{confirmProduct?.title}" to your microsite. Publish now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmProduct(null)}>Cancel</Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => confirmProduct && handlePublish(confirmProduct)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirm Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewProduct} onOpenChange={() => setPreviewProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewProduct?.title}</DialogTitle>
            <DialogDescription>{previewProduct?.type} · {previewProduct?.bookTitle}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {previewProduct?.description && (
              <p className="text-sm text-muted-foreground">{previewProduct.description}</p>
            )}
            <p className="text-xs text-muted-foreground italic">
              Full preview with detailed content is available in the product editor.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Home Study Export Modal */}
      <HomeStudyExportModal
        open={!!exportProduct}
        onOpenChange={() => setExportProduct(null)}
        product={exportProduct}
        fetchContent={exportProduct ? async () => {
          if (!user) return null;
          const { data: asset } = await supabase
            .from("generated_assets")
            .select("content")
            .eq("author_id", user.id)
            .eq("book_id", exportProduct.bookId)
            .eq("asset_type", "builder_draft_home-study")
            .maybeSingle();
          if (!asset?.content) return null;
          try {
            const parsed = JSON.parse(asset.content);
            const sd = parsed.stepData || {};
            const { data: profile } = await supabase
              .from("author_profiles")
              .select("pen_name")
              .eq("user_id", user.id)
              .maybeSingle();
            return {
              setup: sd.setup || { title: exportProduct.title, description: exportProduct.description || "", duration: 30, commitment: 30, level: "Beginner" },
              days: sd.schedule?.days || [],
              authorName: profile?.pen_name || "Author",
            };
          } catch { return null; }
        } : undefined}
      />
    </div>
  );
}

export function useReviewProductCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Parallel count queries for performance (BUG-058)
      const results = await Promise.all(
        TABLES.map(async (table) => {
          const { count: c } = await supabase
            .from(table)
            .select("id", { count: "exact", head: true })
            .eq("author_id", user.id)
            .in("status", ["draft", "ready_for_review"]);
          return c || 0;
        })
      );
      setCount(results.reduce((a, b) => a + b, 0));
    })();
  }, [user]);

  return count;
}
