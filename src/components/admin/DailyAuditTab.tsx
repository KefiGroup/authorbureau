import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, AlertOctagon, Copy, Download, ChevronDown, ChevronRight, Activity } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { supabase } from "@/integrations/supabase/client";

type Severity = "ok" | "warn" | "fail";
interface CheckResult {
  key: string;
  label: string;
  severity: Severity;
  count: number;
  message: string;
  link?: string;
  details?: any;
}
interface Report {
  generated_at: string;
  triggered_by: string;
  status: "green" | "amber" | "red";
  issue_count: number;
  fail_count: number;
  warn_count: number;
  checks: CheckResult[];
}

const STATUS_META = {
  green: { label: "All clear", cls: "bg-emerald-600 hover:bg-emerald-700 text-white", Icon: CheckCircle2 },
  amber: { label: "Warnings",  cls: "bg-amber-600 hover:bg-amber-700 text-white",     Icon: AlertTriangle },
  red:   { label: "Issues",    cls: "bg-destructive text-destructive-foreground",      Icon: AlertOctagon },
};
const SEV_META: Record<Severity, { cls: string; Icon: typeof AlertTriangle }> = {
  ok:   { cls: "border-emerald-300 text-emerald-700 bg-emerald-50", Icon: CheckCircle2 },
  warn: { cls: "border-amber-300 text-amber-700 bg-amber-50",       Icon: AlertTriangle },
  fail: { cls: "border-destructive text-destructive bg-destructive/5", Icon: AlertOctagon },
};

function reportToMarkdown(r: Report): string {
  const lines: string[] = [];
  lines.push(`# Daily Audit Report — ${r.status.toUpperCase()}`);
  lines.push(`Generated: ${r.generated_at} (${r.triggered_by})`);
  lines.push(`Summary: ${r.fail_count} fail · ${r.warn_count} warn · ${r.issue_count} issues\n`);
  for (const c of r.checks) {
    lines.push(`## [${c.severity.toUpperCase()}] ${c.label}`);
    lines.push(`${c.message}`);
    if (c.link) lines.push(`Link: ${c.link}`);
    lines.push("");
  }
  return lines.join("\n");
}

export default function DailyAuditTab() {
  const [report, setReport] = useState<Report | null>(null);
  const [history, setHistory] = useState<{ id: string; generated_at: string; status: string; issue_count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("daily_audit_runs")
      .select("id, generated_at, status, issue_count, report")
      .order("generated_at", { ascending: false })
      .limit(20);
    setHistory(data || []);
    if (data && data.length > 0 && !report) {
      setReport((data[0] as any).report as Report);
    }
  }, [report]);

  const runAudit = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getActiveToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-audit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ triggeredBy: "manual" }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data?.report) throw new Error(data?.message || `Failed (${res.status})`);
      setReport(data.report);
      toast.success("Audit complete");
      loadHistory();
    } catch (e) {
      toast.error("Audit failed: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [loadHistory]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const copyMd = () => {
    if (!report) return;
    navigator.clipboard.writeText(reportToMarkdown(report));
    toast.success("Copied as Markdown");
  };
  const downloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `daily-audit-${report.generated_at.slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const statusMeta = report ? STATUS_META[report.status] : null;

  return (
    <div className="space-y-4">
      {/* Header / status */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-secondary" />
            <div>
              <h2 className="font-heading text-xl font-bold">Daily Platform Audit</h2>
              <p className="text-sm text-muted-foreground">
                {report
                  ? `Last run ${formatDistanceToNow(new Date(report.generated_at), { addSuffix: true })} (${report.triggered_by})`
                  : "No audit has been run yet."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {statusMeta && (
              <Badge className={statusMeta.cls}>
                <statusMeta.Icon className="h-3.5 w-3.5 mr-1" /> {statusMeta.label}
              </Badge>
            )}
            {report && (
              <span className="text-sm text-muted-foreground">
                {report.fail_count} fail · {report.warn_count} warn · {report.issue_count} issues
              </span>
            )}
            <Button size="sm" onClick={runAudit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Run audit now
            </Button>
            {report && (
              <>
                <Button size="sm" variant="outline" onClick={copyMd}><Copy className="h-4 w-4 mr-1" />Markdown</Button>
                <Button size="sm" variant="outline" onClick={downloadJson}><Download className="h-4 w-4 mr-1" />JSON</Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Checks */}
      {report && (
        <div className="space-y-2">
          {report.checks.map((c) => {
            const m = SEV_META[c.severity];
            const open = expanded[c.key];
            return (
              <Card key={c.key} className={`p-4 border-l-4 ${c.severity === "fail" ? "border-l-destructive" : c.severity === "warn" ? "border-l-amber-500" : "border-l-emerald-500"}`}>
                <button
                  className="w-full flex items-start gap-3 text-left"
                  onClick={() => setExpanded((e) => ({ ...e, [c.key]: !e[c.key] }))}
                >
                  {open ? <ChevronDown className="h-4 w-4 mt-0.5 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />}
                  <Badge variant="outline" className={`${m.cls} border`}><m.Icon className="h-3 w-3 mr-1" />{c.severity.toUpperCase()}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{c.label}</div>
                    <div className="text-sm text-muted-foreground">{c.message}</div>
                  </div>
                  {c.link && (
                    <a
                      href={c.link}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-secondary hover:underline whitespace-nowrap"
                    >
                      Open →
                    </a>
                  )}
                </button>
                {open && c.details && (
                  <pre className="mt-3 ml-7 bg-muted/40 rounded p-3 text-[11px] overflow-auto max-h-60">
                    {JSON.stringify(c.details, null, 2)}
                  </pre>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recent runs</p>
          <div className="space-y-1 max-h-60 overflow-auto">
            {history.map((h) => {
              const meta = STATUS_META[h.status as keyof typeof STATUS_META] || STATUS_META.green;
              return (
                <button
                  key={h.id}
                  onClick={() => setReport((h as any).report as Report)}
                  className="w-full flex items-center justify-between gap-3 text-xs px-2 py-1.5 rounded hover:bg-muted/50 text-left"
                >
                  <Badge className={meta.cls + " text-[10px]"}>{h.status.toUpperCase()}</Badge>
                  <span className="text-muted-foreground flex-1 truncate">
                    {format(new Date(h.generated_at), "MMM d, yyyy HH:mm")}
                  </span>
                  <span className="text-muted-foreground">{h.issue_count} issue{h.issue_count === 1 ? "" : "s"}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
