import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, BookOpen, ShieldCheck, ArrowRight, RefreshCw, AlertCircle, UserCheck, Contact } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function OverviewTab({ stats, loading, onRefresh, onNavigate, pendingBookCount = 0, pendingAuthorCount = 0 }: OverviewTabProps) {
  const [crmCount, setCrmCount] = useState(0);
  const [crmWeekCount, setCrmWeekCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { count } = await supabase.from("crm_contacts").select("id", { count: "exact", head: true });
      setCrmCount(count ?? 0);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { count: weekCount } = await supabase
        .from("crm_contacts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo);
      setCrmWeekCount(weekCount ?? 0);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <Button variant="outline" size="sm" onClick={() => onNavigate("users")}>
            <Users className="h-4 w-4 mr-1.5" /> View All Users
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
