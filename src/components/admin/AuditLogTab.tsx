import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { adminDataFetch } from "@/lib/admin-data-fetch";

type AuditRow = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  event_key: string;
  target_type: string | null;
  target_id: string | null;
  payload: Record<string, any>;
  created_at: string;
};

const EVENT_OPTIONS = [
  "all", "book.submitted", "book.approved", "book.rejected", "book.changes_requested",
  "author.suspended", "author.reinstated", "author.tier_override",
  "admin.broadcast", "purchase.refunded", "payout.paid", "payout.failed",
];

export default function AuditLogTab() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [eventKey, setEventKey] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminDataFetch("audit-log", {
        eventKey: eventKey === "all" ? undefined : eventKey,
        search: search.trim() || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [eventKey, search, page]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const exportCsv = () => {
    const header = "created_at,event_key,actor_email,target_type,target_id,payload\n";
    const body = rows.map(r =>
      [r.created_at, r.event_key, r.actor_email ?? "", r.target_type ?? "", r.target_id ?? "",
       JSON.stringify(r.payload).replace(/"/g, '""')]
      .map(v => `"${v}"`).join(",")
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-log-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold">Audit Log</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select value={eventKey} onValueChange={(v) => { setPage(0); setEventKey(v); }}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {EVENT_OPTIONS.map(e => <SelectItem key={e} value={e}>{e === "all" ? "All events" : e}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payload, actor, target id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPage(0); fetchRows(); } }}
            className="pl-8"
          />
        </div>
        <span className="text-xs text-muted-foreground">{total.toLocaleString()} total</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No audit entries match the current filters.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}>
                <TableCell className="text-xs">{format(new Date(r.created_at), "MMM d, HH:mm")}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{r.event_key}</Badge></TableCell>
                <TableCell className="text-xs truncate max-w-[180px]">{r.actor_email || r.actor_id?.slice(0, 8) || "system"}</TableCell>
                <TableCell className="text-xs">{r.target_type ? `${r.target_type}:${r.target_id?.slice(0, 8)}` : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground truncate max-w-[280px]">
                  {r.payload?.title || r.payload?.reason || r.payload?.audience || JSON.stringify(r.payload).slice(0, 80)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {total > PAGE_SIZE && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm self-center">Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
          <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Audit Entry</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <div><strong>Event:</strong> <Badge variant="outline">{selected.event_key}</Badge></div>
              <div><strong>When:</strong> {format(new Date(selected.created_at), "PPpp")}</div>
              <div><strong>Actor:</strong> {selected.actor_email || selected.actor_id || "system"}</div>
              <div><strong>Target:</strong> {selected.target_type || "—"} {selected.target_id || ""}</div>
              <div>
                <strong>Payload:</strong>
                <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-x-auto max-h-80">{JSON.stringify(selected.payload, null, 2)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
