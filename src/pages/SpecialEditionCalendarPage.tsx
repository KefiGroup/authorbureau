import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  CALENDAR_OCCASIONS,
  MONTH_LABELS,
  occasionsByMonth,
  weeksUntil,
  daysUntil,
  isInLaunchWindow,
  nextOccurrence,
  type CalendarOccasion,
} from "@/lib/special-edition-calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, CalendarDays, MousePointerClick, Sparkles, Library, Package } from "lucide-react";

type OccasionStatus = "not-started" | "drafted" | "live-portal" | "live-amazon";

interface OccasionMeta {
  status: OccasionStatus;
  revenueLastYear: number;
}

const STATUS_LABEL: Record<OccasionStatus, string> = {
  "not-started": "Not started",
  drafted: "Drafted",
  "live-portal": "Live on Portal",
  "live-amazon": "Live on Amazon",
};

const STATUS_CLS: Record<OccasionStatus, string> = {
  "not-started": "bg-muted text-muted-foreground",
  drafted: "bg-secondary/15 text-secondary",
  "live-portal": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "live-amazon": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export default function SpecialEditionCalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [meta, setMeta] = useState<Record<string, OccasionMeta>>({});

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      // Find author profile
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile || cancelled) return;

      // Load BP-08 nodes for this author
      const { data: nodes } = await supabase
        .from("author_nodes")
        .select("status, content_json, activated_at, revenue_to_date")
        .eq("author_id", profile.id)
        .eq("node_id", "BP-08");

      if (cancelled || !nodes) return;

      const lastYear = new Date().getFullYear() - 1;
      const next: Record<string, OccasionMeta> = {};
      for (const o of CALENDAR_OCCASIONS) {
        next[o.id] = { status: "not-started", revenueLastYear: 0 };
      }
      for (const n of nodes as any[]) {
        const cj = n.content_json || {};
        const occId = cj.occasion as string | undefined;
        if (!occId || !next[occId]) continue;
        // Status precedence: live-amazon > live-portal > drafted > not-started
        if (n.status === "live") {
          if (cj.amazon_listing_published) next[occId].status = "live-amazon";
          else if (next[occId].status !== "live-amazon") next[occId].status = "live-portal";
        } else if (next[occId].status === "not-started") {
          next[occId].status = "drafted";
        }
        // Sum prior-year revenue
        const activatedYear = n.activated_at ? new Date(n.activated_at).getFullYear() : null;
        if (activatedYear === lastYear) {
          next[occId].revenueLastYear += Number(n.revenue_to_date || 0);
        }
      }
      setMeta(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const goToBuilder = (id: string) => {
    navigate(`/node-builder/BP-08?occasion=${id}&autostart=1`);
  };

  const grouped = occasionsByMonth();
  const now = new Date();

  return (
    <DashboardLayout>
      <div className="max-w-6xl space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-secondary" />
              Special Edition Calendar
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Plan your year of themed editions. Abby will nudge you 8 and 4 weeks
              before each peak window so you have time for Amazon print + marketing
              runway.
            </p>
          </div>
          <button
            onClick={() => navigate("/node-builder/BP-08")}
            className="text-xs font-semibold text-secondary hover:underline"
          >
            Open BP-08 builder →
          </button>
        </header>

        {/* How the workflow works */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-heading text-sm font-bold text-foreground mb-3">
            How a special edition gets built
          </h2>
          <ol className="grid gap-3 sm:grid-cols-4">
            {[
              { icon: MousePointerClick, title: "1. Click a date", body: "Pick any occasion below. Each tile deep-links into the BP-08 builder pre-loaded with that theme." },
              { icon: Sparkles, title: "2. Abby designs", body: "Abby auto-generates 3 themed edition tiers, a bundle, pricing ladder, and sales-page copy in 20-40s." },
              { icon: Library, title: "3. Save to library", body: "Review, tweak the price or copy, then save. The edition lives in your private library, ready to quote." },
              { icon: Package, title: "4. Take orders", body: "Quote gift buyers from your library, print-and-sign yourself, ship direct. You keep 100% off-platform." },
            ].map((s, i) => (
              <li key={i} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="rounded-md bg-secondary/15 p-1.5 text-secondary">
                    <s.icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs font-bold text-foreground">{s.title}</p>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* 12-month grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
            const occs = grouped[month] || [];
            const isCurrentMonth = month === now.getMonth() + 1;
            return (
              <div
                key={month}
                className={`rounded-2xl border bg-card p-4 ${
                  isCurrentMonth
                    ? "border-secondary/60 ring-1 ring-secondary/20"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading text-sm font-bold text-foreground">
                    {MONTH_LABELS[month - 1]}
                  </h3>
                  {isCurrentMonth && (
                    <Badge className="bg-secondary text-secondary-foreground text-[10px]">
                      This month
                    </Badge>
                  )}
                </div>

                {occs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No major occasions
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {occs.map((o) => (
                      <OccasionRow
                        key={o.id}
                        occasion={o}
                        meta={meta[o.id]}
                        onClick={() => goToBuilder(o.id)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          <p className="leading-relaxed">
            <strong className="text-foreground">How this works:</strong> Each
            edition you generate from BP-08 publishes to two channels — your{" "}
            <strong>Portal</strong> (with author-only digital extras) and your{" "}
            <strong>Amazon listing pack</strong> (a copy-paste-ready KDP bundle).
            Live editions on either channel earn revenue tracked here for next
            year's plan.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

function OccasionRow({
  occasion,
  meta,
  onClick,
}: {
  occasion: CalendarOccasion;
  meta?: OccasionMeta;
  onClick: () => void;
}) {
  const now = new Date();
  const wks = weeksUntil(occasion, now);
  const days = daysUntil(occasion, now);
  const urgent = isInLaunchWindow(occasion, now);
  const peak = nextOccurrence(occasion, now);
  const status = meta?.status || "not-started";
  const revenue = meta?.revenueLastYear || 0;

  return (
    <li>
      <button
        onClick={onClick}
        className="w-full rounded-lg border border-border bg-background p-2.5 text-left hover:border-secondary/40 transition-colors group"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg leading-none" aria-hidden>
              {occasion.emoji}
            </span>
            <span className="text-sm font-semibold truncate">
              {occasion.label}
            </span>
          </div>
          {urgent && (
            <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          )}
        </div>

        <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-muted-foreground">
            Peak {peak.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
            {days <= 14 ? `${days}d` : `${wks}wk`}
          </span>
          <span
            className={`rounded-full px-1.5 py-0.5 font-medium ${STATUS_CLS[status]}`}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>

        {revenue > 0 && (
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            ${revenue.toLocaleString()} earned last year
          </p>
        )}

        <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
          {status === "not-started" ? "Generate edition" : "Open builder"}{" "}
          <ArrowRight className="h-3 w-3" />
        </div>
      </button>
    </li>
  );
}
