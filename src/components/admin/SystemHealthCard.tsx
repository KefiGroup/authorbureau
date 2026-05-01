import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { adminDataFetch } from "@/lib/admin-data-fetch";

interface HealthData {
  secrets: Record<string, boolean>;
  crons: {
    last_payout_at: string | null;
    last_statement_at: string | null;
    last_statement_year: number | null;
    last_email_sync_at: string | null;
  };
  error_count_24h: number;
  unresolved_critical?: number;
  recent_activity: { event_key: string; created_at: string; target_type?: string | null; payload?: Record<string, unknown> | null }[];
}

const SECRET_LABELS: Record<string, string> = {
  stripe: "Stripe",
  stripe_webhook: "Stripe Webhook",
  resend: "Resend (Email)",
  elevenlabs: "ElevenLabs (TTS)",
  buffer: "Buffer (Social)",
  lovable_ai: "Lovable AI",
  perplexity: "Perplexity",
  firecrawl: "Firecrawl",
};

function fmtAgo(iso: string | null): string {
  if (!iso) return "never";
  try { return format(new Date(iso), "MMM d, yyyy HH:mm"); } catch { return "unknown"; }
}

export default function SystemHealthCard() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    adminDataFetch("system-health")
      .then((res) => { if (alive) setData(res as HealthData); })
      .catch(() => { /* silent */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <Card className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading system health…
      </Card>
    );
  }
  if (!data) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">System health unavailable.</Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-secondary" />
          <h3 className="font-heading font-bold">System Health</h3>
        </div>
        {data.unresolved_critical && data.unresolved_critical > 0 ? (
          <a href="/admin?tab=errors" className="no-underline">
            <Badge variant="destructive">{data.unresolved_critical} unresolved critical</Badge>
          </a>
        ) : data.error_count_24h > 0 ? (
          <a href="/admin?tab=errors" className="no-underline">
            <Badge className="bg-amber-600 hover:bg-amber-700">{data.error_count_24h} errors / 24h</Badge>
          </a>
        ) : (
          <Badge className="bg-emerald-600 hover:bg-emerald-700">All clear</Badge>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Connectors</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {Object.entries(data.secrets).map(([key, ok]) => (
            <div
              key={key}
              className={`flex items-center gap-1.5 rounded px-2 py-1.5 border ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-destructive/30 bg-destructive/5 text-destructive"}`}
            >
              {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              <span className="truncate">{SECRET_LABELS[key] ?? key}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Last Cron Runs</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <div className="bg-muted/40 rounded px-2 py-1.5">
            <div className="text-muted-foreground">Monthly payouts</div>
            <div className="font-medium">{fmtAgo(data.crons.last_payout_at)}</div>
          </div>
          <div className="bg-muted/40 rounded px-2 py-1.5">
            <div className="text-muted-foreground">Annual statements</div>
            <div className="font-medium">
              {data.crons.last_statement_year ? `${data.crons.last_statement_year} · ` : ""}
              {fmtAgo(data.crons.last_statement_at)}
            </div>
          </div>
          <div className="bg-muted/40 rounded px-2 py-1.5">
            <div className="text-muted-foreground">Last email sync</div>
            <div className="font-medium">{fmtAgo(data.crons.last_email_sync_at)}</div>
          </div>
        </div>
      </div>

      {data.recent_activity.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Admin Activity</p>
          <div className="space-y-1 max-h-40 overflow-auto">
            {data.recent_activity.slice(0, 8).map((a, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                <span className="font-mono text-[11px]">{a.event_key}</span>
                <span className="text-muted-foreground">{format(new Date(a.created_at), "MMM d HH:mm")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
