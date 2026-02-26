import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Plus, ExternalLink, Loader2, ImagePlus, EyeOff, Clock } from "lucide-react";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import DualModeBookForm from "@/components/DualModeBookForm";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

async function getActiveToken(): Promise<string | null> {
  const { data: cloudSession } = await cloudSupabase.auth.getSession();
  if (cloudSession?.session?.access_token) return cloudSession.session.access_token;
  const { data: sharedSession } = await sharedSupabase.auth.getSession();
  return sharedSession?.session?.access_token || null;
}

export default function MyBooks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploadingCover, setUploadingCover] = useState<string | null>(null);
  const [unpublishing, setUnpublishing] = useState<string | null>(null);

  const fetchBooks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getActiveToken();
      if (!token) { setLoading(false); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setBooks(result.books || []);
    } catch (err) {
      console.error("Failed to fetch books:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchBooks(); }, [user]);

  const getSourceLabel = (mode: string | null) => {
    switch (mode) {
      case "amazon": return "Amazon Import";
      case "publishnow": return "PublishNow.io";
      case "imported": return "PublishNow.io";
      default: return "Manual";
    }
  };

  const getSourceColor = (mode: string | null) => {
    switch (mode) {
      case "amazon": return "bg-accent/15 text-accent";
      case "publishnow": case "imported": return "bg-secondary/15 text-secondary";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleUploadCover = async (bookId: string, file: File) => {
    setUploadingCover(bookId);
    try {
      const token = await getActiveToken();
      if (!token) { toast({ title: "Not signed in", variant: "destructive" }); return; }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bookId", bookId);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-book-cover`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast({ title: "Cover updated! 📸" });
      fetchBooks();
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
    } finally {
      setUploadingCover(null);
    }
  };

  const handleUnpublish = async (bookId: string) => {
    setUnpublishing(bookId);
    try {
      const token = await getActiveToken();
      if (!token) { toast({ title: "Not signed in", variant: "destructive" }); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "unpublish", bookId }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast({ title: "Microsite taken down 🔒" });
      fetchBooks();
    } catch (err) {
      toast({ title: "Unpublish failed", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
    } finally {
      setUnpublishing(null);
    }
  };

  if (showForm && user) {
    return (
      <div className="max-w-3xl">
        <DualModeBookForm
          authorId={user.id}
          onSuccess={() => { setShowForm(false); fetchBooks(); }}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold">My Books</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your book microsites — add books and track approval status.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 w-fit">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Book
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading books...
        </div>
      ) : books.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 px-8 text-center border-dashed">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 mb-4">
            <BookOpen className="h-7 w-7 text-secondary" />
          </div>
          <h3 className="font-heading text-lg font-semibold mb-2">No books yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Add your first book to create a professional microsite. Your book will be reviewed by our team before going live.
          </p>
          <Button onClick={() => setShowForm(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Plus className="h-4 w-4 mr-1.5" /> Add Your First Book
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <Card key={book.id} className="overflow-hidden hover:shadow-[var(--shadow-card-hover)] transition-shadow group">
              <div className="aspect-[3/2] bg-muted flex items-center justify-center overflow-hidden relative">
                {book.cover_image_url ? (
                  <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover" />
                ) : (
                  <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                )}
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

                <div className="flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    book.published_at
                      ? "bg-accent/15 text-accent"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {book.published_at ? "Published" : "⏳ Pending Approval"}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getSourceColor(book.entry_mode)}`}>
                    {getSourceLabel(book.entry_mode)}
                  </span>
                </div>

                {book.genre && (
                  <p className="text-[11px] text-muted-foreground truncate">{book.genre}</p>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div>
                    {book.published_at ? (
                      <a
                        href={`/books/${book.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-secondary/80 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View Microsite
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> Awaiting admin review
                      </span>
                    )}
                  </div>

                  {book.published_at && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-orange-600"
                          disabled={unpublishing === book.id}
                        >
                          {unpublishing === book.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Take down this microsite?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will unpublish the microsite for "{book.title}". The book will remain in your dashboard and can be re-approved later.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-orange-600 text-white hover:bg-orange-700"
                            onClick={() => handleUnpublish(book.id)}
                          >
                            Unpublish
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
