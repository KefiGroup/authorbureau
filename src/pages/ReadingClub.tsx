import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import ReadingClubHero from "@/components/reading-club/ReadingClubHero";
import BookCatalog from "@/components/reading-club/BookCatalog";
import MyChallenges from "@/components/reading-club/MyChallenges";
import ReadingLeaderboard from "@/components/reading-club/ReadingLeaderboard";
import { Loader2 } from "lucide-react";

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

export default function ReadingClub() {
  useDocumentMeta({
    title: "100-Day Reading Challenge — Authors Bureau",
    description: "Pick any book, commit to 2 minutes of reading a day for 100 days. We'll be your accountability partner.",
  });

  const { user, loading: authLoading } = useAuth();
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [loading, setLoading] = useState(true);

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

    // Fetch logs for all entries
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

  // Fetch books immediately (public), entries when auth resolves
  useEffect(() => {
    fetchBooks().then(() => setLoading(false));
  }, [fetchBooks]);

  useEffect(() => {
    if (!authLoading) fetchEntries();
  }, [authLoading, user, fetchEntries]);

  const startChallenge = async (bookId: string) => {
    if (!user) return;
    const { error } = await supabase.from("reading_challenge_entries").insert({
      user_id: user.id,
      book_id: bookId,
    });
    if (error) return error.message;
    await fetchEntries();
    return null;
  };

  const logToday = async (entryId: string, minutes: number) => {
    const { error } = await supabase.from("reading_challenge_daily_logs").insert({
      entry_id: entryId,
      minutes_read: minutes,
    });
    if (error) return error.message;
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

      <Footer />
    </div>
  );
}
