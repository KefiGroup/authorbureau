import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useStripeConnect } from "./StripeConnectBanner";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign, TrendingUp, CreditCard, Percent,
  BarChart3, Eye, Users, Clock, Globe, Link2, Copy, ArrowRight,
  ShoppingBag, Zap, CheckCircle2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

const MONTHS_DATA = [
  { month: "Oct", gross: 0, net: 0 },
  { month: "Nov", gross: 0, net: 0 },
  { month: "Dec", gross: 0, net: 0 },
  { month: "Jan", gross: 0, net: 0 },
  { month: "Feb", gross: 0, net: 0 },
  { month: "Mar", gross: 0, net: 0 },
];

const TRAFFIC_SOURCES = [
  { source: "Direct", visits: 0, pct: 0 },
  { source: "Social Media", visits: 0, pct: 0 },
  { source: "Search Engines", visits: 0, pct: 0 },
  { source: "Authors Bureau Directory", visits: 0, pct: 0 },
  { source: "Reading Club", visits: 0, pct: 0 },
  { source: "Email Links", visits: 0, pct: 0 },
  { source: "Referral", visits: 0, pct: 0 },
];

interface Props {
  onNavigate?: (section: string) => void;
  authorSlug?: string;
}

export default function RevenueDashboard({ onNavigate, authorSlug }: Props) {
  const { isPremium, isAdmin, tier, user } = useAuth();
  const { onboarding_complete } = useStripeConnect();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("revenue");
  const [slug, setSlug] = useState(authorSlug || "");
  const [funnelStats, setFunnelStats] = useState({ count: 0, views: 0, conversions: 0 });
  const [leadsCount, setLeadsCount] = useState(0);

  // Fetch author slug + funnel stats + leads
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("author_profiles")
        .select("id, author_slug")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!authorSlug && profile?.author_slug) setSlug(profile.author_slug);
      if (profile?.id) {
        const [{ data: funnels }, { count: lc }] = await Promise.all([
          supabase
            .from("funnels")
            .select("page_views, conversions")
            .eq("author_id", profile.id)
            .eq("status", "live"),
          supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("author_id", profile.id),
        ]);
        if (funnels) {
          setFunnelStats({
            count: funnels.length,
            views: funnels.reduce((s, f) => s + (f.page_views || 0), 0),
            conversions: funnels.reduce((s, f) => s + (f.conversions || 0), 0),
          });
        }
        setLeadsCount(lc || 0);
      }
    })();
  }, [user, authorSlug]);

  const hasAccess = isPremium || isAdmin;
  const hasRevenue = false; // TODO: wire to real transactions
  const grossSales = 0;
  const platformFee = grossSales * 0.08;
  const stripeFees = grossSales > 0 ? grossSales * 0.029 + 0.3 : 0;
  const earnings = grossSales - platformFee - stripeFees;

  const micrositeUrl = slug ? `${window.location.origin}/${slug}` : null;
  const funnelConvRate = funnelStats.views > 0 ? (funnelStats.conversions / funnelStats.views) * 100 : 0;

  const copyLink = () => {
    if (micrositeUrl) {
      navigator.clipboard.writeText(micrositeUrl);
      toast({ title: "Link copied!" });
    }
  };

  // Determine the correct next step based on user state
  const getNextStep = () => {
    if (!hasAccess) {
      return { label: "Subscribe to a Plan", action: () => onNavigate?.("overview"), icon: CreditCard };
    }
    if (!onboarding_complete) {
      return { label: "Connect Stripe to Track Revenue", action: () => onNavigate?.("connect-stripe"), icon: CreditCard };
    }
    return { label: "Publish Your First Product", action: () => onNavigate?.("revenue-streams"), icon: ShoppingBag };
  };

  const nextStep = getNextStep();

  return (
    <div className="max-w-6xl space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-8 mt-4">
          <div>
            <h2 className="font-heading text-2xl font-bold">Revenue Dashboard</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {hasAccess ? "Track your earnings across all products." : "Subscribe to start tracking your revenue."}
            </p>
          </div>

          {/* Stat cards */}
          {grossSales > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Gross Sales This Month", value: `$${grossSales.toFixed(2)}`, icon: DollarSign, color: "text-accent" },
                { label: "Platform Fee (5%)", value: `$${platformFee.toFixed(2)}`, icon: Percent, color: "text-muted-foreground" },
                { label: "Stripe Fees", value: `$${stripeFees.toFixed(2)}`, icon: CreditCard, color: "text-muted-foreground" },
                { label: "Your Earnings", value: `$${earnings.toFixed(2)}`, icon: TrendingUp, color: "text-accent font-bold" },
              ].map((stat) => (
                <Card key={stat.label} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-[11px] text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className={`text-xl font-heading font-bold ${stat.color}`}>{stat.value}</p>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Gross Sales", value: "—", icon: DollarSign, color: "text-muted-foreground" },
                { label: "Your Earnings", value: "—", icon: TrendingUp, color: "text-muted-foreground" },
              ].map((stat) => (
                <Card key={stat.label} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-[11px] text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className={`text-xl font-heading font-bold ${stat.color}`}>{stat.value}</p>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state guidance */}
          {!hasRevenue && (
            <Card className="p-8 text-center border-dashed space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto">
                <BarChart3 className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold">No Revenue Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                  {!hasAccess
                    ? "Subscribe to a plan to unlock product builders and start earning."
                    : !onboarding_complete
                    ? "Connect your Stripe account to start accepting payments and tracking revenue."
                    : "Publish your first product to begin seeing revenue data here."}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <Button
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  onClick={nextStep.action}
                >
                  <nextStep.icon className="h-4 w-4 mr-1.5" />
                  {nextStep.label} <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              {hasAccess && onboarding_complete && (
                <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-accent" /> Subscribed</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-accent" /> Stripe Connected</span>
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-muted-foreground" /> Awaiting first sale</span>
                </div>
              )}
            </Card>
          )}

          {/* Charts (shown even when empty to establish the layout) */}
          <Card className="p-5">
            <h3 className="font-heading font-semibold text-sm mb-4">Monthly Earnings (Last 6 Months)</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MONTHS_DATA}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} padding={{ left: 10, right: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="gross" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} name="Gross Sales" />
                  <Line type="monotone" dataKey="net" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={false} name="Your Earnings" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Category breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: "B·Brand Products", color: "text-accent", accent: "bg-accent/15", revenue: 0, products: 0 },
              { label: "B·Build Authority", color: "text-violet-500", accent: "bg-violet-500/15", revenue: 0, products: 0 },
              { label: "Y·Yield Revenue", color: "text-secondary", accent: "bg-secondary/15", revenue: 0, products: 0 },
            ].map((cat) => (
              <Card key={cat.label} className="p-4">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cat.color} ${cat.accent} mb-2`}>
                  {cat.label}
                </span>
                <p className="text-lg font-heading font-bold">${cat.revenue.toFixed(0)}</p>
                <p className="text-[11px] text-muted-foreground">{cat.products > 0 ? `from ${cat.products} products` : "No products built yet"}</p>
              </Card>
            ))}
          </div>

          {/* Funnels performance */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-secondary" />
                  Funnel Performance
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Live opt-in & lead capture pages built by ABBY</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate?.("my-funnels")}>
                Manage Funnels <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/40">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Live Funnels</p>
                <p className="text-2xl font-heading font-bold mt-1">{funnelStats.count}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Views</p>
                <p className="text-2xl font-heading font-bold mt-1">{funnelStats.views.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversions</p>
                <p className="text-2xl font-heading font-bold mt-1 text-accent">
                  {funnelStats.conversions.toLocaleString()}
                  {funnelStats.views > 0 && (
                    <span className="text-xs text-muted-foreground font-normal ml-1.5">({funnelConvRate.toFixed(1)}%)</span>
                  )}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/30">
                <p className="text-[10px] text-secondary uppercase tracking-wider font-semibold">Leads in CRM</p>
                <p className="text-2xl font-heading font-bold mt-1 text-secondary">{leadsCount.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="traffic" className="mt-4">
          <TrafficTab micrositeUrl={micrositeUrl} onCopyLink={copyLink} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TrafficTab({ micrositeUrl, onCopyLink }: { micrositeUrl: string | null; onCopyLink: () => void }) {
  const hasTraffic = false; // TODO: wire to real analytics

  if (!hasTraffic) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Eye className="h-8 w-8 text-primary" />
        </div>
        <h2 className="font-heading text-2xl font-bold">Author's Page Traffic</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
          Your microsite traffic data will appear here once your microsite starts receiving visitors.
          Share your microsite link to start driving traffic.
        </p>
        {micrositeUrl && (
          <div className="flex items-center gap-2 justify-center">
            <code className="text-xs bg-muted rounded-lg px-3 py-2 text-muted-foreground max-w-sm truncate">
              {micrositeUrl}
            </code>
            <Button size="sm" variant="outline" onClick={onCopyLink}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(micrositeUrl, "_blank")}>
              <Globe className="h-3.5 w-3.5 mr-1" /> Visit
            </Button>
          </div>
        )}
        {!micrositeUrl && (
          <p className="text-xs text-muted-foreground">
            Set up your author profile to get your microsite URL.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold">Author's Page Traffic</h2>
        <p className="text-sm text-muted-foreground mt-1">Visitor analytics for your author microsite.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Page Views", value: "0", icon: Eye, color: "text-primary" },
          { label: "Unique Visitors", value: "0", icon: Users, color: "text-secondary" },
          { label: "Avg. Time on Page", value: "0s", icon: Clock, color: "text-muted-foreground" },
          { label: "Top Referrer", value: "—", icon: Link2, color: "text-muted-foreground" },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-[11px] text-muted-foreground">{stat.label}</span>
            </div>
            <p className={`text-xl font-heading font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="font-heading font-semibold text-sm mb-4">Traffic Sources</h3>
        <div className="space-y-3">
          {TRAFFIC_SOURCES.map((s) => (
            <div key={s.source} className="flex items-center justify-between">
              <span className="text-sm">{s.source}</span>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-secondary" style={{ width: `${s.pct}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{s.visits}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
