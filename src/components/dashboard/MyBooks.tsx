import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, TIERS, type SubscriptionTier } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BookOpen, Plus, ExternalLink, Loader2, ImagePlus, Sparkles, Eye,
  CreditCard, Rocket, Hammer, ChartLine, CheckCircle2, Upload, RefreshCw,
} from "lucide-react";
import ManuscriptUpload from "./ManuscriptUpload";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
// cloudSupabase queries now use REST API with shared backend token
import DualModeBookForm from "@/components/DualModeBookForm";
import JourneyTracker, { getBookStage, type JourneyStage } from "./my-books/JourneyTracker";
import PortfolioSummaryBar from "./my-books/PortfolioSummaryBar";
import ContextualBanner from "./my-books/ContextualBanner";
import AbbyNudge from "./my-books/AbbyNudge";
import RevenueProjectionCard from "./my-books/RevenueProjectionCard";
import BookActionMenu from "./my-books/BookActionMenu";
import PortfolioStrategyCard from "./my-books/PortfolioStrategyCard";
import BuildMyBusinessSection from "./my-books/BuildMyBusinessSection";

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
  approval_status?: string | null;
  rejection_note?: string | null;
}

import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

interface MyBooksProps {
  isPremium?: boolean;
  onNavigate?: (section: string) => void;
  stripeConnected?: boolean;
  centralStats?: {
    bookCount: number;
    liveMicrosites: number;
    analyzedCount: number;
    products: {
      totalBuilt: number;
      totalReadyForReview: number;
      totalPublished: number;
      perBook: Record<string, number>;
    };
  };
}

