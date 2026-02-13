import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle2, XCircle, Clock, Loader2, LogOut, ExternalLink } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Application = Tables<"author_applications">;

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pending", icon: Clock, className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-green-100 text-green-800 border-green-200" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-red-100 text-red-800 border-red-200" },
};

export default function AdminDashboard() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) fetchApplications();
  }, [isAdmin]);

  const fetchApplications = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from("author_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load applications", variant: "destructive" });
    } else {
      setApplications(data || []);
    }
    setFetching(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    const { error } = await supabase
      .from("author_applications")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "Update failed", variant: "destructive" });
    } else {
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status } : app))
      );
      toast({ title: `Application ${status}` });
    }
    setUpdatingId(null);
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <section className="py-20 text-center">
          <h1 className="font-heading text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have admin privileges.</p>
          <Button onClick={signOut} variant="outline" className="mt-4">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </section>
        <Footer />
      </div>
    );
  }

  const filtered = filter === "all" ? applications : applications.filter((a) => a.status === filter);

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="border-b border-border bg-primary py-10 text-primary-foreground">
        <div className="container flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-primary-foreground/70 text-sm mt-1">
              {applications.length} total application{applications.length !== 1 && "s"}
            </p>
          </div>
          <Button onClick={signOut} variant="outline" size="sm" className="text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/10">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </section>

      <section className="py-8">
        <div className="container">
          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {["all", "pending", "approved", "rejected"].map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className={filter === f ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : ""}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== "all" && (
                  <span className="ml-1.5 text-xs opacity-70">
                    ({applications.filter((a) => f === "all" || a.status === f).length})
                  </span>
                )}
              </Button>
            ))}
          </div>

          {fetching ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">No applications found.</p>
          ) : (
            <div className="space-y-4">
              {filtered.map((app) => {
                const sc = statusConfig[app.status] || statusConfig.pending;
                const StatusIcon = sc.icon;
                return (
                  <div
                    key={app.id}
                    className="rounded-xl border border-border bg-card p-6 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="font-heading font-bold text-lg">{app.full_name}</h3>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${sc.className}`}>
                            <StatusIcon className="h-3 w-3" />
                            {sc.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{app.email}</p>
                        {app.genres && (
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {app.genres.split(",").map((g) => (
                              <Badge key={g} variant="secondary" className="text-xs">
                                {g.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {app.bio && (
                          <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{app.bio}</p>
                        )}
                        <div className="flex gap-3 mt-3 flex-wrap text-xs">
                          {app.amazon_book_url && (
                            <a href={app.amazon_book_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-secondary hover:underline">
                              <ExternalLink className="h-3 w-3" /> Amazon
                            </a>
                          )}
                          {app.website_url && (
                            <a href={app.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-secondary hover:underline">
                              <ExternalLink className="h-3 w-3" /> Website
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground/60 mt-2">
                          Applied {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        {app.status !== "approved" && (
                          <Button
                            size="sm"
                            disabled={updatingId === app.id}
                            onClick={() => updateStatus(app.id, "approved")}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {updatingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                            Approve
                          </Button>
                        )}
                        {app.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingId === app.id}
                            onClick={() => updateStatus(app.id, "rejected")}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            {updatingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="mr-1 h-4 w-4" />}
                            Reject
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
