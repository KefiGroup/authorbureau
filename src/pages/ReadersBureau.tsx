import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import ReadingClubHero from "@/components/reading-club/ReadingClubHero";
import BookCatalog from "@/components/reading-club/BookCatalog";
import MyChallenges from "@/components/reading-club/MyChallenges";
import ReadingLeaderboard from "@/components/reading-club/ReadingLeaderboard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, BookOpen, Library, GraduationCap, Clock, ExternalLink, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CatalogBook {
  id: string;
  title: string;
  author_name: string | null;
  cover_image_url: string | null;
  description: string | null;
  genre: string | null;
  slug: string;
  rating: number | null;
}

export interface ChallengeEntry {
  id: string;
  book_id: string;
  started_at: string;
  status: string;
  book: CatalogBook;
  logs: { log_date: string; minutes_read: number }[];
}

interface Purchase {
  id: string;
  product_id: string;
  product_type: string;
  product_title: string;
  author_id: string;
  created_at: string;
  amount: number;
  currency: string;
}

interface AuthorInfo {
  pen_name: string | null;
  author_slug: string | null;
  photo_url: string | null;
}

const PRODUCT_ICON_MAP: Record<string, any> = {
  homestudy: BookOpen,
  home_study_courses: BookOpen,
  onlinecourse: GraduationCap,
  courses: GraduationCap,
};

