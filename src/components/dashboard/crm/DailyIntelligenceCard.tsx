import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, Users, Mail, MousePointerClick, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DigestPayload {
  digest_date: string;
  new_leads_24h: number;
  top_new_leads: Array<{ id: string; full_name: string; abby_score: number }>;
  hot_leads_total: number;
  hot_leads_delta: number;
  email_opens_24h: number;
  email_clicks_24h: number;
  top_mover: { id: string; full_name: string; score_delta: number } | null;
  recommendation: string;
}

interface Props {
  authorId: string | null;
  onContactClick?: (contactId: string) => void;
}

export default function DailyIntelligenceCard({ authorId, onContactClick }: Props) {
  const [payload, setPayload] = useState<DigestPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!authorId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("crm_daily_digests")
        .select("payload")
        .eq("author_id", authorId)
        .order("digest_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setPayload((data?.payload as any) ?? null);
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [authorId]);

  if (!loaded || !payload) return null;

  const stats = [
    { label: "New leads (24h)", value: payload.new_leads_24h, Icon: Users },
    {
      label: "Hot leads",
      value: `${payload.hot_leads_total}${payload.hot_leads_delta !== 0 ? ` (${payload.hot_leads_delta > 0 ? "+" : ""}${payload.hot_leads_delta})` : ""}`,
      Icon: Flame,
    },
    { label: "Email opens", value: payload.email_opens_24h, Icon: Mail },
    { label: "Email clicks", value: payload.email_clicks_24h, Icon: MousePointerClick },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-secondary" />
        <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
          Today's CRM Intelligence
        </h3>
        <span className="text-[10px] text-muted-foreground ml-auto">{payload.digest_date}</span>
      </div>

      {payload.recommendation && (
        <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-3 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-secondary mb-1">
            ABBY recommends
          </p>
          <p className="text-sm text-foreground leading-relaxed">{payload.recommendation}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {stats.map(({ label, value, Icon }) => (
          <div key={label} className="bg-muted/40 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {payload.top_mover && (
        <div className="flex items-center gap-2 text-sm text-foreground">
          <TrendingUp className="h-4 w-4 text-success" />
          <span className="text-muted-foreground">Top mover:</span>
          <button
            type="button"
            onClick={() => onContactClick?.(payload.top_mover!.id)}
            className="font-medium underline-offset-2 hover:underline"
          >
            {payload.top_mover.full_name}
          </button>
          <span className="text-muted-foreground">+{payload.top_mover.score_delta} pts</span>
        </div>
      )}

      {payload.top_new_leads && payload.top_new_leads.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Top new leads
          </p>
          <div className="flex flex-wrap gap-2">
            {payload.top_new_leads.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onContactClick?.(l.id)}
                className="text-xs bg-muted/60 hover:bg-muted px-2.5 py-1 rounded-full border border-border transition-colors"
              >
                {l.full_name} <span className="text-secondary font-bold">· {l.abby_score}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
