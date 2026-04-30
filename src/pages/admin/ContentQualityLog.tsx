import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertTriangle, ShieldCheck } from "lucide-react";

type LogRow = {
  id: string;
  author_id: string;
  node_id: string;
  rule: string;
  sample: string | null;
  field_path: string | null;
  source: string | null;
  created_at: string;
};

const RULE_LABEL: Record<string, string> = {
  emdash: "Emdash leak",
  pricing_in_prose: "Pricing in prose",
  forbidden_word: "Forbidden vocabulary",
  placeholder: "Placeholder leak",
  missing_cta: "Missing CTA (auto-injected)",
};

const RULE_COLOR: Record<string, string> = {
  emdash: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  pricing_in_prose: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  forbidden_word: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  placeholder: "bg-purple-500/15 text-purple-300 border-purple-500/40",
  missing_cta: "bg-sky-500/15 text-sky-300 border-sky-500/40",
};

export default function ContentQualityLog() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("content_quality_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) setError(error.message);
      else setRows((data as LogRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const byNode = useMemo(() => {
    const map = new Map<string, LogRow[]>();
    for (const r of rows) {
      const key = `${r.node_id}__${r.rule}`;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .map(([k, v]) => ({ key: k, node_id: v[0].node_id, rule: v[0].rule, count: v.length, last: v[0] }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Content Quality Log</h1>
            <p className="text-sm text-muted-foreground">
              Last 200 violations caught by the microsite rules engine. Lower numbers = better-behaved generators.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {error && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6 flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {error}
            </CardContent>
          </Card>
        )}

        {!loading && !error && rows.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
              No violations logged. Generators are clean.
            </CardContent>
          </Card>
        )}

        {byNode.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top offenders (node × rule)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {byNode.slice(0, 12).map((row) => (
                  <div key={row.key} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold">{row.node_id}</span>
                      <Badge variant="outline" className="font-mono">
                        ×{row.count}
                      </Badge>
                    </div>
                    <Badge variant="outline" className={RULE_COLOR[row.rule] ?? ""}>
                      {RULE_LABEL[row.rule] ?? row.rule}
                    </Badge>
                    {row.last.sample && (
                      <p className="text-xs text-muted-foreground line-clamp-2 italic">
                        "{row.last.sample}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {rows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent events</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {rows.map((r) => (
                    <div key={r.id} className="rounded-md border border-border p-3 text-sm space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">{r.node_id}</span>
                          <Badge variant="outline" className={RULE_COLOR[r.rule] ?? ""}>
                            {RULE_LABEL[r.rule] ?? r.rule}
                          </Badge>
                          {r.field_path && (
                            <code className="text-xs text-muted-foreground">{r.field_path}</code>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString()}
                        </span>
                      </div>
                      {r.sample && (
                        <p className="text-xs text-muted-foreground italic line-clamp-2">"{r.sample}"</p>
                      )}
                      {r.source && (
                        <p className="text-xs font-mono text-muted-foreground/70">{r.source}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
