import { useEffect, useState, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import {
  BookOpen, Flame, Trophy, Loader2, CheckCircle2, Clock,
  Search, Star, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface PortalContext {
  readerProfile: { id: string; display_name: string | null; avatar_url: string | null } | null;
  user: { id: string };
}

interface CatalogBook {
  id: string;
  title: string;
  author_name: string | null;
  cover_image_url: string | null;
  genre: string | null;
  slug: string;
}

interface Challenge {
  id: string;
  book_id: string;
  start_date: string;
  target_days: number;
  current_streak: number;
  longest_streak: number;
  total_days_read: number;
  status: string;
  book: CatalogBook;
}

interface ReadingLog {
  log_date: string;
  minutes_read: number;
}

const ALL_BADGES = [
  { type: "first_log", name: "First Page", icon: "📖" },
  { type: "streak_7", name: "Week Warrior", icon: "🔥" },
  { type: "streak_30", name: "Monthly Master", icon: "⭐" },
  { type: "streak_100", name: "Century Champion", icon: "🏆" },
  { type: "books_3", name: "Bookworm", icon: "📚" },
  { type: "books_10", name: "Library Legend", icon: "🏛️" },
  { type: "first_review", name: "Voice Heard", icon: "💬" },
  { type: "first_purchase", name: "Invested Reader", icon: "💰" },
];

export default function PortalReadingClub() {
  useDocumentMeta({
    title: "Reading Club | Authors Bureau",
    description: "Pick any book, read 2 minutes a day for 100 days.",
  });

  const { readerProfile } = useOutletContext<PortalContext>();
  const { toast } = useToast();
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeLogs, setChallengeLogs] = useState<Record<string, ReadingLog[]>>({});
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [minutesInput, setMinutesInput] = useState<Record<string, string>>({});
  const [startingBookId, setStartingBookId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const fetchData = useCallback(async () => {
    if (!readerProfile) return;
    setLoading(true);

    const [booksRes, challengesRes, badgesRes] = await Promise.all([
      supabase.from("books").select("id, title, author_name, cover_image_url, genre, slug")
        .not("published_at", "is", null).order("title").limit(200),
      supabase.from("reading_challenges")
        .select("id, book_id, start_date, target_days, current_streak, longest_streak, total_days_read, status")
        .eq("reader_id", readerProfile.id)
        .order("created_at", { ascending: false }),
      supabase.from("reader_badges").select("badge_type").eq("reader_id", readerProfile.id),
    ]);

    setBooks(booksRes.data || []);
    setEarnedBadges((badgesRes.data || []).map((b: any) => b.badge_type));

    const challengeData = challengesRes.data || [];
    // Attach book info
    const bookMap = new Map((booksRes.data || []).map((b: any) => [b.id, b]));
    const enriched = challengeData
      .map((c: any) => ({ ...c, book: bookMap.get(c.book_id) }))
      .filter((c: any) => c.book);
    setChallenges(enriched);

    // Fetch logs for active challenges
    const activeIds = enriched.filter((c: any) => c.status === "active").map((c: any) => c.id);
    if (activeIds.length > 0) {
      const { data: logs } = await supabase.from("reading_logs")
        .select("challenge_id, log_date, minutes_read")
        .in("challenge_id", activeIds)
        .order("log_date", { ascending: true });
      const grouped: Record<string, ReadingLog[]> = {};
      (logs || []).forEach((l: any) => {
        (grouped[l.challenge_id] = grouped[l.challenge_id] || []).push(l);
      });
      setChallengeLogs(grouped);
    }

    // Leaderboard
    const { data: lb } = await supabase.rpc("get_reading_leaderboard", { limit_count: 10 });
    setLeaderboard(lb || []);

    setLoading(false);
  }, [readerProfile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const startChallenge = async (bookId: string) => {
    if (!readerProfile) return;
    setStartingBookId(bookId);
    const { error } = await supabase.from("reading_challenges").insert({
      reader_id: readerProfile.id,
      book_id: bookId,
    });
    if (error) {
      toast({ title: "Error starting challenge", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Challenge started! 🎉", description: "Read 2 minutes today to begin your streak." });
      fetchData();
    }
    setStartingBookId(null);
  };

  const logReading = async (challengeId: string) => {
    if (!readerProfile) return;
    const mins = parseInt(minutesInput[challengeId] || "2", 10);
    if (isNaN(mins) || mins < 1) return;
    setLoggingId(challengeId);
    const { error } = await supabase.from("reading_logs").insert({
      challenge_id: challengeId,
      reader_id: readerProfile.id,
      minutes_read: mins,
    });
    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") {
        toast({ title: "Already logged today! ✅" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Reading logged! 📖", description: `${mins} minutes recorded.` });
      fetchData();
    }
    setLoggingId(null);
  };

  const activeChallenges = challenges.filter(c => c.status === "active");
  const activeChallengeBookIds = new Set(activeChallenges.map(c => c.book_id));
  const filteredBooks = books.filter(b =>
    !searchQuery || b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.author_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Hero */}
      <section className="bg-[hsl(219,47%,14%)] text-white py-12 lg:py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[hsl(var(--accent))]/20 mb-5">
            <BookOpen className="h-7 w-7 text-[hsl(var(--accent))]" />
          </div>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold mb-3">
            100-Day Reading Challenge
          </h1>
          <p className="text-white/70 max-w-xl mx-auto text-lg">
            Pick any book. Read <strong className="text-white">2 minutes a day</strong>. We'll keep you accountable.
          </p>
          {activeChallenges.length > 0 && (
            <div className="mt-5 inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm">
              <Flame className="h-4 w-4 text-amber-400" />
              <span>{activeChallenges.length} active challenge{activeChallenges.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {/* Active Challenges */}
        {activeChallenges.length > 0 && (
          <section>
            <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500" /> My Active Challenges
            </h2>
            <div className="space-y-4">
              {activeChallenges.map(challenge => {
                const logs = challengeLogs[challenge.id] || [];
                const loggedToday = logs.some(l => l.log_date === today);
                const pct = Math.min(100, Math.round((challenge.total_days_read / challenge.target_days) * 100));

                return (
                  <div key={challenge.id} className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="flex items-start gap-4 p-5">
                      {challenge.book.cover_image_url && (
                        <img src={challenge.book.cover_image_url} alt="" className="w-16 h-20 object-cover rounded-lg shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link to={`/portal/reading-club/challenge/${challenge.id}`} className="font-heading font-semibold hover:text-[hsl(var(--accent))] transition-colors">
                              {challenge.book.title}
                            </Link>
                            <p className="text-sm text-muted-foreground">{challenge.book.author_name}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-amber-500 shrink-0">
                            <Flame className="h-4 w-4" />
                            <span className="font-bold text-sm">{challenge.current_streak}</span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>{challenge.total_days_read} / {challenge.target_days} days</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-[hsl(var(--accent))] transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        {/* Log today */}
                        <div className="mt-4">
                          {loggedToday ? (
                            <div className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                              <CheckCircle2 className="h-4 w-4" /> Logged today!
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                              <Input
                                type="number" min={1} max={120}
                                value={minutesInput[challenge.id] ?? "2"}
                                onChange={e => setMinutesInput(p => ({ ...p, [challenge.id]: e.target.value }))}
                                className="w-20 h-8 text-sm"
                              />
                              <span className="text-xs text-muted-foreground">min</span>
                              <Button
                                size="sm"
                                onClick={() => logReading(challenge.id)}
                                disabled={loggingId === challenge.id}
                                className="bg-[hsl(var(--accent))] hover:bg-[hsl(174,84%,24%)] text-white"
                              >
                                {loggingId === challenge.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log Today's Read"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mini heatmap */}
                    {logs.length > 0 && (
                      <div className="border-t border-border px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {logs.slice(-30).map((log, i) => (
                            <div key={i} className="w-3 h-3 rounded-sm bg-[hsl(var(--accent))]/80" title={`${log.log_date}: ${log.minutes_read}min`} />
                          ))}
                          {Array.from({ length: Math.max(0, 30 - Math.min(30, logs.length)) }).map((_, i) => (
                            <div key={`e-${i}`} className="w-3 h-3 rounded-sm bg-muted" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Browse Books */}
        <section>
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <h2 className="font-heading text-xl font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[hsl(var(--accent))]" /> Browse Books
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search books..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBooks.slice(0, 20).map(book => {
              const hasChallenge = activeChallengeBookIds.has(book.id);
              return (
                <div key={book.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="aspect-[3/4] bg-muted flex items-center justify-center overflow-hidden">
                    {book.cover_image_url ? (
                      <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <h3 className="font-semibold text-sm line-clamp-2 text-foreground">{book.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{book.author_name || "Unknown"}</p>
                    {book.genre && <Badge variant="secondary" className="text-[10px]">{book.genre}</Badge>}
                    {hasChallenge ? (
                      <div className="text-xs text-[hsl(var(--accent))] font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Challenge active
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => startChallenge(book.id)}
                        disabled={startingBookId === book.id}
                        className="w-full bg-[hsl(var(--accent))] hover:bg-[hsl(174,84%,24%)] text-white text-xs h-8"
                      >
                        {startingBookId === book.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Start Challenge"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <section>
            <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-secondary" /> Leaderboard
            </h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="divide-y divide-border">
                {leaderboard.map((entry: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3">
                    <span className={`text-sm font-bold w-6 text-center ${i < 3 ? "text-secondary" : "text-muted-foreground"}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.book_title}</p>
                      <p className="text-xs text-muted-foreground">{entry.author_name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Flame className="h-3.5 w-3.5" />
                      <span className="text-sm font-bold">{entry.days_logged}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* My Badges */}
        <section>
          <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-secondary" /> My Badges
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ALL_BADGES.map(badge => {
              const earned = earnedBadges.includes(badge.type);
              return (
                <div
                  key={badge.type}
                  className={`bg-card border rounded-xl p-4 text-center transition-all ${
                    earned ? "border-secondary/40 shadow-sm" : "border-border opacity-50"
                  }`}
                >
                  <div className="text-3xl mb-2">{earned ? badge.icon : "❓"}</div>
                  <p className={`text-sm font-medium ${earned ? "text-foreground" : "text-muted-foreground"}`}>
                    {badge.name}
                  </p>
                  {earned && (
                    <p className="text-[10px] text-[hsl(var(--accent))] mt-1">Earned!</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
