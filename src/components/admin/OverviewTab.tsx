import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, BookOpen, ShieldCheck, ArrowRight, RefreshCw, AlertCircle, UserCheck, Contact, Package, DollarSign, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AdminStats, Submission } from "@/types/admin";

interface OverviewTabProps {
  stats: AdminStats | null;
  loading: boolean;
  onRefresh: () => void;
  onNavigate: (tab: string, filter?: string) => void;
  pendingBookCount?: number;
  pendingAuthorCount?: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

interface ProductCounts {
  courses: number;
  homeStudy: number;
  webinars: number;
  audiobooks: number;
  podcasts: number;
  workbooks: number;
  socialMedia: number;
  emailFlows: number;
  coaching: number;
}

interface AIUsageStats {
  totalTokens: number;
  totalCost: number;
  topFeatures: { feature: string; tokens: number }[];
  last7DaysTokens: number;
}

export default function OverviewTab({ stats, loading, onRefresh, onNavigate, pendingBookCount = 0, pendingAuthorCount = 0 }: OverviewTabProps) {
  const [crmCount, setCrmCount] = useState(0);
  const [crmWeekCount, setCrmWeekCount] = useState(0);
  const [productCounts, setProductCounts] = useState<ProductCounts | null>(null);
  const [aiUsage, setAiUsage] = useState<AIUsageStats | null>(null);
  const [subscriberCount, setSubscriberCount] = useState(0);

  useEffect(() => {
    (async () => {
      // CRM counts
      const { count } = await supabase.from("crm_contacts").select("id", { count: "exact", head: true });
      setCrmCount(count ?? 0);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { count: weekCount } = await supabase
        .from("crm_contacts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo);
      setCrmWeekCount(weekCount ?? 0);

      // Product counts (parallel)
      const tables = [
        "courses", "home_study_courses", "webinars", "audiobooks",
        "podcasts", "workbooks", "social_media_content", "email_flows", "coaching_packages",
      ] as const;

      const countPromises = tables.map((t) =>
        supabase.from(t).select("id", { count: "exact", head: true }).then((r) => r.count ?? 0)
      );
      const counts = await Promise.all(countPromises);
      setProductCounts({
        courses: counts[0],
        homeStudy: counts[1],
        webinars: counts[2],
        audiobooks: counts[3],
        podcasts: counts[4],
        workbooks: counts[5],
        socialMedia: counts[6],
        emailFlows: counts[7],
        coaching: counts[8],
      });

      // Subscriber count
      const { count: subCount } = await supabase
        .from("author_subscribers")
        .select("id", { count: "exact", head: true });
      setSubscriberCount(subCount ?? 0);

      // AI usage stats
      try {
        const { data: usageRows } = await supabase
          .from("ai_usage_logs" as any)
          .select("feature, total_tokens, cost_estimate, created_at")
          .order("created_at", { ascending: false })
          .limit(1000);

        if (usageRows && usageRows.length > 0) {
          const totalTokens = usageRows.reduce((sum: number, r: any) => sum + (r.total_tokens || 0), 0);
          const totalCost = usageRows.reduce((sum: number, r: any) => sum + parseFloat(r.cost_estimate || 0), 0);
          const last7 = usageRows
            .filter((r: any) => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000))
            .reduce((sum: number, r: any) => sum + (r.total_tokens || 0), 0);

          // Top features by token usage
          const featureMap: Record<string, number> = {};
          usageRows.forEach((r: any) => {
            featureMap[r.feature] = (featureMap[r.feature] || 0) + (r.total_tokens || 0);
          });
          const topFeatures = Object.entries(featureMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([feature, tokens]) => ({ feature, tokens }));

          setAiUsage({ totalTokens, totalCost, topFeatures, last7DaysTokens: last7 });
        } else {
          setAiUsage({ totalTokens: 0, totalCost: 0, topFeatures: [], last7DaysTokens: 0 });
        }
      } catch {
        setAiUsage({ totalTokens: 0, totalCost: 0, topFeatures: [], last7DaysTokens: 0 });
      }
    })();
  }, [stats]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingCount = stats.pending_submissions ?? 0;
  const totalProducts = productCounts
    ? Object.values(productCounts).reduce((a, b) => a + b, 0)
    : 0;

  const cards = [
    {
      label: "Books",
      value: stats.total_books ?? stats.books ?? 0,
      icon: BookOpen,
      action: () => onNavigate("books"),
      badge: pendingBookCount > 0 ? `${pendingBookCount} pending` : undefined,
    },
    {
      label: "Authors",
      value: stats.total_users ?? 0,
      icon: UserCheck,
      action: () => onNavigate("authors"),
      badge: pendingAuthorCount > 0 ? `${pendingAuthorCount} unlisted` : undefined,
    },
    {
      label: "Published Products",
      value: totalProducts,
      icon: Package,
      action: () => onNavigate("books"),
    },
    { label: "Admins", value: stats.total_admins ?? stats.admins ?? 0, icon: ShieldCheck, action: () => onNavigate("admins") },
    {
      label: "CRM Contacts",
      value: crmCount,
      icon: Contact,
      action: () => onNavigate("crm"),
      badge: crmWeekCount > 0 ? `${crmWeekCount} this week` : undefined,
    },
  ];

  const recentSubmissions: Submission[] = stats.recent_submissions ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold">Overview</h2>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.label}
              onClick={c.action}
              className="rounded-xl border border-border bg-card p-6 shadow-sm text-left hover:border-secondary/50 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon className="h-5 w-5 text-muted-foreground group-hover:text-secondary transition-colors" />
                <span className="text-sm text-muted-foreground">{c.label}</span>
                {c.badge && (
                  <Badge variant="destructive" className="text-xs ml-auto">
                    {c.badge}
                  </Badge>
                )}
              </div>
              <p className="text-3xl font-bold font-heading">{c.value}</p>
            </button>
          );
        })}
      </div>

      {/* Revenue & Subscriptions Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-secondary" />
            <h3 className="font-heading font-bold">Revenue & Subscriptions</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Subscribers</p>
              <p className="text-2xl font-bold font-heading">{subscriberCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Products</p>
              <p className="text-2xl font-bold font-heading">{totalProducts}</p>
            </div>
          </div>
          {productCounts && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product Breakdown</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { label: "Courses", count: productCounts.courses },
                  { label: "Home Study", count: productCounts.homeStudy },
                  { label: "Webinars", count: productCounts.webinars },
                  { label: "Audiobooks", count: productCounts.audiobooks },
                  { label: "Podcasts", count: productCounts.podcasts },
                  { label: "Workbooks", count: productCounts.workbooks },
                  { label: "Social Content", count: productCounts.socialMedia },
                  { label: "Email Flows", count: productCounts.emailFlows },
                  { label: "Coaching", count: productCounts.coaching },
                ].map((p) => (
                  <div key={p.label} className="flex justify-between bg-muted/50 rounded px-2 py-1">
                    <span className="text-muted-foreground">{p.label}</span>
                    <span className="font-semibold">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* AI Usage Panel */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-secondary" />
            <h3 className="font-heading font-bold">AI Usage Dashboard</h3>
          </div>
          {aiUsage ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Tokens Used</p>
                  <p className="text-2xl font-bold font-heading">
                    {aiUsage.totalTokens > 1_000_000
                      ? `${(aiUsage.totalTokens / 1_000_000).toFixed(1)}M`
                      : aiUsage.totalTokens > 1_000
                      ? `${(aiUsage.totalTokens / 1_000).toFixed(1)}K`
                      : aiUsage.totalTokens}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last 7 Days</p>
                  <p className="text-2xl font-bold font-heading">
                    {aiUsage.last7DaysTokens > 1_000
                      ? `${(aiUsage.last7DaysTokens / 1_000).toFixed(1)}K`
                      : aiUsage.last7DaysTokens}
                  </p>
                </div>
              </div>
              {aiUsage.topFeatures.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Features by Usage</p>
                  {aiUsage.topFeatures.map((f) => (
                    <div key={f.feature} className="flex justify-between items-center text-xs bg-muted/50 rounded px-2 py-1.5">
                      <span className="text-muted-foreground capitalize">{f.feature.replace(/_/g, " ")}</span>
                      <span className="font-semibold">
                        {f.tokens > 1_000 ? `${(f.tokens / 1_000).toFixed(1)}K` : f.tokens} tokens
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {aiUsage.totalTokens === 0 && (
                <p className="text-xs text-muted-foreground italic">No AI usage recorded yet. Usage will appear here as authors use AI builders.</p>
              )}
            </>
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
        <div className="flex gap-3 flex-wrap">
          {pendingBookCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onNavigate("books", "pending")}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <BookOpen className="h-4 w-4 mr-1.5" />
              Review {pendingBookCount} Pending Book{pendingBookCount !== 1 ? "s" : ""}
            </Button>
          )}
          {pendingAuthorCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onNavigate("authors")}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <UserCheck className="h-4 w-4 mr-1.5" />
              Review {pendingAuthorCount} Unlisted Author{pendingAuthorCount !== 1 ? "s" : ""}
            </Button>
          )}
          {pendingCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onNavigate("submissions", "pending")}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <AlertCircle className="h-4 w-4 mr-1.5" />
              Review {pendingCount} Pending Submission{pendingCount !== 1 ? "s" : ""}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onNavigate("authors")}>
            <UserCheck className="h-4 w-4 mr-1.5" /> View All Authors
          </Button>
        </div>
      </div>

      {/* Recent Activity */}
      {recentSubmissions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Recent Submissions
            </h3>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("submissions")} className="text-xs">
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {recentSubmissions.slice(0, 5).map((sub) => (
              <div
                key={sub.id}
                className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{sub.full_name}</p>
                  <p className="text-xs text-muted-foreground">{sub.email}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[sub.status] || statusColors.pending}`}>
                    {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {new Date(sub.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
