import { ArrowRight, Sparkles, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getStudioPath } from "@/config/abbyFrameworkConfig";
import type { BookNodeProgress } from "@/hooks/useBookNodeProgress";
import { ACCENT_CLASSES } from "./categoryAccent";

interface Props {
  bookId: string;
  bookTitle: string;
  progress: BookNodeProgress;
  onJumpTab: (tab: string) => void;
}

export default function BookHubHeroStrip({ bookId, bookTitle, progress, onJumpTab }: Props) {
  const navigate = useNavigate();
  const next = progress.continueWhereYouLeftOff;

  const pct = progress.overallTotal === 0 ? 0 : Math.round((progress.overallCompleted / progress.overallTotal) * 100);

  const handleContinue = () => {
    if (!next) return;
    const titleParam = bookTitle ? `&bookTitle=${encodeURIComponent(bookTitle)}` : "";
    const path = getStudioPath(next.id, bookId, titleParam);
    if (path) navigate(path);
    else onJumpTab(next.category);
  };

  const stages = [
    { id: "revenue-streams", label: "Brand", accent: ACCENT_CLASSES.brand, c: progress.byCategory["revenue-streams"] },
    { id: "marketing-channels", label: "Build", accent: ACCENT_CLASSES.build, c: progress.byCategory["marketing-channels"] },
    { id: "authority-builders", label: "Yield", accent: ACCENT_CLASSES.yield, c: progress.byCategory["authority-builders"] },
  ];

  return (
    <div className="rounded-2xl border-2 border-secondary/20 bg-gradient-to-br from-secondary/5 via-transparent to-secondary/5 p-5 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-5">
        {/* Left: progress summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-4 w-4 text-secondary" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary">
              {progress.overallCompleted} of {progress.overallTotal} products built · {pct}% complete
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
            {stages.map((s) => {
              const widthPct = (s.c.total / progress.overallTotal) * 100;
              const fillPct = s.c.total === 0 ? 0 : (s.c.completed / s.c.total) * 100;
              return (
                <div key={s.id} className="h-full" style={{ width: `${widthPct}%` }}>
                  <div className={`h-full ${s.accent.bg}`} style={{ width: `${fillPct}%` }} />
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {stages.map((s) => (
              <button
                key={s.id}
                onClick={() => onJumpTab(s.id)}
                className={`text-left rounded-lg border ${s.accent.borderSoft} ${s.accent.bgVeryLight} p-2.5 hover:shadow-sm transition`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${s.accent.text}`}>{s.label}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{s.c.completed}/{s.c.total}</span>
                </div>
                <div className="text-[11px] text-foreground/70 mt-0.5 truncate">
                  {s.c.nextStep ? `Next: ${s.c.nextStep.label}` : "All done"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Continue CTA — colored by destination stage */}
        {next && (() => {
          const nextAccent = stages.find((s) => s.id === next.category)?.accent || ACCENT_CLASSES.brand;
          return (
            <div className={`lg:w-[320px] shrink-0 rounded-xl border ${nextAccent.borderSoft} bg-card p-4`}>
              <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] ${nextAccent.text} mb-1`}>
                <Sparkles className="h-3 w-3" /> Continue Where You Left Off
              </div>
              <div className="text-sm font-semibold text-foreground truncate">{next.label}</div>
              <div className="text-[11px] text-muted-foreground font-mono">
                {next.code} · {stages.find((s) => s.id === next.category)?.label}
              </div>
              <Button size="sm" className={`mt-2 w-full ${nextAccent.buttonBg} gap-1.5`} onClick={handleContinue}>
                {next.state === "in-progress" ? "Resume Building" : "Start Building"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
