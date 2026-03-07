import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useStripeConnect } from "./StripeConnectBanner";
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, Percent,
  BarChart3, Eye, Users, MousePointer, UserPlus, ArrowRight,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

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
  views: Math.floor(Math.random() * 20),
}));

const PIE_COLORS = ["hsl(142,71%,45%)", "hsl(263,70%,50%)", "hsl(38,92%,50%)"];

interface Props {
  onNavigate?: (section: string) => void;
}

export default function RevenueDashboard({ onNavigate }: Props) {
  const { isPremium, tier } = useAuth();
  const { onboarding_complete } = useStripeConnect();

  const hasRevenue = false; // TODO: wire to real Stripe data
  const grossSales = 0;
  const platformFee = grossSales * 0.05;
  const stripeFees = grossSales > 0 ? grossSales * 0.029 + 0.3 : 0;
  const earnings = grossSales - platformFee - stripeFees;

  // Empty state
  if (!hasRevenue) {
    const nextStep = !isPremium
      ? { label: "Subscribe to a Plan", action: () => onNavigate?.("overview") }
      : !onboarding_complete
      ? { label: "Connect Stripe", action: () => onNavigate?.("overview") }
      : { label: "Build Your First Product", action: () => onNavigate?.("build-business") };

    return (
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
    );
  }

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold">Revenue Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Track your earnings across all products.</p>
      </div>

      {/* Section A: Revenue Summary */}
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

      {/* Monthly Chart */}
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

      {/* Section B: Revenue by Product */}
      <Card className="p-5">
        <h3 className="font-heading font-semibold text-sm mb-4">Revenue by Product</h3>
        <p className="text-xs text-muted-foreground py-8 text-center">No products with revenue yet. Publish your first product to see data here.</p>
      </Card>

      {/* Section C: Revenue by Category */}
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

      {/* Section D: Microsite Traffic */}
      <div>
        <h3 className="font-heading font-semibold text-sm mb-3">Microsite Traffic</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Page Views", value: "0", change: null, icon: Eye },
            { label: "Unique Visitors", value: "0", change: null, icon: Users },
            { label: "Click-Through Rate", value: "0%", change: null, icon: MousePointer },
            { label: "Leads Captured", value: "0", change: null, icon: UserPlus },
          ].map((stat) => (
            <Card key={stat.label} className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-lg font-heading font-bold">{stat.value}</p>
              {stat.change && (
                <span className="text-[10px] text-accent flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> {stat.change}
                </span>
              )}
            </Card>
          ))}
        </div>
        <Card className="p-5">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3">Daily Page Views (Last 30 Days)</h4>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DAILY_VIEWS}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="views" fill="hsl(var(--secondary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