export default function ReadersBureau() {
  const [params] = useSearchParams();
  const initialTab = params.get("tab") || "reading-club";

  useDocumentMeta({
    title: "Readers Bureau — Authors Bureau",
    description: "Your reading hub: 100-Day Challenge, My Library, and learning portal.",
  });

  const { user, loading: authLoading } = useAuth();
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Library state
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [authors, setAuthors] = useState<Record<string, AuthorInfo>>({});
  const [libraryLoading, setLibraryLoading] = useState(false);

  const fetchBooks = useCallback(async () => {
    const { data } = await supabase
      .from("books")
      .select("id, title, author_name, cover_image_url, description, genre, slug, rating")
      .not("published_at", "is", null)
      .order("title")
      .limit(100);
    setBooks(data || []);
  }, []);

  const fetchEntries = useCallback(async () => {
    if (!user) { setEntries([]); return; }
    const { data } = await supabase
      .from("reading_challenge_entries")
      .select("id, book_id, started_at, status, book:books(id, title, author_name, cover_image_url, description, genre, slug, rating)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!data) { setEntries([]); return; }

    const entryIds = data.map((e: any) => e.id);
    const { data: logs } = await supabase
      .from("reading_challenge_daily_logs")
      .select("entry_id, log_date, minutes_read")
      .in("entry_id", entryIds.length > 0 ? entryIds : ["__none__"])
      .order("log_date", { ascending: true });

    const logsByEntry = (logs || []).reduce((acc: Record<string, any[]>, l: any) => {
      (acc[l.entry_id] = acc[l.entry_id] || []).push(l);
      return acc;
    }, {});

    setEntries(
      data.map((e: any) => ({
        ...e,
        book: e.book,
        logs: logsByEntry[e.id] || [],
      }))
    );
  }, [user]);

  const fetchPurchases = useCallback(async () => {
    if (!user) return;
    setLibraryLoading(true);
    const { data: sessionData } = await sharedSupabase.auth.getSession();
    const email = sessionData?.session?.user?.email;
    if (!email) { setLibraryLoading(false); return; }

    const { data, error } = await supabase.functions.invoke("reader-purchases", {
      body: { email },
      headers: sessionData?.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : undefined,
    });

    if (error || !data?.purchases) { setLibraryLoading(false); return; }
    setPurchases(data.purchases);

    const authorIds = [...new Set(data.purchases.map((p: Purchase) => p.author_id))] as string[];
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("author_profiles_public" as any)
        .select("user_id, pen_name, author_slug, photo_url")
        .in("user_id", authorIds);
      if (profiles) {
        const authorMap: Record<string, AuthorInfo> = {};
        profiles.forEach((p: any) => {
          authorMap[p.user_id] = { pen_name: p.pen_name, author_slug: p.author_slug, photo_url: p.photo_url };
        });
        setAuthors(authorMap);
      }
    }
    setLibraryLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBooks().then(() => setLoading(false));
  }, [fetchBooks]);

  useEffect(() => {
    if (!authLoading) {
      fetchEntries();
      fetchPurchases();
    }
  }, [authLoading, user, fetchEntries, fetchPurchases]);

  const getToken = useCallback(async () => {
    const { data: sessionData } = await sharedSupabase.auth.getSession();
    return sessionData?.session?.access_token || null;
  }, []);

  const startChallenge = async (bookId: string) => {
    if (!user) return "Please sign in first";
    const token = await getToken();
    if (!token) return "Not authenticated";

    const { data, error: fnErr } = await supabase.functions.invoke("reading-challenge", {
      body: { action: "start-challenge", bookId },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (fnErr || data?.error) return data?.error || "Failed to start challenge";
    await fetchEntries();
    return null;
  };

  const logToday = async (entryId: string, minutes: number) => {
    const token = await getToken();
    if (!token) return "Not authenticated";

    const { data, error: fnErr } = await supabase.functions.invoke("reading-challenge", {
      body: { action: "log-reading", entryId, minutes },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (fnErr || data?.error) return data?.error || "Failed to log reading";
    await fetchEntries();
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const activeEntryBookIds = new Set(entries.filter(e => e.status === "active").map(e => e.book_id));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative py-16 lg:py-20">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-secondary/10 p-4">
              <BookOpen className="h-10 w-10 text-secondary" />
            </div>
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight lg:text-5xl mb-4">
            Readers <span className="text-gradient-gold">Bureau</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your reading hub — take on challenges, access your library, and continue your learning journey.
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="container max-w-6xl px-4 pb-16">
        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-8">
            <TabsTrigger value="reading-club" className="gap-1.5 text-xs sm:text-sm">
              <BookOpen className="h-4 w-4" /> Reading Club
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-1.5 text-xs sm:text-sm">
              <Library className="h-4 w-4" /> My Library
            </TabsTrigger>
            <TabsTrigger value="learning" className="gap-1.5 text-xs sm:text-sm">
              <GraduationCap className="h-4 w-4" /> My Learning
            </TabsTrigger>
          </TabsList>

          {/* Reading Club Tab */}
          <TabsContent value="reading-club">
            <ReadingClubHero user={user} activeCount={entries.filter(e => e.status === "active").length} />
            {user && entries.filter(e => e.status === "active").length > 0 && (
              <MyChallenges entries={entries.filter(e => e.status === "active")} onLog={logToday} />
            )}
            <BookCatalog
              books={books}
              user={user}
              activeEntryBookIds={activeEntryBookIds}
              onStartChallenge={startChallenge}
            />
            <ReadingLeaderboard />
          </TabsContent>

          {/* My Library Tab */}
          <TabsContent value="library">
            {!user ? (
              <div className="text-center py-16 space-y-4">
                <Library className="h-16 w-16 text-muted-foreground/30 mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">Sign in to access your library</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Your purchased courses and learning materials will appear here.
                </p>
                <Button asChild size="lg">
                  <Link to="/readers-bureau/auth">
                    <LogIn className="mr-2 h-4 w-4" /> Sign In as Reader
                  </Link>
                </Button>
              </div>
            ) : libraryLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <Library className="h-16 w-16 text-muted-foreground/30 mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">No purchases yet</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  When you purchase a course or home study program from an author, it will appear here.
                </p>
                <Button asChild variant="outline">
                  <Link to="/directory">
                    Browse Authors <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <LibraryGrid purchases={purchases} authors={authors} />
            )}
          </TabsContent>

          {/* My Learning Tab */}
          <TabsContent value="learning">
            {!user ? (
              <div className="text-center py-16 space-y-4">
                <GraduationCap className="h-16 w-16 text-muted-foreground/30 mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">Sign in to access your learning</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Track your progress on purchased courses and home study programs.
                </p>
                <Button asChild size="lg">
                  <Link to="/readers-bureau/auth">
                    <LogIn className="mr-2 h-4 w-4" /> Sign In as Reader
                  </Link>
                </Button>
              </div>
            ) : libraryLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : purchases.filter(p => ["home_study_courses", "homestudy", "courses", "onlinecourse"].includes(p.product_type)).length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <GraduationCap className="h-16 w-16 text-muted-foreground/30 mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">No active learning programs</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Purchase a home study or online course from any author to start learning.
                </p>
                <Button asChild variant="outline">
                  <Link to="/directory">
                    Browse Authors <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {purchases
                  .filter(p => ["home_study_courses", "homestudy", "courses", "onlinecourse"].includes(p.product_type))
                  .map((purchase) => {
                    const author = authors[purchase.author_id];
                    const IconComponent = PRODUCT_ICON_MAP[purchase.product_type] || BookOpen;

                    return (
                      <Link
                        key={purchase.id}
                        to={["courses", "onlinecourse"].includes(purchase.product_type) ? `/readers-bureau/course/${purchase.id}` : `/readers-bureau/learn/${purchase.id}`}
                        className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all"
                      >
                        <div className="bg-primary/5 p-6 flex items-center justify-center">
                          <IconComponent className="h-12 w-12 text-primary/60 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="p-5 space-y-2">
                          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {purchase.product_title}
                          </h3>
                          {author && (
                            <p className="text-sm text-muted-foreground">
                              by {author.pen_name || "Author"}
                            </p>
                          )}
                          <p className="text-xs font-medium text-primary">
                            Continue Learning →
                          </p>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}

/* Library grid with book covers */
function LibraryGrid({ purchases, authors }: { purchases: Purchase[]; authors: Record<string, AuthorInfo> }) {
  const [covers, setCovers] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchCovers() {
      const productIds = purchases.map(p => p.product_id);
      if (productIds.length === 0) return;

      // Try home_study_courses first
      const { data: hscs } = await supabase
        .from("home_study_courses")
        .select("id, book_id, cover_image_url")
        .in("id", productIds);

      const coverMap: Record<string, string> = {};
      const bookIdsToFetch: string[] = [];

      (hscs || []).forEach((hsc: any) => {
        if (hsc.cover_image_url) {
          coverMap[hsc.id] = hsc.cover_image_url;
        } else if (hsc.book_id) {
          bookIdsToFetch.push(hsc.book_id);
        }
      });

      if (bookIdsToFetch.length > 0) {
        const { data: books } = await supabase
          .from("books")
          .select("id, cover_image_url")
          .in("id", bookIdsToFetch);

        const bookCoverMap: Record<string, string> = {};
        (books || []).forEach((b: any) => {
          if (b.cover_image_url) bookCoverMap[b.id] = b.cover_image_url;
        });

        (hscs || []).forEach((hsc: any) => {
          if (!coverMap[hsc.id] && hsc.book_id && bookCoverMap[hsc.book_id]) {
            coverMap[hsc.id] = bookCoverMap[hsc.book_id];
          }
        });
      }

      setCovers(coverMap);
    }
    fetchCovers();
  }, [purchases]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {purchases.map((purchase) => {
        const author = authors[purchase.author_id];
        const coverUrl = covers[purchase.product_id];

        return (
          <Link
            key={purchase.id}
            to={["courses", "onlinecourse"].includes(purchase.product_type) ? `/readers-bureau/course/${purchase.id}` : `/readers-bureau/learn/${purchase.id}`}
            className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all"
          >
            <div className="bg-primary/5 p-6 flex items-center justify-center h-48">
              {coverUrl ? (
                <img src={coverUrl} alt={purchase.product_title} className="h-full w-auto object-contain rounded-md shadow-md" />
              ) : (
                <BookOpen className="h-16 w-16 text-primary/30" />
              )}
            </div>
            <div className="p-5 space-y-2">
              <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {purchase.product_title}
              </h3>
              {author && (
                <p className="text-sm text-muted-foreground">
                  by {author.pen_name || "Author"}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Purchased {new Date(purchase.created_at).toLocaleDateString()}
              </div>
              <p className="text-xs font-medium text-primary mt-1">
                Access Content →
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
