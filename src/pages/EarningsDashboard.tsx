import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, DollarSign, Calendar, TrendingUp, Wallet, FileText, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePayoutReadiness } from "@/hooks/usePayoutReadiness";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface EarningRow { id: string; gross_usd: number; stripe_fee_usd: number; platform_fee_usd: number; net_usd: number; earned_at: string; paid_out: boolean; refunded: boolean; }
interface PayoutRow { id: string; period_start: string; period_end: string; gross_usd: number; net_usd: number; payout_fee_usd: number; payout_method: string; status: string; external_reference: string | null; paid_at: string | null; }
interface Statement { id: string; tax_year: number; total_net_paid_usd: number; pdf_storage_path: string; }

const fmt = (n: number) => `$${n.toFixed(2)}`;
const MIN_PAYOUT = 50;

function nextPayoutDate(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 9, 0, 0);
}

export default function EarningsDashboard() {
  const { user } = useAuth();
  const { ready } = usePayoutReadiness();
  const [loading, setLoading] = useState(true);
  const [pendingNet, setPendingNet] = useState(0);
  const [pendingGross, setPendingGross] = useState(0);
  const [lifetimeNet, setLifetimeNet] = useState(0);
  const [earnings, setEarnings] = useState<EarningRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: profile } = await supabase.from("author_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!profile) { setLoading(false); return; }

      const [{ data: erns }, { data: pays }, { data: stmts }] = await Promise.all([
        supabase.from("author_earnings").select("*").eq("author_id", profile.id).order("earned_at", { ascending: false }).limit(100),
        supabase.from("author_payouts_v2").select("*").eq("author_id", profile.id).order("queued_at", { ascending: false }),
        supabase.from("author_annual_statements").select("*").eq("author_id", profile.id).order("tax_year", { ascending: false }),
      ]);

      const ernsArr = (erns || []) as EarningRow[];
      setEarnings(ernsArr);
      setPayouts((pays || []) as PayoutRow[]);
      setStatements((stmts || []) as Statement[]);

      const pending = ernsArr.filter((e) => !e.paid_out && !e.refunded);
      setPendingNet(pending.reduce((s, e) => s + Number(e.net_usd), 0));
      setPendingGross(pending.reduce((s, e) => s + Number(e.gross_usd), 0));
      setLifetimeNet(((pays || []) as PayoutRow[]).filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.net_usd), 0));
      setLoading(false);
    })();
  }, [user]);

  const next = nextPayoutDate();
  const progress = Math.min(100, (pendingNet / MIN_PAYOUT) * 100);
  const willPayout = pendingNet >= MIN_PAYOUT;

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-3xl font-bold flex items-center gap-2"><DollarSign className="h-7 w-7 text-secondary" /> Earnings</h1>
            <p className="text-sm text-muted-foreground mt-1">All sales, fees, and monthly payouts from Authors Bureau.</p>
          </div>
          {!ready && (
            <Link to="/account-settings?tab=payouts">
              <Button variant="outline" className="gap-2"><Wallet className="h-4 w-4" />Set up payouts <ArrowRight className="h-3 w-3" /></Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-normal">Pending payout</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{fmt(pendingNet)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{fmt(pendingGross)} gross</p>
                  <div className="mt-3">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {willPayout ? "✓ Above $50 minimum" : `${fmt(MIN_PAYOUT - pendingNet)} until $50 minimum`}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-normal">Next payout</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6 text-secondary" />{next.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                  <p className="text-xs text-muted-foreground mt-1">{next.toLocaleDateString(undefined, { weekday: "long", year: "numeric" })}</p>
                  <p className="text-xs text-muted-foreground mt-3">Paid via {ready ? "your configured method" : "— set up payouts first"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-normal">Lifetime paid</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6 text-accent" />{fmt(lifetimeNet)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across {payouts.filter((p) => p.status === "paid").length} payouts</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />Payout history</CardTitle></CardHeader>
              <CardContent>
                {payouts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No payouts yet. Your first payout runs on the 1st of next month if you've earned ≥$50.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Period</TableHead><TableHead>Gross</TableHead><TableHead>Fees</TableHead><TableHead>Net</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead>Reference</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{payouts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs">{p.period_start} → {p.period_end}</TableCell>
                        <TableCell>{fmt(Number(p.gross_usd))}</TableCell>
                        <TableCell className="text-muted-foreground">{fmt(Number(p.payout_fee_usd))}</TableCell>
                        <TableCell className="font-semibold">{fmt(Number(p.net_usd))}</TableCell>
                        <TableCell className="capitalize text-xs">{p.payout_method}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "paid" ? "default" : "outline"} className={p.status === "paid" ? "bg-accent/15 text-accent border-accent/30" : ""}>{p.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.external_reference || "—"}</TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Recent sales ledger</CardTitle></CardHeader>
              <CardContent>
                {earnings.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No sales yet.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Date</TableHead><TableHead>Gross</TableHead><TableHead>Stripe fee</TableHead>
                      <TableHead title="Authors Bureau retains 8% to cover AI generation, hosting, email delivery, and payment processing overhead. You keep 92%.">
                        Platform 8%
                      </TableHead>
                      <TableHead>Net</TableHead><TableHead>Status</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{earnings.slice(0, 25).map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs">{new Date(e.earned_at).toLocaleDateString()}</TableCell>
                        <TableCell>{fmt(Number(e.gross_usd))}</TableCell>
                        <TableCell className="text-muted-foreground">{fmt(Number(e.stripe_fee_usd))}</TableCell>
                        <TableCell className="text-muted-foreground">{fmt(Number(e.platform_fee_usd))}</TableCell>
                        <TableCell className="font-semibold">{fmt(Number(e.net_usd))}</TableCell>
                        <TableCell>
                          {e.refunded ? <Badge variant="destructive">Refunded</Badge>
                            : e.paid_out ? <Badge className="bg-accent/15 text-accent border-accent/30">Paid out</Badge>
                            : <Badge variant="outline">Pending</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {statements.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Annual statements</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {statements.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-semibold">Tax year {s.tax_year}</p>
                        <p className="text-xs text-muted-foreground">Total paid: {fmt(Number(s.total_net_paid_usd))}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={async () => {
                        const { data } = await supabase.storage.from("payouts").createSignedUrl(s.pdf_storage_path, 60 * 5);
                        if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                      }}>Download PDF</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
    </DashboardLayout>
  );
}
