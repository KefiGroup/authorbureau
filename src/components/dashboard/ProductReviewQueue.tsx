import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Eye, Edit, Loader2, Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PendingProduct {
  id: string;
  title: string;
  type: string;
  bookTitle: string;
  bookId: string;
  table: string;
  createdAt: string;
}

interface Props {
  onNavigate?: (section: string) => void;
}

export default function ProductReviewQueue({ onNavigate }: Props) {
  const { user } = useAuth();
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchPending();
  }, [user]);

  const fetchPending = async () => {
    if (!user) return;
    setLoading(true);
    const pending: PendingProduct[] = [];

    try {
      // Check courses
      const { data: courses } = await supabase
        .from("courses")
        .select("id, title, book_id, created_at, status")
        .eq("author_id", user.id)
        .eq("status", "ready_for_review");

      // Check home study courses
      const { data: homeStudy } = await supabase
        .from("home_study_courses")
        .select("id, title, book_id, created_at, status")
        .eq("author_id", user.id)
        .eq("status", "ready_for_review");

      // Check webinars
      const { data: webinars } = await supabase
        .from("webinars")
        .select("id, title, book_id, created_at, status")
        .eq("author_id", user.id)
        .eq("status", "ready_for_review");

      // Check audiobooks
      const { data: audiobooks } = await supabase
        .from("audiobooks")
        .select("id, title, book_id, created_at, status")
        .eq("author_id", user.id)
        .eq("status", "ready_for_review");

      // Check podcasts
      const { data: podcasts } = await supabase
        .from("podcasts")
        .select("id, title, book_id, created_at, status")
        .eq("author_id", user.id)
        .eq("status", "ready_for_review");

      // Get book titles
      const bookIds = new Set<string>();
      [courses, homeStudy, webinars, audiobooks, podcasts].forEach(arr =>
        (arr || []).forEach((item: any) => { if (item.book_id) bookIds.add(item.book_id); })
      );

      let bookTitles: Record<string, string> = {};
      if (bookIds.size > 0) {
        const { data: books } = await supabase
          .from("books")
          .select("id, title")
          .in("id", Array.from(bookIds));
        (books || []).forEach((b: any) => { bookTitles[b.id] = b.title; });
      }

      const mapItems = (items: any[] | null, type: string, table: string) =>
        (items || []).map((item) => ({
          id: item.id,
          title: item.title,
          type,
          bookTitle: bookTitles[item.book_id] || "Unknown Book",
          bookId: item.book_id,
          table,
          createdAt: item.created_at,
        }));

      pending.push(
        ...mapItems(courses, "Online Course", "courses"),
        ...mapItems(homeStudy, "Home Study Course", "home_study_courses"),
        ...mapItems(webinars, "Webinar", "webinars"),
        ...mapItems(audiobooks, "Audiobook", "audiobooks"),
        ...mapItems(podcasts, "Podcast", "podcasts"),
      );
    } catch (err) {
      console.error("Failed to fetch pending products:", err);
    }

    setPendingProducts(pending);
    setLoading(false);
  };

  const handlePublish = async (product: PendingProduct) => {
    setPublishing(product.id);
    try {
      const { error } = await supabase
        .from(product.table as any)
        .update({ status: "published" })
        .eq("id", product.id);

      if (error) throw error;

      toast({ title: "Published! ✅", description: `${product.title} is now live on your microsite.` });
      setPendingProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (err) {
      toast({ title: "Publish failed", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
    } finally {
      setPublishing(null);
    }
  };

  if (loading) return null;
  if (pendingProducts.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-secondary/15 flex items-center justify-center">
          <Package className="h-3.5 w-3.5 text-secondary" />
        </div>
        <h3 className="font-heading font-semibold text-sm">Products Pending Review</h3>
        <span className="inline-flex items-center justify-center rounded-full bg-secondary text-secondary-foreground w-5 h-5 text-[10px] font-bold">
          {pendingProducts.length}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {pendingProducts.map((product) => (
          <Card key={product.id} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-heading font-semibold text-sm truncate">{product.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {product.type} · {product.bookTitle}
              </p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] px-2"
                onClick={() => onNavigate?.("my-books")}
              >
                <Eye className="h-3 w-3 mr-0.5" /> Preview
              </Button>
              <Button
                size="sm"
                className="h-7 text-[10px] px-2 bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => handlePublish(product)}
                disabled={publishing === product.id}
              >
                {publishing === product.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <><CheckCircle2 className="h-3 w-3 mr-0.5" /> Publish</>
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function useProductReviewCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      let total = 0;
      const tables = ["courses", "home_study_courses", "webinars", "audiobooks", "podcasts"] as const;
      for (const table of tables) {
        const { count: c } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("author_id", user.id)
          .eq("status", "ready_for_review");
        total += c || 0;
      }
      setCount(total);
    })();
  }, [user]);

  return count;
}
