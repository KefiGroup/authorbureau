import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BookOpen, Plus, ExternalLink, Loader2, ImagePlus, EyeOff, Clock,
  Pencil, Sparkles, ArrowRight, CheckCircle2, Circle,
} from "lucide-react";
import ManuscriptUpload from "./ManuscriptUpload";
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
  description?: string | null;
  pages?: number | null;
  price?: string | null;
  currency?: string | null;
  kindle_price?: string | null;
  paperback_price?: string | null;
  amazon_url?: string | null;
  bestseller_proof_url?: string | null;
}

async function getActiveToken(): Promise<string | null> {
  const { data: cloudSession } = await cloudSupabase.auth.getSession();
  if (cloudSession?.session?.access_token) return cloudSession.session.access_token;
  const { data: sharedSession } = await sharedSupabase.auth.getSession();
  return sharedSession?.session?.access_token || null;
}

interface MyBooksProps {
  isPremium?: boolean;
  onNavigate?: (section: string) => void;
  stripeConnected?: boolean;
}

type JourneyDot = "done" | "current" | "upcoming";

export default function MyBooks({ isPremium = false, onNavigate, stripeConnected = false }: MyBooksProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [uploadingCover, setUploadingCover] = useState<string | null>(null);
  const [unpublishing, setUnpublishing] = useState<string | null>(null);
  const [analyzedBooks, setAnalyzedBooks] = useState<Set<string>>(new Set());
  const [manuscriptBooks, setManuscriptBooks] = useState<Set<string>>(new Set());

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
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const fetchedBooks = result.books || [];
      setBooks(fetchedBooks);

      // Check which books have been analyzed (have business_plan asset) and have manuscripts
      if (fetchedBooks.length > 0) {
        const { data: assets } = await cloudSupabase
          .from("generated_assets")
          .select("book_id, asset_type")
          .eq("author_id", user.id)
          .in("asset_type", ["business_plan", "source_material"]);

        const analyzed = new Set<string>();
        const manuscripts = new Set<string>();
        (assets || []).forEach((a: any) => {
          if (a.asset_type === "business_plan") analyzed.add(a.book_id);
          if (a.asset_type === "source_material") manuscripts.add(a.book_id);
        });
        setAnalyzedBooks(analyzed);
        setManuscriptBooks(manuscripts);
      }
    } catch (err) {
      console.error("Failed to fetch books:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchBooks(); }, [user]);

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

  const handleEdit = async (book: Book) => {
    try {
      const token = await getActiveToken();
      if (!token) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "get", bookId: book.id }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setEditingBook(result.book);
      setShowForm(true);
    } catch (err) {
      toast({ title: "Failed to load book data", variant: "destructive" });
    }
  };

  // Journey dot helpers
  const getBookJourney = (book: Book): [JourneyDot, JourneyDot, JourneyDot, JourneyDot] => {
    const microsite: JourneyDot = book.published_at ? "done" : "current";
    const analyzed: JourneyDot = analyzedBooks.has(book.id) ? "done" : (microsite === "done" ? "current" : "upcoming");
    const building: JourneyDot = analyzed === "done" && isPremium ? "current" : (analyzed === "done" ? "upcoming" : "upcoming");
    const earning: JourneyDot = "upcoming";
    return [microsite, analyzed, building, earning];
  };

  const dotLabels = ["Microsite", "Analyzed", "Building", "Earning"];

  const getContextualCTA = (book: Book) => {
    const isAnalyzed = analyzedBooks.has(book.id);
    if (!isAnalyzed) return { label: "Analyze with Abby →", variant: "default" as const, action: () => onNavigate?.("build-business") };
    if (!isPremium) return { label: "Start Building →", variant: "default" as const, action: () => onNavigate?.("revenue-streams") };
    return { label: "Continue Building →", variant: "default" as const, action: () => navigate(`/dashboard/book/${book.id}`) };
  };

  const getNextStepPrompt = (book: Book) => {
    const isAnalyzed = analyzedBooks.has(book.id);
    if (!isAnalyzed) return "Let Abby map revenue streams for this book — it's free →";
    if (!isPremium) return "Abby found revenue streams. Subscribe to start building →";
    return "Continue building products from your book →";
  };

  if (showForm && user) {
    const initialData = editingBook ? {
      title: editingBook.title || "", subtitle: editingBook.subtitle || "",
      description: editingBook.description || "", pages: editingBook.pages || null,
      rating: editingBook.rating || null, genre: editingBook.genre || "",
      badges: editingBook.badges || [], price: editingBook.price || "",
      currency: editingBook.currency || "USD", kindlePrice: editingBook.kindle_price || "",
      paperbackPrice: editingBook.paperback_price || "", coverImageUrl: editingBook.cover_image_url || "",
      amazonUrl: editingBook.amazon_url || "", bestsellerProofUrl: editingBook.bestseller_proof_url || "",
    } : undefined;

    return (
      <div className="max-w-3xl">
        <DualModeBookForm
          authorId={user.id} editBookId={editingBook?.id} initialData={initialData}
          onSuccess={() => { setShowForm(false); setEditingBook(null); fetchBooks(); }}
          onCancel={() => { setShowForm(false); setEditingBook(null); }}
        />
      </div>
    );
  }

  // Stats
  const liveCount = books.filter(b => b.published_at).length;
  const analyzedCount = analyzedBooks.size;

  // Bottom banner
  const getBottomBanner = () => {
    if (analyzedCount === 0 && books.length > 0)
      return `You have ${books.length} book${books.length !== 1 ? "s" : ""} ready for Abby. She'll map up to 27 revenue streams per book — for free. Start with your best-seller →`;
    if (analyzedCount > 0 && !isPremium)
      return `Abby found revenue streams across your books. Unlock the AI builders to start creating products →`;
    if (isPremium)
      return `You're building products for your books. Continue where you left off →`;
    return null;
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold">My Books Hub</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your books, microsites, and track your monetization journey.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 w-fit">
          <Plus className="h-4 w-4 mr-1.5" /> Add Book
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
            Add your first book to create a professional microsite and start your author business.
          </p>
          <Button onClick={() => setShowForm(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Plus className="h-4 w-4 mr-1.5" /> Add Your First Book
          </Button>
        </Card>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { emoji: "📚", label: "Books Listed", value: books.length },
              { emoji: "🌐", label: "Live Microsites", value: liveCount },
              { emoji: "🤖", label: "Analyzed by Abby", value: analyzedCount },
              { emoji: "💰", label: "Revenue This Month", value: "$0" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                <span className="text-xl">{stat.emoji}</span>
                <div>
                  <p className="text-lg font-bold font-heading leading-tight">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Book Cards */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => {
              const journey = getBookJourney(book);
              const cta = getContextualCTA(book);
              const nextStep = getNextStepPrompt(book);
              const hasManuscript = manuscriptBooks.has(book.id);

              return (
                <Card key={book.id} className="overflow-hidden group flex flex-col">
                  {/* 1. Cover Image */}
                  <div className="h-[200px] bg-muted flex items-center justify-center overflow-hidden relative">
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
                      id={`cover-upload-${book.id}`} type="file" accept="image/*" className="hidden"
                      disabled={uploadingCover === book.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadCover(book.id, file);
                        e.target.value = "";
                      }}
                    />
                  </div>

                  {/* 2. Journey Progress Dots */}
                  <div className="px-4 pt-3 pb-1">
                    <div className="flex items-center gap-0">
                      {journey.map((dot, i) => (
                        <div key={i} className="flex items-center flex-1">
                          <div className="flex flex-col items-center flex-1">
                            <div className={`h-3 w-3 rounded-full border-2 ${
                              dot === "done" ? "bg-accent border-accent" :
                              dot === "current" ? "bg-secondary/30 border-secondary" :
                              "bg-muted border-border"
                            }`}>
                              {dot === "done" && <CheckCircle2 className="h-3 w-3 text-accent-foreground" />}
                            </div>
                            <span className="text-[9px] text-muted-foreground mt-0.5">{dotLabels[i]}</span>
                          </div>
                          {i < 3 && <div className={`h-[2px] flex-1 -mt-3 ${
                            journey[i + 1] === "done" || dot === "done" ? "bg-accent" : "bg-border"
                          }`} />}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 pt-2 space-y-2.5 flex-1 flex flex-col">
                    {/* 3. Title */}
                    <div>
                      <h3 className="font-heading font-semibold text-base line-clamp-1">{book.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1 italic">
                        {book.subtitle || book.genre || ""}
                      </p>
                    </div>

                    {/* 4. Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {book.genre && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {book.genre}
                        </span>
                      )}
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        book.published_at ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
                      }`}>
                        {book.published_at ? "Published" : "Draft"}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        hasManuscript ? "bg-accent/10 text-accent" : "bg-amber-100 text-amber-700"
                      }`}>
                        {hasManuscript ? "Manuscript ✅" : "Upload Manuscript"}
                      </span>
                    </div>

                    {/* 5. Microsite stats */}
                    <p className="text-[11px] text-muted-foreground">
                      {book.published_at ? "Microsite live" : "Microsite not yet active"}
                    </p>

                    {/* Manuscript upload compact */}
                    {!hasManuscript && (
                      <ManuscriptUpload bookId={book.id} bookTitle={book.title} compact />
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* 6. Action Buttons */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <Button
                        variant="outline" size="sm" className="text-[11px] h-8 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (book.published_at) window.open(`/books/${book.slug}`, "_blank");
                          else toast({ title: "Microsite not live yet" });
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" /> View
                      </Button>
                      <Button
                        variant="outline" size="sm" className="text-[11px] h-8 px-2"
                        onClick={(e) => { e.stopPropagation(); handleEdit(book); }}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        className="text-[11px] h-8 px-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                        onClick={(e) => { e.stopPropagation(); cta.action(); }}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {analyzedBooks.has(book.id) ? "Build" : "Analyze"}
                      </Button>
                    </div>

                    {/* 7. Next step prompt */}
                    <div className="rounded-lg bg-[hsl(var(--secondary)/0.08)] px-3 py-2 flex items-center gap-2">
                      <p className="text-[11px] text-secondary flex-1 leading-snug">{nextStep}</p>
                      <ArrowRight className="h-3.5 w-3.5 text-secondary shrink-0" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Bottom Banner */}
          {getBottomBanner() && (
            <Card className="border-secondary/20 bg-gradient-to-r from-secondary/5 to-secondary/10 p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center flex-shrink-0 text-lg">
                  👩‍💼
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed">{getBottomBanner()}</p>
                </div>
                <Button
                  size="sm"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 whitespace-nowrap"
                  onClick={() => onNavigate?.("build-business")}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {analyzedCount === 0 ? "Analyze with Abby" : "Continue Building"}
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
