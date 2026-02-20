import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BookOpen, Plus, ExternalLink, Pencil, Loader2, Upload } from "lucide-react";
import DualModeBookForm from "@/components/DualModeBookForm";

interface Book {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  cover_image_url: string | null;
  published_at: string | null;
  entry_mode: string | null;
  genre: string | null;
  rating: number | null;
  badges: string[] | null;
  created_at: string;
}

export default function MyBooks() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchBooks = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("books")
      .select("id, title, subtitle, slug, cover_image_url, published_at, entry_mode, genre, rating, badges, created_at")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false });
    setBooks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBooks();
  }, [user]);

  const getSourceLabel = (mode: string | null) => {
    switch (mode) {
      case "amazon": return "Amazon Import";
      case "publishnow": return "PublishNow.io";
      default: return "Manual";
    }
  };

  const getSourceColor = (mode: string | null) => {
    switch (mode) {
      case "amazon": return "bg-accent/15 text-accent";
      case "publishnow": return "bg-secondary/15 text-secondary";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (showForm && user) {
    return (
      <div className="max-w-3xl">
        <DualModeBookForm
          authorId={user.id}
          onSuccess={() => {
            setShowForm(false);
            fetchBooks();
          }}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold">My Books</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your book microsites — add, edit, and track your listings.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 w-fit">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Book
        </Button>
      </div>

      {/* Book Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading books...
        </div>
      ) : books.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 px-8 text-center border-dashed">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 mb-4">
            <BookOpen className="h-7 w-7 text-secondary" />
          </div>
          <h3 className="font-heading text-lg font-semibold mb-2">No books yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Add your first book to create a professional microsite. Import from Amazon or enter details manually.
          </p>
          <Button onClick={() => setShowForm(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Your First Book
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <Card key={book.id} className="overflow-hidden hover:shadow-[var(--shadow-card-hover)] transition-shadow group">
              {/* Cover */}
              <div className="aspect-[3/2] bg-muted flex items-center justify-center overflow-hidden">
                {book.cover_image_url ? (
                  <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover" />
                ) : (
                  <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                )}
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-heading font-semibold text-sm line-clamp-1">{book.title}</h3>
                  {book.subtitle && (
                    <p className="text-xs text-muted-foreground line-clamp-1 italic">{book.subtitle}</p>
                  )}
                </div>

                {/* Status & Source Badges */}
                <div className="flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    book.published_at
                      ? "bg-accent/15 text-accent"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {book.published_at ? "Published" : "Draft"}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getSourceColor(book.entry_mode)}`}>
                    {getSourceLabel(book.entry_mode)}
                  </span>
                </div>

                {/* Genre */}
                {book.genre && (
                  <p className="text-[11px] text-muted-foreground truncate">{book.genre}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {book.published_at && (
                    <a
                      href={`/books/${book.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-secondary/80 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Microsite
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
