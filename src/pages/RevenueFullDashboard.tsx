import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Users, Mail, TrendingUp, DollarSign, ArrowLeft, CheckCircle2, Eye, ExternalLink, CreditCard, Info, X, Flame, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function callStripeConnect(body: Record<string, unknown>): Promise<{ data: any; error: Error | null }> {
  try {
    const token = await getActiveToken();
    if (!token) return { data: null, error: new Error("Not signed in") };
    const res = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/stripe-connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: new Error(json?.error || `HTTP ${res.status}`) };
    return { data: json, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

interface Snapshot {
  snapshot_date: string;
  total_contacts: number;
  email_subscribers: number;
  pipeline_value_usd: number;
  stripe_revenue_mtd_usd: number;
  stripe_revenue_ytd_usd: number;
  nodes_live: number;
}

interface LiveNode {
  node_id: string;
  node_name: string;
  personalised_name: string | null;
  status: string;
  content_json: any;
}

const MILESTONES = [
  { name: "First Contact", target: 1, metric: "contacts" as const, icon: "👤" },
  { name: "First 100 Subscribers", target: 100, metric: "subscribers" as const, icon: "📧" },
  { name: "First $1,000", target: 1000, metric: "revenue_mtd" as const, icon: "💰" },
  { name: "1,000 Subscribers", target: 1000, metric: "subscribers" as const, icon: "🔓", note: "Unlocks Build Authority" },
  { name: "First $10,000", target: 10000, metric: "revenue_mtd" as const, icon: "🚀" },
  { name: "5,000 Subscribers", target: 5000, metric: "subscribers" as const, icon: "🔓", note: "Unlocks Yield Revenue" },
  { name: "First $50,000", target: 50000, metric: "revenue_ytd" as const, icon: "⭐" },
  { name: "First $100,000", target: 100000, metric: "revenue_ytd" as const, icon: "🏆" },
];

const NODE_REVENUE_ESTIMATES: Record<string, number> = {
  "BP-01": 200, "BP-02": 150, "BP-03": 100, "BP-04": 300, "BP-05": 250,
  "BP-06": 400, "BP-07": 350, "BP-08": 500, "BP-09": 300,
  "BA-10": 800, "BA-11": 200, "BA-12": 600, "BA-13": 1000, "BA-14": 150,
  "BA-15": 300, "BA-16": 400, "BA-17": 500, "BA-18": 300,
  "YR-19": 1500, "YR-20": 3000, "YR-21": 2500, "YR-22": 4000, "YR-23": 2000,
  "YR-24": 3500, "YR-25": 2500, "YR-26": 2000, "YR-27": 1000, "YR-28": 1500,
};

function getHub(nodeId: string): string {
  if (nodeId.startsWith("BP")) return "Brand Products";
  if (nodeId.startsWith("BA")) return "Build Authority";
  return "Yield Revenue";
}

export default function RevenueFullDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [penName, setPenName] = useState("");
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  // New Stripe Connect (Express) flow — flag flipped by stripe-connect edge function.
  const [stripeConnectId, setStripeConnectId] = useState<string | null>(null);
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false);
  const [stripeRefreshing, setStripeRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(true);
  const [metrics, setMetrics] = useState({ contacts: 0, subscribers: 0, pipeline: 0, revenueMtd: 0 });
  const [projected, setProjected] = useState({ ghl: true, stripe: true });
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [liveNodes, setLiveNodes] = useState<LiveNode[]>([]);
  const [nodesLive, setNodesLive] = useState(0);
  const [hotLeads, setHotLeads] = useState<Array<{ id: string; full_name: string; email: string | null; abby_score: number; last_activity_at: string | null }>>([]);

  // Connect Stripe modal (legacy manual-paste flow — kept for advanced users)
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeInput, setStripeInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch author profile + initial direct-DB data (fast, no edge functions)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      // 1. Resolve author profile
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id, pen_name, stripe_connected_account_id, stripe_account_id, stripe_onboarding_complete")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (!profile) {
        setLoading(false);
        return;
      }

      setAuthorId(profile.id);
      setPenName(profile.pen_name || "Author");
      setStripeAccountId(profile.stripe_connected_account_id || null);
      setStripeConnectId(profile.stripe_account_id || null);
      setStripeOnboardingComplete(!!profile.stripe_onboarding_complete);

      // 2. Parallel direct DB queries — fast, no edge functions
      const [contactsRes, hotRes, nodesRes, snapsRes, purchasesRes] = await Promise.all([
        // Total leads (crm_contacts is keyed by user.id per current resolver)
        supabase
          .from("crm_contacts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", user.id),
        // Hot leads (abby_score >= 60)
        supabase
          .from("crm_contacts")
          .select("id, full_name, email, abby_score, last_activity_at")
          .eq("author_id", user.id)
          .gte("abby_score", 60)
          .order("abby_score", { ascending: false })
          .limit(10),
        // Active nodes
        supabase
          .from("author_nodes")
          .select("node_id, node_name, personalised_name, status, content_json")
          .eq("author_id", profile.id)
          .eq("status", "live"),
        // Historical snapshots
        supabase
          .from("author_revenue_snapshots")
          .select("*")
          .eq("author_id", profile.id)
          .order("snapshot_date", { ascending: true })
          .limit(180),
        // Revenue this month from purchases
        supabase
          .from("purchases")
          .select("amount")
          .eq("author_id", profile.id)
          .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      if (cancelled) return;

      const contactsCount = contactsRes.count || 0;
      const liveNodesData = (nodesRes.data as LiveNode[]) || [];
      const monthRevenue = (purchasesRes.data || []).reduce(
        (sum: number, p: any) => sum + Number(p.amount || 0),
        0
      );

      setLiveNodes(liveNodesData);
      setNodesLive(liveNodesData.length);
      setHotLeads((hotRes.data as any) || []);
      setSnapshots((snapsRes.data as Snapshot[]) || []);
      setMetrics({
        contacts: contactsCount,
        subscribers: contactsCount, // direct count — no GHL dependency
        pipeline: 0,
        revenueMtd: monthRevenue,
      });
      // Real data — not projected
      setProjected({ ghl: false, stripe: !(profile.stripe_onboarding_complete || profile.stripe_connected_account_id) });
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

  // Background sync — enriches with Stripe revenue if connected.
  // Does NOT block initial render. Direct DB counts already shown.
  const syncMetrics = useCallback(async () => {
    if (!authorId) return;
    try {
      const stripeRes = await supabase.functions
        .invoke("sync-stripe-metrics", { body: { author_id: authorId } })
        .catch(() => ({ data: null }));

      const stripe = (stripeRes as any)?.data;

      // Stripe revenue only overrides if higher (purchases table may be empty)
      if (stripe?.success && stripe.data?.stripe_revenue_mtd_usd) {
        setMetrics((m) => ({
          ...m,
          revenueMtd: Math.max(m.revenueMtd, stripe.data.stripe_revenue_mtd_usd),
        }));
        setProjected((p) => ({ ...p, stripe: stripe.projected }));
      }
    } catch (e) {
      console.error("Sync error (non-fatal):", e);
    }
  }, [authorId]);

  // Fetch ABBY daily insight
  const fetchInsight = useCallback(async () => {
    if (!authorId) return;
    setInsightLoading(true);

    // Check cache (localStorage, 24 hours)
    const cacheKey = `abby_insight_${authorId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < 24 * 60 * 60 * 1000) {
        setInsight(parsed.text);
        setInsightLoading(false);
        return;
      }
    }

    try {
      const { data } = await supabase.functions.invoke("generate-daily-insight", {
        body: { author_id: authorId },
      });
      const text = data?.insight || "Keep building — every node you activate brings you closer to your revenue goals!";
      setInsight(text);
      localStorage.setItem(cacheKey, JSON.stringify({ text, ts: Date.now() }));
    } catch {
      setInsight("Welcome to your Revenue Dashboard! Start activating nodes to see your earnings grow.");
    } finally {
      setInsightLoading(false);
    }
  }, [authorId]);

  useEffect(() => {
    if (authorId) {
      syncMetrics();
      fetchInsight();
      // Trigger nudge generation (max once per day, handled server-side)
      supabase.functions.invoke("generate-nudges").catch(() => {});
    }
  }, [authorId, syncMetrics, fetchInsight]);

  // Save Stripe account ID
  const saveStripeAccountId = async () => {
    if (!stripeInput.trim() || !authorId) return;
    setSaving(true);
    const { error } = await supabase
      .from("author_profiles")
      .update({ stripe_connected_account_id: stripeInput.trim() })
      .eq("id", authorId);
    setSaving(false);
    if (error) {
      toast.error("Failed to save. Please try again.");
    } else {
      setStripeAccountId(stripeInput.trim());
      setShowStripeModal(false);
      toast.success("Payment account connected!");
      syncMetrics();
    }
  };

  // ── New: Stripe Connect (Express) onboarding lifecycle ──
  // Three states for the header:
  //   not_started      → no stripe_account_id at all (must click "Start onboarding")
  //   in_progress      → account exists but onboarding not finished
  //   connected        → onboarding_complete = true; revenue is real, not projected
  const stripeConnectState: "not_started" | "in_progress" | "connected" =
    stripeOnboardingComplete ? "connected" : (stripeConnectId ? "in_progress" : "not_started");

  // "Start onboarding" / "Resume onboarding" — calls stripe-connect edge fn
  const startStripeOnboarding = async () => {
    setStripeRefreshing(true);
    try {
      const { data, error } = await callStripeConnect({ action: "onboard" });
      if (error || !data?.url) {
        toast.error("Couldn't start Stripe onboarding. Please try again.");
        return;
      }
      // Hand off to Stripe — they'll redirect back via the configured return_url.
      window.location.href = data.url;
    } catch {
      toast.error("Couldn't start Stripe onboarding. Please try again.");
    } finally {
      setStripeRefreshing(false);
    }
  };

  // "Refresh Stripe status" — re-pings Stripe and bi-directionally syncs the
  // stripe_onboarding_complete flag. Useful when a webhook hasn't fired yet
  // or the author finished onboarding in another tab.
  const refreshStripeStatus = async () => {
    setStripeRefreshing(true);
    try {
      const { data, error } = await callStripeConnect({ action: "status" });
      if (error) {
        toast.error("Couldn't reach Stripe. Please try again.");
        return;
      }
      const connected = !!data?.connected;
      const complete = !!data?.onboarding_complete;
      setStripeOnboardingComplete(complete);
      // Re-pull the row to get the canonical stripe_account_id we just synced.
      if (authorId) {
        const { data: profile } = await supabase
          .from("author_profiles")
          .select("stripe_account_id, stripe_onboarding_complete")
          .eq("id", authorId)
          .maybeSingle();
        if (profile) {
          setStripeConnectId(profile.stripe_account_id || null);
          setStripeOnboardingComplete(!!profile.stripe_onboarding_complete);
        }
      }
      if (complete) {
        toast.success("Stripe connected — your revenue is now tracked.");
        syncMetrics();
      } else if (connected) {
        toast.message("Stripe onboarding still in progress.");
      } else {
        toast.message("No Stripe account linked yet — click Start onboarding.");
      }
    } catch {
      toast.error("Couldn't reach Stripe. Please try again.");
    } finally {
      setStripeRefreshing(false);
    }
  };

  // Build chart data (last 6 months)
  const chartData = (() => {
    const months: { month: string; actual: number | null; projected: number | null }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short" });
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const snap = snapshots.find((s) => s.snapshot_date.startsWith(yearMonth));
      if (snap) {
        months.push({ month: label, actual: Number(snap.stripe_revenue_mtd_usd) || 0, projected: null });
      } else {
        // Project based on nodes live
        months.push({ month: label, actual: null, projected: nodesLive * 200 * (1 + (5 - i) * 0.1) });
      }
    }
    return months;
  })();

  // Milestone values
  const milestoneValues = {
    contacts: metrics.contacts,
    subscribers: metrics.subscribers,
    revenue_mtd: metrics.revenueMtd,
    revenue_ytd: snapshots.length > 0 ? Number(snapshots[snapshots.length - 1]?.stripe_revenue_ytd_usd || 0) : metrics.revenueMtd,
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Revenue Dashboard</h1>
            <p className="text-xs text-muted-foreground">Track your earnings across all 28 nodes</p>
          </div>
          {/* Stripe Connect — three-state header control */}
          <div className="flex items-center gap-2">
            {stripeConnectState === "connected" ? (
              <Badge variant="outline" className="gap-1.5 border-emerald-500/40 text-emerald-700 bg-emerald-500/10">
                <CheckCircle2 className="h-3.5 w-3.5" /> Stripe Connected
              </Badge>
            ) : stripeConnectState === "in_progress" ? (
              <>
                <Badge variant="outline" className="gap-1.5 border-amber-500/40 text-amber-700 bg-amber-500/10">
                  <Info className="h-3.5 w-3.5" /> Onboarding in progress
                </Badge>
                <Button variant="outline" size="sm" onClick={startStripeOnboarding} disabled={stripeRefreshing} className="gap-2">
                  <CreditCard className="h-4 w-4" /> Resume onboarding
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={startStripeOnboarding} disabled={stripeRefreshing} className="gap-2">
                <CreditCard className="h-4 w-4" /> Start Stripe onboarding
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshStripeStatus}
              disabled={stripeRefreshing}
              title="Re-check Stripe status"
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${stripeRefreshing ? "animate-spin" : ""}`} />
              {stripeRefreshing ? "Checking…" : "Refresh status"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stripe explainer — only when no Stripe Connect account exists yet */}
        {stripeConnectState === "not_started" && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              <strong>Heads up:</strong> completing Stripe onboarding directly on stripe.com does
              not link to Authors Bureau. Click <strong>Start Stripe onboarding</strong> above so
              we can create your payout-only Express account. Already finished? Click{" "}
              <strong>Refresh status</strong>.
            </p>
          </div>
        )}
        {/* SECTION 1: ABBY Daily Insight */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary mb-1">ABBY's Daily Insight</p>
                {insightLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                  </div>
                ) : (
                  <p className="text-sm text-foreground leading-relaxed">{insight}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ABBY Report Settings */}
        <AbbyReportSettingsCard authorId={authorId} />

        {/* ABBY Nudges */}
        <NudgeCards authorId={authorId} />

        {/* SECTION 2: Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Users}
            label="Total Contacts"
            value={metrics.contacts}
            isProjected={projected.ghl}
            format="number"
          />
          <MetricCard
            icon={Mail}
            label="Email Subscribers"
            value={metrics.subscribers}
            isProjected={projected.ghl}
            format="number"
          />
          <MetricCard
            icon={TrendingUp}
            label="Pipeline Value"
            value={metrics.pipeline}
            isProjected={projected.ghl}
            format="currency"
          />
          <MetricCard
            icon={DollarSign}
            label="Revenue This Month"
            value={metrics.revenueMtd}
            isProjected={projected.stripe}
            format="currency"
          />
        </div>

        {/* SECTION 3: Revenue Trend Chart */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold mb-4">Revenue Trend (Last 6 Months)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`$${value?.toFixed(0) || 0}`, name === "actual" ? "Actual" : "Projected"]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot
                    name="Actual"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="projected"
                    stroke="#d97706"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Projected"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3.5: Hot Leads */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="h-4 w-4 text-orange-500" />
              <h3 className="text-sm font-semibold">Hot Leads Today</h3>
              <Badge variant="secondary" className="text-xs">{hotLeads.length}</Badge>
            </div>
            {hotLeads.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm mb-3">No hot leads today — keep nurturing your list</p>
                <Button variant="outline" size="sm" onClick={() => navigate("/dashboard?section=author-crm")} className="gap-2">
                  <Users className="h-4 w-4" /> View CRM
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {hotLeads.map((lead) => {
                  const isRed = lead.abby_score >= 80;
                  return (
                    <div key={lead.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{lead.full_name}</span>
                          <Badge className={isRed ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"}>
                            {lead.abby_score}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard?section=author-crm")} className="h-7 text-xs gap-1">
                        <Eye className="h-3 w-3" /> View
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 4: Node Performance Table */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold mb-4">Node Performance</h3>
            {liveNodes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm mb-3">No live nodes yet. Head to your books to build your first revenue stream.</p>
                <Button variant="outline" size="sm" onClick={() => navigate("/dashboard?section=my-books")} className="gap-2">
                  <ExternalLink className="h-4 w-4" /> Go to My Books
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Node</th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium hidden sm:table-cell">Hub</th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">Est. Monthly</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveNodes.map((node) => (
                      <tr key={node.node_id} className="border-b last:border-b-0">
                        <td className="py-2 px-2">
                          <div>
                            <span className="font-mono text-xs text-muted-foreground mr-1">{node.node_id}</span>
                            <span className="font-medium">{node.personalised_name || node.node_name}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-muted-foreground hidden sm:table-cell">{getHub(node.node_id)}</td>
                        <td className="py-2 px-2">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Live
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-medium">
                          ${(NODE_REVENUE_ESTIMATES[node.node_id] || 200).toLocaleString()}
                          <span className="text-xs text-amber-600 ml-1">est.</span>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/node-builder/${node.node_id}`)} className="h-7 text-xs gap-1">
                            <Eye className="h-3 w-3" /> View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 5: Growth Milestones */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold mb-4">Growth Milestones</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MILESTONES.map((ms) => {
                const current = milestoneValues[ms.metric];
                const achieved = current >= ms.target;
                const pct = Math.min(100, (current / ms.target) * 100);
                return (
                  <div key={ms.name} className={`p-3 rounded-lg border ${achieved ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30" : "border-border"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{ms.icon}</span>
                      <span className="text-sm font-medium flex-1">{ms.name}</span>
                      {achieved ? (
                        <span className="text-xs text-emerald-600 font-medium">Achieved ✓</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {current.toLocaleString()} / {ms.target.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    {ms.note && !achieved && (
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Info className="h-3 w-3" /> {ms.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connect Stripe Modal */}
      <Dialog open={showStripeModal} onOpenChange={setShowStripeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Your Payment Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Connect your payment account to see your real revenue data on this dashboard.
            Your payment links are already working — connecting your account lets ABBY track your earnings automatically.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Account ID</label>
            <Input
              placeholder="acct_XXXXXXXXXXXXXXXXXX"
              value={stripeInput}
              onChange={(e) => setStripeInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Find this in your payment dashboard under Settings → Account Details
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStripeModal(false)}>Cancel</Button>
            <Button onClick={saveStripeAccountId} disabled={saving || !stripeInput.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

/* ── Metric Card Component ──────────────────────────────── */
function MetricCard({
  icon: Icon,
  label,
  value,
  isProjected,
  format,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  isProjected: boolean;
  format: "number" | "currency";
}) {
  const formatted = format === "currency"
    ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : value.toLocaleString();

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${isProjected ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
            {formatted}
          </span>
          {isProjected && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              Projected
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Nudge Cards Component ──────────────────────────────── */
interface Nudge {
  id: string;
  title: string;
  content: string;
  action_label: string | null;
  action_url: string | null;
}

function NudgeCards({ authorId }: { authorId: string | null }) {
  const navigate = useNavigate();
  const [nudges, setNudges] = useState<Nudge[]>([]);

  useEffect(() => {
    if (!authorId) return;
    const fetchNudges = () => {
      supabase
        .from("abby_nudges")
        .select("id, title, content, action_label, action_url")
        .eq("author_id", authorId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(3)
        .then(({ data }) => setNudges((data as Nudge[]) || []));
    };
    fetchNudges();

    const channel = supabase
      .channel("revenue-nudges")
      .on("postgres_changes", { event: "*", schema: "public", table: "abby_nudges", filter: `author_id=eq.${authorId}` }, fetchNudges)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authorId]);

  const dismiss = async (id: string) => {
    await supabase.from("abby_nudges").update({ is_read: true }).eq("id", id);
    setNudges((prev) => prev.filter((n) => n.id !== id));
  };

  if (nudges.length === 0) return null;

  return (
    <div className="space-y-3">
      {nudges.map((nudge) => (
        <Card key={nudge.id} className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-amber-200/50 dark:bg-amber-800/30 flex items-center justify-center mt-0.5">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground mb-1">{nudge.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{nudge.content}</p>
                {nudge.action_label && nudge.action_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => navigate(nudge.action_url!)}
                  >
                    {nudge.action_label}
                  </Button>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => dismiss(nudge.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
