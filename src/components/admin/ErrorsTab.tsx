import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminDataFetch } from "@/lib/admin-data-fetch";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, AlertOctagon, Info, RefreshCw, CheckCircle2, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Severity = "critical" | "error" | "warning";
type Source = "edge_function" | "webhook" | "cron" | "email_queue" | "stripe" | "client" | "other";

interface ErrorRow {
  id: string;
  source: Source;
  function_name: string | null;
  severity: Severity;
  message: string;
  stack: string | null;
  context: Record<string, unknown> | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface Summary {
  h1: Record<Severity, number>;
  h24: Record<Severity, number>;
  d7: Record<Severity, number>;
  unresolved_critical: number;
  unresolved_total: number;
}

const SEVERITY_META: Record<Severity, { label: string; cls: string; Icon: typeof AlertTriangle }> = {
  critical: { label: "Critical", cls: "bg-destructive text-destructive-foreground", Icon: AlertOctagon },
  error: { label: "Error", cls: "bg-amber-600 hover:bg-amber-700 text-white", Icon: AlertTriangle },
  warning: { label: "Warning", cls: "bg-muted text-foreground", Icon: Info },
};

export default function ErrorsTab() {
  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [resolved, setResolved] = useState<string>("unresolved");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ErrorRow | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([
        adminDataFetch("errors-list", {
          severity: severity === "all" ? undefined : severity,
          source: source === "all" ? undefined : source,
          resolved: resolved === "all" ? undefined : resolved === "resolved",
          search: search || undefined,
          limit: 200,
        }),
        adminDataFetch("errors-summary"),
      ]);
      setRows((list as { rows: ErrorRow[] }).rows || []);
      setSummary(sum as Summary);
    } catch (e) {
      toast.error("Failed to load errors: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [severity, source, resolved, search]);

  useEffect(() => { load(); }, [load]);

  // Realtime: prepend any new error
  useEffect(() => {
    const ch = supabase
      .channel("admin-errors-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_error_log" },
        (payload) => {
          const row = payload.new as ErrorRow;
          setRows((prev) => [row, ...prev].slice(0, 200));
          if (row.severity === "critical") {
            toast.error(`Critical: ${row.function_name ?? row.source}`, { description: row.message });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const acknowledge = async (id: string) => {
    setActing(true);
    try {
      await adminDataFetch("errors-acknowledge", { ids: [id] });
      toast.success("Acknowledged");
      await load();
      setSelected(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setActing(false); }
  };
  const resolve = async (id: string) => {
    setActing(true);
    try {
      await adminDataFetch("errors-resolve", { ids: [id] });
      toast.success("Resolved");
      await load();
      setSelected(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setActing(false); }
  };

  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(["h1", "h24", "d7"] as const).map((k) => {
          const label = k === "h1" ? "Last hour" : k === "h24" ? "Last 24 hours" : "Last 7 days";
          const b = summary?.[k] ?? { critical: 0, error: 0, warning: 0 };
          return (
            <Card key={k} className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={SEVERITY_META.critical.cls}>{b.critical} critical</Badge>
                <Badge className={SEVERITY_META.error.cls}>{b.error} error</Badge>
                <Badge variant="outline">{b.warning} warning</Badge>
              </div>
            </Card>
          );
        })}
      </div>

      {summary && summary.unresolved_critical > 0 && (
        <Card className="p-3 border-destructive/40 bg-destructive/5 flex items-center gap-2 text-sm">
          <AlertOctagon className="h-4 w-4 text-destructive" />
          <span className="font-medium">{summary.unresolved_critical} unresolved critical</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{summary.unresolved_total} total unresolved</span>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="edge_function">Edge function</SelectItem>
            <SelectItem value="webhook">Webhook</SelectItem>
            <SelectItem value="cron">Cron</SelectItem>
            <SelectItem value="email_queue">Email queue</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resolved} onValueChange={setResolved}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="unresolved">Unresolved</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Search message or function…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-[280px]"
        />
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Severity</th>
                <th className="text-left p-3">Source</th>
                <th className="text-left p-3">Function</th>
                <th className="text-left p-3">Message</th>
                <th className="text-left p-3">When</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">
                  <CheckCircle2 className="inline h-4 w-4 mr-1 text-emerald-600" /> No errors match these filters.
                </td></tr>
              )}
              {rows.map((r) => {
                const meta = SEVERITY_META[r.severity];
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3"><Badge className={meta.cls}><meta.Icon className="h-3 w-3 mr-1" />{meta.label}</Badge></td>
                    <td className="p-3 text-xs">{r.source}</td>
                    <td className="p-3 text-xs font-mono">{r.function_name || "—"}</td>
                    <td className="p-3 max-w-md truncate" title={r.message}>{r.message}</td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </td>
                    <td className="p-3 text-xs">
                      {r.resolved_at ? (
                        <Badge variant="outline" className="border-emerald-300 text-emerald-700">Resolved</Badge>
                      ) : r.acknowledged_at ? (
                        <Badge variant="outline">Acknowledged</Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 text-amber-700">New</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && <Badge className={SEVERITY_META[selected.severity].cls}>{SEVERITY_META[selected.severity].label}</Badge>}
              <span className="font-mono text-sm">{selected?.function_name || selected?.source}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Message</p>
                <p className="bg-muted/40 rounded p-3 whitespace-pre-wrap break-words">{selected.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>Source: <span className="text-foreground">{selected.source}</span></div>
                <div>When: <span className="text-foreground">{format(new Date(selected.created_at), "MMM d, yyyy HH:mm:ss")}</span></div>
                {selected.acknowledged_at && <div>Ack: <span className="text-foreground">{format(new Date(selected.acknowledged_at), "MMM d HH:mm")}</span></div>}
                {selected.resolved_at && <div>Resolved: <span className="text-foreground">{format(new Date(selected.resolved_at), "MMM d HH:mm")}</span></div>}
              </div>
              {selected.context && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Context</p>
                  <pre className="bg-muted/40 rounded p-3 text-[11px] overflow-auto max-h-40">{JSON.stringify(selected.context, null, 2)}</pre>
                </div>
              )}
              {selected.stack && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Stack</p>
                  <pre className="bg-muted/40 rounded p-3 text-[11px] overflow-auto max-h-60">{selected.stack}</pre>
                </div>
              )}
              <div className="flex items-center gap-2 justify-end pt-2 border-t border-border">
                {!selected.acknowledged_at && (
                  <Button size="sm" variant="outline" disabled={acting} onClick={() => acknowledge(selected.id)}>
                    Acknowledge
                  </Button>
                )}
                {!selected.resolved_at && (
                  <Button size="sm" disabled={acting} onClick={() => resolve(selected.id)}>
                    Mark resolved
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
