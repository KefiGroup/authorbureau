import { useState, useEffect } from "react";
import { Loader2, DollarSign, Clock, CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { adminDataFetch } from "@/lib/admin-data-fetch";

interface PurchaseRow {
  id: string;
  customer_email: string;
  author_id: string;
  product_type: string;
  product_title: string;
  amount: number;
  platform_fee: number;
  author_earnings: number;
  currency: string;
  payout_status: string;
  payout_eligible_at: string | null;
  refund_status: string;
  created_at: string;
}

interface PayoutRow {
  id: string;
  author_id: string;
  payout_method: string;
  amount: number;
  currency: string;
  purchase_count: number;
  status: string;
  completed_at: string | null;
  created_at: string;
}

interface AuthorPending {
  author_id: string;
  pen_name: string;
  payout_method: string;
  eligible_count: number;
  total_earnings: number;
  currency: string;
}

export default function AdminPayoutsDashboard() {
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingAuthor, setProcessingAuthor] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [purchasesRes, payoutsRes] = await Promise.all([
        adminDataFetch("list-purchases"),
        adminDataFetch("list-payouts"),
      ]);
      setPurchases(purchasesRes.purchases || []);
      setPayouts(payoutsRes.payouts || []);
    } catch (err) {
      console.error("Failed to load payout data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate eligible purchases by author
  const pendingByAuthor: AuthorPending[] = (() => {
    const now = new Date();
    const eligible = purchases.filter(p =>
      p.payout_status === "pending" &&
      p.refund_status === "none" &&
      p.payout_eligible_at &&
      new Date(p.payout_eligible_at) <= now
    );

    const map = new Map<string, AuthorPending>();
    for (const p of eligible) {
      const existing = map.get(p.author_id);
      if (existing) {
        existing.eligible_count++;
        existing.total_earnings += p.author_earnings;
      } else {
        map.set(p.author_id, {
          author_id: p.author_id,
          pen_name: p.author_id.slice(0, 8) + "...",
          payout_method: "stripe",
          eligible_count: 1,
          total_earnings: p.author_earnings,
          currency: p.currency,
        });
      }
    }
    return Array.from(map.values());
  })();

  const totalPending = pendingByAuthor.reduce((s, a) => s + a.total_earnings, 0);
  const totalPaidOut = payouts
    .filter(p => p.status === "completed")
    .reduce((s, p) => s + p.amount, 0);
  const totalRevenue = purchases.reduce((s, p) => s + p.amount, 0);
  const totalFees = purchases.reduce((s, p) => s + p.platform_fee, 0);

  const handleInitiatePayout = async (authorId: string) => {
    setProcessingAuthor(authorId);
    try {
      const author = pendingByAuthor.find(a => a.author_id === authorId);
      if (!author) return;

      await adminDataFetch("initiate-payout", {
        author_id: authorId,
        payout_method: author.payout_method,
        amount: author.total_earnings,
        currency: author.currency,
        purchase_count: author.eligible_count,
      });

      toast.success(`Payout of $${author.total_earnings.toFixed(2)} queued for ${author.pen_name}`);
      await loadData();
    } catch (err) {
      console.error("Failed to initiate payout:", err);
      toast.error("Failed to initiate payout");
    } finally {
      setProcessingAuthor(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">Payouts Management</h2>
        <p className="text-sm text-muted-foreground">Manage author payouts across Stripe, PayPal, and Wise</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Revenue</p>
            <p className="text-2xl font-bold mt-1">${totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Platform Fees (8%)</p>
            <p className="text-2xl font-bold mt-1 text-secondary">${totalFees.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending Payouts</p>
            <p className="text-2xl font-bold mt-1 text-destructive">${totalPending.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Paid Out</p>
            <p className="text-2xl font-bold mt-1 text-accent">${totalPaidOut.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Payouts {pendingByAuthor.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{pendingByAuthor.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="purchases">All Purchases</TabsTrigger>
          <TabsTrigger value="history">Payout History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingByAuthor.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-accent" />
                <p>No pending payouts. All authors are paid up!</p>
              </CardContent>
            </Card>
          ) : (
            pendingByAuthor.map((author) => (
              <Card key={author.author_id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-semibold">{author.pen_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {author.eligible_count} sale{author.eligible_count > 1 ? "s" : ""} · via {author.payout_method}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-bold">${author.total_earnings.toFixed(2)}</p>
                    <Button
                      size="sm"
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      onClick={() => handleInitiatePayout(author.author_id)}
                      disabled={processingAuthor === author.author_id}
                    >
                      {processingAuthor === author.author_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <><Send className="h-4 w-4 mr-1" />Initiate Payout</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="purchases" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Customer</th>
                      <th className="text-left p-3 font-medium">Product</th>
                      <th className="text-right p-3 font-medium">Amount</th>
                      <th className="text-right p-3 font-medium">Fee</th>
                      <th className="text-right p-3 font-medium">Author Earns</th>
                      <th className="text-center p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.length === 0 ? (
                      <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No purchases yet</td></tr>
                    ) : purchases.map((p) => (
                      <tr key={p.id} className="border-t border-border/50">
                        <td className="p-3 text-muted-foreground">{format(new Date(p.created_at), "MMM d")}</td>
                        <td className="p-3">{p.customer_email}</td>
                        <td className="p-3">
                          <span className="font-medium">{p.product_title}</span>
                          <Badge variant="outline" className="ml-2 text-xs">{p.product_type}</Badge>
                        </td>
                        <td className="p-3 text-right">${p.amount.toFixed(2)}</td>
                        <td className="p-3 text-right text-muted-foreground">${p.platform_fee.toFixed(2)}</td>
                        <td className="p-3 text-right font-medium">${p.author_earnings.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <Badge variant={
                            p.refund_status === "refunded" ? "destructive" :
                            p.payout_status === "paid" ? "default" : "secondary"
                          }>
                            {p.refund_status === "refunded" ? "Refunded" : p.payout_status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Author</th>
                      <th className="text-left p-3 font-medium">Method</th>
                      <th className="text-right p-3 font-medium">Amount</th>
                      <th className="text-center p-3 font-medium">Sales</th>
                      <th className="text-center p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No payouts yet</td></tr>
                    ) : payouts.map((p) => (
                      <tr key={p.id} className="border-t border-border/50">
                        <td className="p-3 text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy")}</td>
                        <td className="p-3">{p.author_id.slice(0, 8)}...</td>
                        <td className="p-3 capitalize">{p.payout_method}</td>
                        <td className="p-3 text-right font-medium">${p.amount.toFixed(2)}</td>
                        <td className="p-3 text-center">{p.purchase_count}</td>
                        <td className="p-3 text-center">
                          <Badge variant={p.status === "completed" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>
                            {p.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
