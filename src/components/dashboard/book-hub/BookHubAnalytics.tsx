import { BarChart3, Lock, LineChart, TrendingUp, Eye } from "lucide-react";
import type { SubscriptionTier } from "@/hooks/useAuth";
import { hasTierAccess } from "@/hooks/useAuth";

interface Props {
  bookId: string;
  tier: SubscriptionTier;
}

export default function BookHubAnalytics({ bookId, tier }: Props) {
  const hasAccess = hasTierAccess(tier, "build");

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center relative overflow-hidden">
        {/* Blurred mockup preview */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-3 gap-4 w-full max-w-lg opacity-10 blur-sm px-8">
            <div className="rounded-lg bg-muted h-20" />
            <div className="rounded-lg bg-muted h-20" />
            <div className="rounded-lg bg-muted h-20" />
            <div className="col-span-2 rounded-lg bg-muted h-32" />
            <div className="rounded-lg bg-muted h-32" />
          </div>
        </div>

        <div className="relative z-10">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="font-heading font-bold text-lg mb-1">Analytics</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Analytics available on Pro and Enterprise plans. Upgrade to see detailed traffic, conversion, and revenue analytics for your products.
          </p>
          <a
            href="/dashboard?section=build-business"
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 transition-colors"
          >
            Upgrade to Pro →
          </a>
        </div>
      </div>
    );
  }

  // Pro/Enterprise — show analytics (empty state if no data yet)
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Microsite Views", value: "—", icon: Eye, color: "text-blue-600" },
          { label: "Product Views", value: "—", icon: BarChart3, color: "text-violet-600" },
          { label: "Purchases", value: "—", icon: TrendingUp, color: "text-emerald-600" },
          { label: "Revenue", value: "—", icon: LineChart, color: "text-secondary" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
        <h3 className="font-heading font-bold text-lg mb-1">No analytics data yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Publish your first product to start tracking performance. Your analytics will show views, clicks, purchases, and revenue for each product.
        </p>
      </div>
    </div>
  );
}
