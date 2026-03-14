import { useEffect, useState } from "react";
import { useParams, useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import {
  BookOpen, Flame, ArrowLeft, CheckCircle2, Clock, Loader2,
  Calendar, BarChart3, Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface PortalContext {
  readerProfile: { id: string; display_name: string | null } | null;
}

interface ChallengeDetail {
  id: string;
  book_id: string;
  start_date: string;
  target_days: number;
  current_streak: number;
  longest_streak: number;
  total_days_read: number;
  status: string;
  completed_at: string | null;
}

interface BookInfo {
  id: string;
  title: string;
  author_name: string | null;
  cover_image_url: string | null;
  description: string | null;
  genre: string | null;
}

interface LogEntry {
  id: string;
  log_date: string;
  minutes_read: number;
  notes: string | null;
}

export default function PortalChallengeDetail() {
  const { challengeId } = useParams();
  const { readerProfile } = useOutletContext<PortalContext>();
  const { toast } = useToast();
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [book, setBook] = useState<BookInfo | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingToday, setLoggingToday] = useState(false);
  const [minutes, setMinutes] = useState("2");
  const [notes, setNotes] = useState("");

  useDocumentMeta({
    title: `Challenge | Authors Bureau`,
    description: "Track your 100-day reading challenge progress.",
  });

  const today = new Date().toISOString().split("T")[0];

  async function fetchData() {
    if (!challengeId || !readerProfile) return;
    setLoading(true);

    const { data: ch } = await supabase.from("reading_challenges")
      .select("*").eq("id", challengeId).maybeSingle();
    if (!ch) { setLoading(false); return; }
    setChallenge(ch);

    const [bookRes, logsRes] = await Promise.all([
      supabase.from("books").select("id, title, author_name, cover_image_url, description, genre").eq("id", ch.book_id).maybeSingle(),
      supabase.from("reading_logs").select("id, log_date, minutes_read, notes").eq("challenge_id", challengeId).order("log_date", { ascending: false }),
    ]);
    setBook(bookRes.data);
    setLogs(logsRes.data || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [challengeId, readerProfile]);

  const loggedToday = logs.some(l => l.log_date === today);

  const handleLogToday = async () => {
    if (!readerProfile || !challengeId) return;
    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins < 1) return;
    setLoggingToday(true);
    const { error } = await supabase.from("reading_logs").insert({
      challenge_id: challengeId,
      reader_id: readerProfile.id,
      minutes_read: mins,
      notes: notes.trim() || null,
    });
    if (error) {
      if (error.code === "23505") toast({ title: "Already logged today! ✅" });
      else toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reading logged! 📖" });
      setNotes("");
      fetchData();
    }
    setLoggingToday(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!challenge || !book) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Challenge not found.</p>
        <Link to="/portal/reading-club" className="text-[hsl(var(--accent))] hover:underline text-sm mt-2 inline-block">← Back to Reading Club</Link>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((challenge.total_days_read / challenge.target_days) * 100));

  // Build heatmap data (100 days from start)
  const startDate = new Date(challenge.start_date);
  const logDates = new Set(logs.map(l => l.log_date));
  const heatmapDays: { date: string; logged: boolean; isToday: boolean }[] = [];
  for (let i = 0; i < challenge.target_days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    heatmapDays.push({ date: dateStr, logged: logDates.has(dateStr), isToday: dateStr === today });
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Back link */}
      <Link to="/portal/reading-club" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Reading Club
      </Link>

      {/* Header */}
      <div className="flex items-start gap-5">
        {book.cover_image_url && (
          <img src={book.cover_image_url} alt="" className="w-24 h-32 object-cover rounded-xl shadow-md shrink-0" />
        )}
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-foreground">{book.title}</h1>
          <p className="text-muted-foreground">{book.author_name}</p>
          {book.genre && <span className="inline-block mt-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{book.genre}</span>}

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-bold">{challenge.current_streak}</span>
              <span className="text-xs text-muted-foreground">streak</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-secondary" />
              <span className="text-sm font-bold">{challenge.longest_streak}</span>
              <span className="text-xs text-muted-foreground">best</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-[hsl(var(--accent))]" />
              <span className="text-sm font-bold">{challenge.total_days_read}</span>
              <span className="text-xs text-muted-foreground">/ {challenge.target_days} days</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-[hsl(var(--accent))] transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{pct}% complete</p>
          </div>
        </div>
      </div>

      {/* Log Today */}
      {challenge.status === "active" && !loggedToday && (
        <div className="bg-card border-2 border-[hsl(var(--accent))]/30 rounded-xl p-6 space-y-4">
          <h3 className="font-heading font-bold text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[hsl(var(--accent))]" /> Did you read today?
          </h3>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input type="number" min={1} max={120} value={minutes} onChange={e => setMinutes(e.target.value)} className="w-20 h-9" />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          </div>
          <Textarea placeholder="Any reflections? (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="resize-none" />
          <Button
            onClick={handleLogToday}
            disabled={loggingToday}
            className="bg-[hsl(var(--accent))] hover:bg-[hsl(174,84%,24%)] text-white"
          >
            {loggingToday ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Log Reading
          </Button>
        </div>
      )}

      {loggedToday && challenge.status === "active" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">You've logged today's reading! Keep the streak going tomorrow.</p>
        </div>
      )}

      {challenge.status === "completed" && (
        <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-5 text-center">
          <Trophy className="h-8 w-8 text-secondary mx-auto mb-2" />
          <h3 className="font-heading font-bold text-lg">Challenge Complete! 🎉</h3>
          <p className="text-sm text-muted-foreground">You finished the 100-Day Reading Challenge. Incredible dedication!</p>
        </div>
      )}

      {/* Calendar Heatmap */}
      <section>
        <h3 className="font-heading font-bold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" /> Challenge Calendar
        </h3>
        <div className="bg-card border border-border rounded-xl p-4 overflow-x-auto">
          <div className="flex flex-wrap gap-1 min-w-[300px]">
            {heatmapDays.map((day, i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-sm transition-colors ${
                  day.isToday
                    ? day.logged ? "bg-[hsl(var(--accent))] ring-2 ring-[hsl(var(--accent))]/40" : "bg-muted ring-2 ring-amber-400/60"
                    : day.logged ? "bg-[hsl(var(--accent))]/80" : "bg-muted"
                }`}
                title={`Day ${i + 1}: ${day.date}${day.logged ? " ✓" : ""}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-muted" /> Missed</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[hsl(var(--accent))]/80" /> Read</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-muted ring-2 ring-amber-400/60" /> Today</div>
          </div>
        </div>
      </section>

      {/* Reading History */}
      <section>
        <h3 className="font-heading font-bold mb-3">Reading History</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reading logs yet. Start by logging today!</p>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border max-h-80 overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--accent))] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{new Date(log.log_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                    <span className="text-xs text-muted-foreground">{log.minutes_read} min</span>
                  </div>
                  {log.notes && <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* About this book */}
      {book.description && (
        <section>
          <h3 className="font-heading font-bold mb-3">About This Book</h3>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">{book.description}</p>
          </div>
        </section>
      )}
    </div>
  );
}
