import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Flame } from "lucide-react";

interface LeaderEntry {
  book_title: string;
  author_name: string | null;
  days_logged: number;
}

export default function ReadingLeaderboard() {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Get all entries with their log counts and book info
      const { data: entries } = await supabase
        .from("reading_challenge_entries")
        .select("id, book:books(title, author_name), status")
        .eq("status", "active");

      if (!entries || entries.length === 0) {
        setLoading(false);
        return;
      }

      const entryIds = entries.map((e: any) => e.id);
      const { data: logs } = await supabase
        .from("reading_challenge_daily_logs")
        .select("entry_id")
        .in("entry_id", entryIds);

      // Count logs per entry
      const countMap: Record<string, number> = {};
      (logs || []).forEach((l: any) => {
        countMap[l.entry_id] = (countMap[l.entry_id] || 0) + 1;
      });

      const leaderData: LeaderEntry[] = entries
        .map((e: any) => ({
          book_title: e.book?.title || "Unknown",
          author_name: e.book?.author_name,
          days_logged: countMap[e.id] || 0,
        }))
        .filter((l) => l.days_logged > 0)
        .sort((a, b) => b.days_logged - a.days_logged)
        .slice(0, 10);

      setLeaders(leaderData);
      setLoading(false);
    })();
  }, []);

  if (loading || leaders.length === 0) return null;

  return (
    <section className="py-12 border-t border-border">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="font-heading text-2xl font-bold mb-6 flex items-center gap-2">
          <Trophy className="h-6 w-6 text-secondary" /> Leaderboard
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {leaders.map((entry, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 px-5 py-3 ${i !== leaders.length - 1 ? "border-b border-border" : ""}`}
            >
              <span className={`text-lg font-bold w-8 text-center ${i < 3 ? "text-secondary" : "text-muted-foreground"}`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{entry.book_title}</p>
                <p className="text-xs text-muted-foreground">{entry.author_name}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Flame className={`h-4 w-4 ${i < 3 ? "text-secondary" : "text-muted-foreground"}`} />
                <span className="text-sm font-semibold">{entry.days_logged}</span>
                <span className="text-xs text-muted-foreground">days</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Top readers by consecutive days logged. Keep your streak going!
        </p>
      </div>
    </section>
  );
}