export default function MyBooks({ isPremium = false, onNavigate, stripeConnected = false, centralStats }: MyBooksProps) {
  const { user, tier, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [uploadingCover, setUploadingCover] = useState<string | null>(null);
  const [analyzedBooks, setAnalyzedBooks] = useState<Set<string>>(new Set());
  const [manuscriptBooks, setManuscriptBooks] = useState<Set<string>>(new Set());
  const [showManuscriptUpload, setShowManuscriptUpload] = useState<string | null>(null);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [categoryCounts, setCategoryCounts] = useState<Record<string, { build: number; bridge: number; yield: number }>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isSubscribed = isPremium || isAdmin;

  const fetchBooks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setFetchError(null);
    try {
      const token = await getActiveToken();
      if (!token) { setFetchError("Unable to authenticate. Please sign out and back in."); setLoading(false); return; }

      const response = await fetchWithTimeout(
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

      // Use asset data returned by the edge function (service_role bypasses RLS)
      const analyzed = new Set<string>(result.analyzedBookIds || []);
      const manuscripts = new Set<string>(result.manuscriptBookIds || []);
      setAnalyzedBooks(analyzed);
      setManuscriptBooks(manuscripts);
      setProductCounts(result.productCounts || {});
      setCategoryCounts(result.categoryCounts || {});
    } catch (err) {
      console.error("Failed to fetch books:", err);
      setFetchError(err?.name === "AbortError" ? "Request timed out. Please try again." : "Could not load your books. Please try again.");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBooks(); }, [user, fetchBooks]);

  // Deep-link support: ?bookId=&focus= and ?intent=brand|build|yield
  const [searchParams] = useSearchParams();

  // Map "intent" → BookHub tab id, used by the canonical Sidebar→My Books→Book flow.
  const intent = searchParams.get("intent") as "brand" | "build" | "yield" | null;
  const intentTab = intent === "brand" ? "revenue-streams"
    : intent === "build" ? "marketing-channels"
    : intent === "yield" ? "authority-builders"
    : null;
  const intentLabel = intent === "brand" ? "Brand Products"
    : intent === "build" ? "Build Authority"
    : intent === "yield" ? "Yield Revenue"
    : null;

  // If exactly one analyzed book exists and an intent was passed, auto-jump to it.
  useEffect(() => {
    if (!intentTab || loading || books.length === 0) return;
    const analyzed = books.filter(b => analyzedBooks.has(b.id));
    if (analyzed.length === 1) {
      navigate(`/dashboard/book/${analyzed[0].id}?tab=${intentTab}`, { replace: true });
    }
  }, [intentTab, loading, books, analyzedBooks, navigate]);

  useEffect(() => {
    const focusBookId = searchParams.get("bookId");
    const focusField = searchParams.get("focus");
    if (!focusBookId || loading || books.length === 0) return;
    const target = books.find((b) => b.id === focusBookId);
    if (!target) return;
    // Scroll into view
    setTimeout(() => {
      const el = document.getElementById(`book-card-${focusBookId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-amber-400");
        setTimeout(() => el.classList.remove("ring-2", "ring-amber-400"), 4000);
      }
    }, 200);
    if (focusField) {
      const fieldLabel: Record<string, string> = {
        description: "book description",
        cover: "cover image",
        genre: "genre",
        title: "title",
      };
      toast({
        title: `Add the missing ${fieldLabel[focusField] || focusField}`,
        description: `Update '${target.title}' to unlock the next builder.`,
      });
    }
  }, [searchParams, books, loading, toast]);

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

  const handleDeleteBook = async (bookId: string) => {
    try {
      const token = await getActiveToken();
      if (!token) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "delete", bookId }),
        }
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }
      toast({ title: "Book deleted" });
      fetchBooks();
    } catch (err) {
      toast({ title: "Failed to delete book", variant: "destructive" });
    }
  };

  // Journey stage per book
  const getStage = (book: Book): JourneyStage => {
    return getBookStage({
      hasMicrosite: !!book.published_at,
      isAnalyzed: analyzedBooks.has(book.id),
      isSubscribed,
      productsBuilt: getBookProductCount(book.id),
      hasRevenue: false, // TODO: integrate real revenue data
    });
  };

  // Primary CTA per book
  const getPrimaryCTA = (book: Book) => {
    const stage = getStage(book);
    const isAnalyzed = analyzedBooks.has(book.id);
    const isApproved = !!book.published_at;

    // Book not yet approved by admin — no actions available
    if (!isApproved) return {
      label: "Pending Approval", icon: Sparkles, bg: "bg-muted text-muted-foreground cursor-not-allowed",
      action: () => {},
      disabled: true,
    };

    if (!isAnalyzed) return {
      label: "Analyze with Abby — Free", icon: Sparkles, bg: "bg-[#C4973B] hover:bg-[#D4A843]",
      action: () => onNavigate?.("build-business"),
    };
    if (!isSubscribed) return {
      label: "Subscribe to Start Building", icon: CreditCard, bg: "bg-[#6366F1] hover:bg-[#6366F1]/90",
      action: () => onNavigate?.("build-business"),
    };
    if (getBookProductCount(book.id) === 0) return {
      label: intentTab ? `Start ${intentLabel}` : "Start Building", icon: Rocket, bg: "bg-[#0D9488] hover:bg-[#0D9488]/90",
      action: () => navigate(`/dashboard/book/${book.id}${intentTab ? `?tab=${intentTab}` : ""}`),
    };
    return {
      label: intentTab ? `Continue ${intentLabel}` : "Continue Building", icon: Hammer, bg: "bg-[#0D9488] hover:bg-[#0D9488]/90",
      action: () => navigate(`/dashboard/book/${book.id}${intentTab ? `?tab=${intentTab}` : ""}`),
    };
  };

  // Banner priority
  const getBannerPriority = (): { priority: 1 | 2 | 3 | 4 | 5; bookTitle?: string } | null => {
    const hasAnalyzedNotSubscribed = books.some(b => analyzedBooks.has(b.id)) && !isSubscribed;
    if (hasAnalyzedNotSubscribed) return { priority: 1 };
    if (isSubscribed && !stripeConnected) return { priority: 2 };
    const unanalyzedBook = books.find(b => !analyzedBooks.has(b.id) && !!b.published_at);
    if (unanalyzedBook) return { priority: 3, bookTitle: unanalyzedBook.title };
    // Default progress banner
    if (books.length > 0) return { priority: 5 };
    return null;
  };

  const handleBannerAction = (priority: number) => {
    switch (priority) {
      case 1: onNavigate?.("build-business"); break;
      case 2: onNavigate?.("connect-stripe"); break;
      case 3: onNavigate?.("build-business"); break;
      case 4: onNavigate?.("review-products"); break;
      case 5: {
        const firstAnalyzed = books.find(b => analyzedBooks.has(b.id));
        if (firstAnalyzed) navigate(`/dashboard/book/${firstAnalyzed.id}`);
        break;
      }
    }
  };

  // Stats — use centralized stats as single source of truth when available
  const liveCount = centralStats?.liveMicrosites ?? books.filter(b => !!b.published_at).length;
  const analyzedCount = centralStats?.analyzedCount ?? analyzedBooks.size;
  const totalProductsBuilt = centralStats?.products.totalBuilt ?? Object.values(productCounts).reduce((s, c) => s + c, 0);
  const totalRecommended = analyzedCount * 12; // estimated, ideally from Abby
  const getBookProductCount = (bookId: string) => centralStats?.products.perBook[bookId] ?? productCounts[bookId] ?? 0;

  // Form view
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

  const banner = getBannerPriority();

  return (
    <div className="max-w-6xl space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-heading text-[28px] font-bold">My Books Hub</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your books, your journey, your revenue — all in one place.
          </p>
        </div>
        <div className="flex gap-2">
          {/* BUG-025: Removed redundant Stripe banner — CTA lives in sidebar */}
          <Button onClick={() => setShowForm(true)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 w-fit">
            <Plus className="h-4 w-4 mr-1.5" /> Add Book
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading books...
        </div>
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-muted-foreground text-sm">{fetchError}</p>
          <Button variant="outline" size="sm" onClick={fetchBooks}>
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
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
          <Button onClick={() => setShowForm(true)} className="bg-[#C4973B] hover:bg-[#D4A843] text-white">
            <Plus className="h-4 w-4 mr-1.5" /> Add Your First Book
          </Button>
        </Card>
      ) : (
        <>
          {/* 2. Portfolio Summary Bar */}
          <PortfolioSummaryBar
            bookCount={books.length}
            liveMicrosites={liveCount}
            analyzedCount={analyzedCount}
            productsBuilt={totalProductsBuilt}
            totalRecommended={totalRecommended}
            revenueThisMonth={0}
            tier={tier}
            onSubscribe={() => onNavigate?.("build-business")}
          />

          {/* Intent banner: user came in via Brand/Build/Yield sidebar — make them pick a book */}
          {intentTab && books.length > 1 && (
            <Card className="p-5 border-2 border-secondary/40 bg-secondary/5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 shrink-0">
                  <Sparkles className="h-5 w-5 text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-base font-semibold mb-0.5">
                    Pick a book to start building your {intentLabel}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Choose which book this {intentLabel?.toLowerCase()} should be built around — every product is tied to a specific book.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {banner && (
            <ContextualBanner
              priority={banner.priority}
              bookTitle={banner.bookTitle}
              revenueRange="$8,000–$30,000/month"
              productsBuilt={totalProductsBuilt}
              totalProducts={totalRecommended}
              onAction={() => handleBannerAction(banner.priority)}
            />
          )}

          {/* Portfolio Strategy Card (2+ analyzed books) */}
          <PortfolioStrategyCard
            analyzedBookCount={analyzedCount}
            totalStreams={analyzedCount * 12}
            onViewStrategy={() => onNavigate?.("build-business")}
          />

          {/* 4. Book Cards Grid */}
          <div className="grid gap-5 lg:grid-cols-2">
            {books.map((book) => {
              const stage = getStage(book);
              const isAnalyzed = analyzedBooks.has(book.id);
              const hasManuscript = manuscriptBooks.has(book.id);
              const cta = getPrimaryCTA(book);
              const CTAIcon = cta.icon;
              const builtCount = getBookProductCount(book.id);
              const isBestseller = book.badges?.some(b => b.toLowerCase().includes("bestseller"));

              return (
                <Card key={book.id} id={`book-card-${book.id}`} className="overflow-hidden group flex flex-col transition-shadow">
                  {/* A. Cover Image */}
                  <div className="h-[220px] bg-muted flex items-center justify-center overflow-hidden relative">
                    {book.cover_image_url ? (
                      <img src={book.cover_image_url} alt={book.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-primary">
                        <span className="text-primary-foreground/60 text-xs uppercase tracking-wider mb-2">Book</span>
                        <span className="text-primary-foreground text-center font-heading font-semibold text-sm leading-snug px-4">
                          {book.title}
                        </span>
                      </div>
                    )}
                    {/* Bottom gradient overlay */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                    <label
                      className="absolute bottom-2 left-2 flex items-center gap-1.5 text-white text-[11px] font-medium bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 cursor-pointer hover:bg-white/30 transition-colors opacity-0 group-hover:opacity-100"
                      htmlFor={`cover-upload-${book.id}`}
                    >
                      {uploadingCover === book.id ? (
                        <><Loader2 className="h-3 w-3 animate-spin" />Uploading...</>
                      ) : (
                        <><ImagePlus className="h-3 w-3" />Change Cover</>
                      )}
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
                    {isBestseller && (
                      <div className="absolute top-3 right-3 h-12 w-12 rounded-full bg-[#C4973B] flex items-center justify-center text-white text-[8px] font-bold text-center leading-tight shadow-lg">
                        AMAZON<br />#1
                      </div>
                    )}
                  </div>

                  {/* B. Journey Tracker */}
                  <JourneyTracker currentStage={stage} isSubscribed={isSubscribed} />

                  <div className="p-4 pt-1 space-y-3 flex-1 flex flex-col">
                    {/* C. Book Information */}
                    <div>
                      <h3 className="font-heading font-bold text-lg line-clamp-2">{book.title}</h3>
                      {book.subtitle && (
                        <p className="text-[13px] text-muted-foreground italic line-clamp-1 mt-0.5">{book.subtitle}</p>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {book.genre && (
                        <span className="inline-flex items-center rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-medium text-[#6B7280]">
                          {book.genre}
                        </span>
                      )}
                      {book.approval_status === "approved" && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          ✅ Approved
                        </span>
                      )}
                      {book.approval_status === "rejected" && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800" title={book.rejection_note || "No reason provided"}>
                          ❌ Rejected
                        </span>
                      )}
                      {(!book.approval_status || book.approval_status === "pending") && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          ⏳ Pending Review
                        </span>
                      )}
                      {book.published_at && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          Published
                        </span>
                      )}
                      {hasManuscript ? (
                        <span className="inline-flex items-center rounded-full bg-[#D1FAE5] px-2 py-0.5 text-[10px] font-medium text-[#065F46] gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Manuscript
                        </span>
                      ) : (
                        <button
                          onClick={() => setShowManuscriptUpload(book.id)}
                          className="inline-flex items-center rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-medium text-[#92400E] gap-1 hover:bg-[#FDE68A] transition-colors cursor-pointer"
                        >
                          <Upload className="h-2.5 w-2.5" /> Upload Manuscript
                        </button>
                      )}
                    </div>

                    {/* Status indicators */}
                    <div className="flex flex-col gap-1">
                      {book.approval_status === "approved" && book.published_at ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          <span className="text-[11px] text-muted-foreground">Book Page Live</span>
                        </div>
                      ) : book.approval_status === "rejected" ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          <span className="text-[11px] text-red-600 font-medium">
                            Rejected{book.rejection_note ? ` — ${book.rejection_note}` : ""}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span className="text-[11px] text-amber-600 font-medium">Pending Admin Approval</span>
                        </div>
                      )}
                      {isAnalyzed && (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#059669]" />
                          <span className="text-[11px] text-muted-foreground">Business Plan Ready</span>
                        </div>
                      )}
                      {!isAnalyzed && (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                          <span className="text-[11px] text-muted-foreground">Awaiting Analysis</span>
                        </div>
                      )}
                      {builtCount > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#059669]" />
                          <span className="text-[11px] text-muted-foreground">{builtCount} Products Built</span>
                        </div>
                      )}
                    </div>

                    {/* D. Revenue Projection (analyzed only) */}
                    {isAnalyzed && (
                      <RevenueProjectionCard
                        revenueRange="$8,000–$30,000/month"
                        totalStreams={12}
                        built={builtCount}
                        remaining={12 - builtCount}
                      />
                    )}

                    {/* E. Abby Nudge */}
                    <AbbyNudge
                      stage={stage}
                      bookTitle={book.title}
                      tier={tier}
                      revenueStreams={12}
                      productsBuilt={builtCount}
                      totalProducts={12}
                    />

                    {/* Manuscript upload dialog */}
                    {showManuscriptUpload === book.id && !hasManuscript && (
                      <ManuscriptUpload bookId={book.id} bookTitle={book.title} compact />
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* G. Action Section */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        className={`flex-1 text-sm h-10 ${(cta as any).disabled ? '' : 'text-white'} ${cta.bg}`}
                        onClick={cta.action}
                        disabled={(cta as any).disabled}
                      >
                        <CTAIcon className="h-4 w-4 mr-1.5" />
                        {cta.label}
                      </Button>

                      {/* View button with tooltip */}
                      <Button
                        variant="outline" size="icon" className="h-9 w-9 shrink-0"
                        title="View Author's Page"
                        onClick={() => {
                          if (book.published_at) window.open(`/books/${book.slug}`, "_blank");
                          else toast({ title: "Author's Page is under review" });
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* Overflow menu */}
                      <BookActionMenu
                        isAnalyzed={isAnalyzed}
                        hasManuscript={hasManuscript}
                        hasBookPage={!!book.published_at}
                        onEdit={() => handleEdit(book)}
                        onUploadManuscript={() => setShowManuscriptUpload(book.id)}
                        onViewBusinessPlan={() => navigate(`/dashboard/book/${book.id}`)}
                        onReAnalyze={() => onNavigate?.("build-business")}
                        onViewBookPage={() => window.open(`/books/${book.slug}`, "_blank")}
                        onDelete={() => handleDeleteBook(book.id)}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

        </>
      )}
    </div>
  );
}
