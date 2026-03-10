import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useStripeConnect } from "./StripeConnectBanner";
import {
  DollarSign, TrendingUp, CreditCard, Percent,
  BarChart3, Eye, Users, MousePointer, UserPlus, ArrowRight,
  Clock, Globe, Link2, Copy,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
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

const DAILY_VIEWS = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  views: 0,
  visitors: 0,
}));

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
  const { isPremium, tier } = useAuth();
  const { onboarding_complete } = useStripeConnect();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("revenue");

  const hasRevenue = false;
  const grossSales = 0;
  const platformFee = grossSales * 0.05;
  const stripeFees = grossSales > 0 ? grossSales * 0.029 + 0.3 : 0;
  const earnings = grossSales - platformFee - stripeFees;

  const micrositeUrl = authorSlug
    ? `${window.location.origin}/authors/${authorSlug}`
    : null;

  const copyLink = () => {
    if (micrositeUrl) {
      navigator.clipboard.writeText(micrositeUrl);
      toast({ title: "Link copied!" });
    }
  };

  // Empty state for revenue
  if (!hasRevenue && activeTab === "revenue") {
    const nextStep = !isPremium
      ? { label: "Subscribe to a Plan", action: () => onNavigate?.("overview") }
      : !onboarding_complete
      ? { label: "Connect Stripe", action: () => onNavigate?.("connect-stripe") }
      : { label: "Build Your First Product", action: () => onNavigate?.("revenue-streams") };

    return (
      <div className="max-w-6xl space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <div className="max-w-3xl mx-auto py-16 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto">
                <BarChart3 className="h-8 w-8 text-secondary" />
              </div>
              <h2 className="font-heading text-2xl font-bold">Your Revenue Dashboard</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                Your revenue dashboard will come alive once you publish your first product and make a sale.
                You're just a few steps away from your first dollar.
              </p>
              <Button
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                onClick={nextStep.action}
              >
                {nextStep.label} <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="traffic">
            <TrafficTab micrositeUrl={micrositeUrl} onCopyLink={copyLink} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

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
            <p className="text-sm text-muted-foreground mt-1">Track your earnings across all products.</p>
          </div>

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

          <Card className="p-5">
            <h3 className="font-heading font-semibold text-sm mb-4">Monthly Earnings (Last 6 Months)</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MONTHS_DATA}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="gross" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} name="Gross Sales" />
                  <Line type="monotone" dataKey="net" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={false} name="Your Earnings" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-heading font-semibold text-sm mb-4">Revenue by Product</h3>
            <p className="text-xs text-muted-foreground py-8 text-center">No products with revenue yet.</p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: "B·Build", color: "text-accent", accent: "bg-accent/15", revenue: 0, products: 0 },
              { label: "B·Bridge", color: "text-violet-500", accent: "bg-violet-500/15", revenue: 0, products: 0 },
              { label: "Y·Yield", color: "text-secondary", accent: "bg-secondary/15", revenue: 0, products: 0 },
            ].map((cat) => (
              <Card key={cat.label} className="p-4">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cat.color} ${cat.accent} mb-2`}>
                  {cat.label}
                </span>
                <p className="text-lg font-heading font-bold">${cat.revenue.toFixed(0)}</p>
                <p className="text-[11px] text-muted-foreground">from {cat.products} products</p>
              </Card>
            ))}
          </div>
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
        <h2 className="font-heading text-2xl font-bold">Microsite Traffic</h2>
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
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold">Microsite Traffic</h2>
        <p className="text-sm text-muted-foreground mt-1">Visitor analytics for your author microsite.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Page Views", value: "0", icon: Eye, color: "text-primary" },
          { label: "Unique Visitors", value: "0", icon: Users, color: "text-secondary" },
          { label: "Avg. Time on Page", value: "0s", icon: Clock, color: "text-muted-foreground" },
          { label: "Top Referrer", value: "—", icon: Link2, color: "text-muted-foreground", isText: true },
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
        <h3 className="font-heading font-semibold text-sm mb-4">Daily Traffic (Last 30 Days)</h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={DAILY_VIEWS}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} name="Page Views" />
              <Line type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Unique Visitors" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-heading font-semibold text-sm mb-4">Traffic Sources</h3>
        <div className="space-y-3">
          {TRAFFIC_SOURCES.map((s) => (
            <div key={s.source} className="flex items-center justify-between">
              <span className="text-sm">{s.source}</span>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-secondary"
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{s.visits}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-heading font-semibold text-sm mb-4">Top Pages</h3>
        <p className="text-xs text-muted-foreground py-6 text-center">
          No page view data available yet. Share your microsite to start tracking.
        </p>
      </Card>
    </div>
  );
}
