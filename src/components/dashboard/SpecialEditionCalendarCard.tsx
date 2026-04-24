import { useNavigate } from "react-router-dom";
import { CalendarDays, Zap, ArrowRight } from "lucide-react";
import {
  getUpcomingOccasions,
  weeksUntil,
  daysUntil,
  isInLaunchWindow,
} from "@/lib/special-edition-calendar";

/**
 * Horizontal 3-occasion strip shown on the dashboard.
 * Each chip shows emoji, name, "in N weeks" countdown, ⚡ when in launch window,
 * and a CTA that deep-links into BP-08 with the occasion pre-selected.
 */
export default function SpecialEditionCalendarCard() {
  const navigate = useNavigate();
  const now = new Date();
  const upcoming = getUpcomingOccasions(now, 3);

  const goToBuilder = (occasionId: string) => {
    navigate(`/node-builder/BP-08?occasion=${occasionId}&autostart=1`);
  };

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-secondary/15 p-1.5 text-secondary">
            <CalendarDays className="h-4 w-4" />
          </div>
          <h3 className="font-heading text-sm font-semibold text-foreground">
            🎁 Special Edition Calendar
          </h3>
        </div>
        <button
          onClick={() => navigate("/special-editions-calendar")}
          className="text-xs font-medium text-secondary hover:text-secondary/80 transition-colors inline-flex items-center gap-1"
        >
          View full calendar <ArrowRight className="h-3 w-3" />
        </button>
      </header>

      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {upcoming.map((o) => {
          const wks = weeksUntil(o, now);
          const days = daysUntil(o, now);
          const urgent = isInLaunchWindow(o, now);
          const countdown =
            days <= 14
              ? `in ${days} day${days === 1 ? "" : "s"}`
              : `in ${wks} week${wks === 1 ? "" : "s"}`;

          return (
            <button
              key={o.id}
              onClick={() => goToBuilder(o.id)}
              className={`group relative rounded-xl border-2 p-3.5 text-left transition-all ${
                urgent
                  ? "border-secondary/60 bg-secondary/5 hover:border-secondary"
                  : "border-border bg-background hover:border-secondary/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl leading-none" aria-hidden>
                    {o.emoji}
                  </span>
                  <p className="text-sm font-semibold leading-tight truncate">
                    {o.label}
                  </p>
                </div>
                {urgent && (
                  <span
                    className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-bold"
                    title="Inside launch window"
                  >
                    <Zap className="h-3 w-3" />
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-xs text-muted-foreground">{countdown}</p>

              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-secondary group-hover:gap-1.5 transition-all">
                {urgent ? "Build edition" : "Plan edition"} <ArrowRight className="h-3 w-3" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
