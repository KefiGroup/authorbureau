import { useState, useEffect } from "react";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
// sharedSupabase imported below after lucide icons
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BookOpen, Plus, ExternalLink, Pencil, Loader2, Upload, Globe, ImagePlus } from "lucide-react";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
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
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState<string | null>(null);

  const syncSession = async () => {
    if (!session) return;
    try {
      await cloudSupabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    } catch (err) {
      console.error("Session sync failed:", err);
    }
  };

  const fetchBooks = async () => {
    if (!user) return;
    setLoading(true);
    await syncSession();
    const { data } = await cloudSupabase
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

  const handlePublish = async (bookId: string) => {
    setPublishing(bookId);
    try {
      const { data: { session } } = await sharedSupabase.auth.getSession();
      if (!session) {
        toast({ title: "Not signed in", variant: "destructive" });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-book`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ bookId }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast({
        title: "Microsite Published! 🎉",
        description: `Your book microsite is now live at /books/${result.slug}`,
      });
      fetchBooks();
    } catch (err) {
      toast({
        title: "Publish failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setPublishing(null);
    }
  };

  const handleUploadCover = async (bookId: string, file: File) => {
    setUploadingCover(bookId);
    try {
      const { data: { session } } = await sharedSupabase.auth.getSession();
      if (!session) {
        toast({ title: "Not signed in", variant: "destructive" });
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bookId", bookId);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-book-cover`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast({ title: "Cover updated! 📸" });
      fetchBooks();
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setUploadingCover(null);
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
              <div className="aspect-[3/2] bg-muted flex items-center justify-center overflow-hidden relative">
                {book.cover_image_url ? (
                  <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover" />
                ) : (
                  <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                )}
                {/* Upload cover overlay */}
                <label
                  className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors cursor-pointer"
                  htmlFor={`cover-upload-${book.id}`}
                >
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-white text-xs font-medium bg-black/60 rounded-full px-3 py-1.5">
                    {uploadingCover === book.id ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading...</>
                    ) : (
                      <><ImagePlus className="h-3.5 w-3.5" />{book.cover_image_url ? "Change Cover" : "Add Cover"}</>
                    )}
                  </span>
                </label>
                <input
                  id={`cover-upload-${book.id}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingCover === book.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadCover(book.id, file);
                    e.target.value = "";
                  }}
                />
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
                  {book.published_at ? (
                    <a
                      href={`/books/${book.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-secondary/80 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Microsite
                    </a>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      disabled={publishing === book.id}
                      onClick={() => handlePublish(book.id)}
                    >
                      {publishing === book.id ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Publishing...</>
                      ) : (
                        <><Globe className="h-3 w-3 mr-1" />Publish Microsite</>
                      )}
                    </Button>
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
