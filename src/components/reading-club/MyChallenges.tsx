import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, CheckCircle2, Loader2, Clock } from "lucide-react";
import type { ChallengeEntry } from "@/pages/ReadingClub";

interface Props {
  entries: ChallengeEntry[];
  onLog: (entryId: string, minutes: number) => Promise<string | null>;
}

export default function MyChallenges({ entries, onLog }: Props) {
  const { toast } = useToast();
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [minutesInput, setMinutesInput] = useState<Record<string, string>>({});

  const today = new Date().toISOString().split("T")[0];

  const handleLog = async (entryId: string) => {
    const mins = parseInt(minutesInput[entryId] || "2", 10);
    if (isNaN(mins) || mins < 1) return;
    setLoggingId(entryId);
    const err = await onLog(entryId, mins);
    if (err) {
      if (err.includes("duplicate") || err.includes("23505")) {
        toast({ title: "Already logged today! ✅" });
      } else {
        toast({ title: "Error", description: err, variant: "destructive" });
      }
    } else {
      toast({ title: "Day logged! 📖" });
    }
    setLoggingId(null);
  };

  return (
    <section className="py-12 border-t border-border">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="font-heading text-2xl font-bold mb-6 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-secondary" /> My Challenges
        </h2>
        <div className="space-y-4">
          {entries.map(entry => {
            const daysLogged = entry.logs.length;
            const loggedToday = entry.logs.some(l => l.log_date === today);
            const pct = Math.min(100, Math.round((daysLogged / 100) * 100));

            return (
              <div key={entry.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-start gap-4 p-5">
                  {entry.book.cover_image_url && (
                    <img
                      src={entry.book.cover_image_url}
                      alt={entry.book.title}
                      className="w-16 h-20 object-cover rounded-lg shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold line-clamp-1">{entry.book.title}</h3>
                    <p className="text-sm text-muted-foreground">{entry.book.author_name}</p>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>{daysLogged} / 100 days</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-secondary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Log today */}
                    <div className="mt-4">
                      {loggedToday ? (
                        <div className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
                          <CheckCircle2 className="h-4 w-4" /> Logged today!
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <Input
                            type="number"
                            min={1}
                            max={120}
                            value={minutesInput[entry.id] ?? "2"}
                            onChange={e => setMinutesInput(prev => ({ ...prev, [entry.id]: e.target.value }))}
                            className="w-20 h-8 text-sm"
                          />
                          <span className="text-xs text-muted-foreground shrink-0">min</span>
                          <Button
                            size="sm"
                            onClick={() => handleLog(entry.id)}
                            disabled={loggingId === entry.id}
                          >
                            {loggingId === entry.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Log Today's Read"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Streak visualization */}
                {daysLogged > 0 && (
                  <div className="border-t border-border px-5 py-3">
                    <p className="text-xs text-muted-foreground mb-2">Reading streak</p>
                    <div className="flex flex-wrap gap-1">
                      {entry.logs.slice(-30).map((log, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-sm bg-secondary/80"
                          title={`${log.log_date}: ${log.minutes_read} min`}
                        />
                      ))}
                      {Array.from({ length: Math.max(0, 30 - Math.min(30, daysLogged)) }).map((_, i) => (
                        <div key={`empty-${i}`} className="w-3 h-3 rounded-sm bg-muted" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
