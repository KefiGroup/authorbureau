import { useEffect, useState } from "react";
import { Loader2, Download, CheckCircle2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface Payout { id: string; author_id: string; period_start: string; period_end: string; gross_usd: number; net_usd: number; payout_fee_usd: number; payout_method: string; status: string; external_reference: string | null; paid_at: string | null; csv_batch_id: string | null; }
interface AuthorMini { id: string; pen_name: string | null; }
interface Batch { id: string; provider: string; period_start: string; period_end: string; csv_storage_path: string; total_authors: number; total_amount_usd: number; status: string; created_at: string; }

const fmt = (n: number) => `$${Number(n).toFixed(2)}`;

export default function AdminPayouts() {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [batches, setBatches] = useState<Batch[]>([]);
  const [running, setRunning] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [reference, setReference] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: pays }, { data: profs }, { data: bats }] = await Promise.all([
      supabase.from("author_payouts_v2").select("*").order("queued_at", { ascending: false }).limit(200),
      supabase.from("author_profiles").select("id, pen_name"),
      supabase.from("payout_batches").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setPayouts((pays || []) as Payout[]);
    setBatches((bats || []) as Batch[]);
    const map: Record<string, string> = {};
    (profs || []).forEach((p: AuthorMini) => { map[p.id] = p.pen_name || "Unnamed author"; });
    setAuthors(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runMonthly = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-monthly-payouts", { body: {} });
      if (error) throw error;
      toast.success(`Created ${data?.payouts_created ?? 0} payouts ($${data?.total_amount_usd ?? 0})`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setRunning(false); }
  };

  const downloadBatch = async (path: string) => {
    const { data, error } = await supabase.storage.from("payouts").createSignedUrl(path, 60 * 10);
    if (error || !data) { toast.error("Failed to get download URL"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const markPaid = async () => {
    if (!markingId) return;
    try {
      const { error } = await supabase.functions.invoke("mark-payout-paid", {
        body: { payout_id: markingId, external_reference: reference },
      });
      if (error) throw error;
      toast.success("Marked as paid");
      setMarkingId(null);
      setReference("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const queued = payouts.filter((p) => p.status === "queued" || p.status === "processing");
  const paid = payouts.filter((p) => p.status === "paid");
  const failed = payouts.filter((p) => p.status === "failed" || p.status === "held");
  const totalQueued = queued.reduce((s, p) => s + Number(p.net_usd), 0);
  const totalPaidLifetime = paid.reduce((s, p) => s + Number(p.net_usd), 0);

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-3xl font-bold">Admin · Payouts</h1>
            <p className="text-sm text-muted-foreground mt-1">Run monthly batches, download CSVs, mark payouts as sent.</p>
          </div>
          <Button onClick={runMonthly} disabled={running} className="gap-2">
            {running ? <><Loader2 className="h-4 w-4 animate-spin" />Running…</> : <><RefreshCw className="h-4 w-4" />Run monthly payouts now</>}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Queued</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{fmt(totalQueued)}</div><p className="text-xs text-muted-foreground">{queued.length} authors</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Lifetime paid</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{fmt(totalPaidLifetime)}</div><p className="text-xs text-muted-foreground">{paid.length} payouts</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Failed / held</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{failed.length}</div><p className="text-xs text-muted-foreground">Need attention</p></CardContent></Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <Tabs defaultValue="queued">
            <TabsList>
              <TabsTrigger value="queued">Queued ({queued.length})</TabsTrigger>
              <TabsTrigger value="paid">Paid ({paid.length})</TabsTrigger>
              <TabsTrigger value="failed">Failed ({failed.length})</TabsTrigger>
              <TabsTrigger value="batches">CSV batches ({batches.length})</TabsTrigger>
            </TabsList>

            {(["queued", "paid", "failed"] as const).map((tab) => (
              <TabsContent key={tab} value={tab}>
                <Card><CardContent className="pt-6">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Author</TableHead><TableHead>Period</TableHead><TableHead>Net</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead>Ref</TableHead><TableHead>Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {(tab === "queued" ? queued : tab === "paid" ? paid : failed).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{authors[p.author_id] || "?"}</TableCell>
                          <TableCell className="text-xs">{p.period_start} → {p.period_end}</TableCell>
                          <TableCell className="font-semibold">{fmt(Number(p.net_usd))}</TableCell>
                          <TableCell className="capitalize text-xs">{p.payout_method}</TableCell>
                          <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.external_reference || "—"}</TableCell>
                          <TableCell>
                            {p.status === "queued" || p.status === "processing" ? (
                              <Button size="sm" variant="outline" onClick={() => setMarkingId(p.id)}><CheckCircle2 className="h-3 w-3 mr-1" />Mark paid</Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              </TabsContent>
            ))}

            <TabsContent value="batches">
              <Card><CardContent className="pt-6">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Provider</TableHead><TableHead>Period</TableHead><TableHead>Authors</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {batches.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="capitalize font-medium">{b.provider}</TableCell>
                        <TableCell className="text-xs">{b.period_start} → {b.period_end}</TableCell>
                        <TableCell>{b.total_authors}</TableCell>
                        <TableCell className="font-semibold">{fmt(Number(b.total_amount_usd))}</TableCell>
                        <TableCell><Badge variant="outline">{b.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</TableCell>
                        <TableCell><Button size="sm" variant="outline" onClick={() => downloadBatch(b.csv_storage_path)}><Download className="h-3 w-3 mr-1" />CSV</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={!!markingId} onOpenChange={(o) => !o && setMarkingId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Mark payout as paid</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">Enter the Wise/PayPal transaction reference.</p>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. WISE-12345-ABC" />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setMarkingId(null)}>Cancel</Button>
              <Button onClick={markPaid}>Confirm paid</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </DashboardLayout>
  );
}
