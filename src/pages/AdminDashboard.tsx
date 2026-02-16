import { useEffect, useState, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  CheckCircle2, XCircle, Clock, Loader2, LogOut, ExternalLink,
  Users, BookOpen, BarChart3, ShieldCheck, UserPlus, UserMinus,
} from "lucide-react";

type Tab = "overview" | "submissions" | "users" | "books" | "admins";

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pending", icon: Clock, className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-green-100 text-green-800 border-green-200" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-red-100 text-red-800 border-red-200" },
};

export default function AdminDashboard() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("overview");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Overview
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Submissions
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsFilter, setSubsFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Books
  const [books, setBooks] = useState<any[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);

  // Admins
  const [admins, setAdmins] = useState<any[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoting, setPromoting] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try { setStats(await adminApi.stats()); } catch { toast({ title: "Failed to load stats", variant: "destructive" }); }
    setStatsLoading(false);
  }, []);

  const fetchSubmissions = useCallback(async () => {
    setSubsLoading(true);
    try {
      const data = await adminApi.listSubmissions(undefined, subsFilter === "all" ? undefined : subsFilter);
      setSubmissions(data?.submissions || data?.data || []);
    } catch { toast({ title: "Failed to load submissions", variant: "destructive" }); }
    setSubsLoading(false);
  }, [subsFilter]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await adminApi.listUsers();
      setUsers(data?.users || data?.data || []);
    } catch { toast({ title: "Failed to load users", variant: "destructive" }); }
    setUsersLoading(false);
  }, []);

  const fetchBooks = useCallback(async () => {
    setBooksLoading(true);
    try {
      const data = await adminApi.listBooks();
      setBooks(data?.books || data?.data || []);
    } catch { toast({ title: "Failed to load books", variant: "destructive" }); }
    setBooksLoading(false);
  }, []);

  const fetchAdmins = useCallback(async () => {
    setAdminsLoading(true);
    try {
      const data = await adminApi.listAdmins();
      setAdmins(data?.admins || data?.data || []);
    } catch { toast({ title: "Failed to load admins", variant: "destructive" }); }
    setAdminsLoading(false);
  }, []);

  // Check super admin on mount
  useEffect(() => {
    if (!isAdmin) return;
    adminApi.isSuperAdmin().then((data) => setIsSuperAdmin(!!data?.is_super_admin)).catch(() => {});
  }, [isAdmin]);

  // Fetch data when tab changes
  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "overview") fetchStats();
    else if (tab === "submissions") fetchSubmissions();
    else if (tab === "users") fetchUsers();
    else if (tab === "books") fetchBooks();
    else if (tab === "admins") fetchAdmins();
  }, [tab, isAdmin, subsFilter]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await adminApi.updateSubmissionStatus(id, status);
      setSubmissions((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      toast({ title: `Application ${status}` });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
    setUpdatingId(null);
  };

  const handlePromote = async () => {
    if (!promoteEmail.trim()) return;
    setPromoting(true);
    try {
      await adminApi.promoteAdmin(promoteEmail.trim());
      toast({ title: `${promoteEmail} promoted to admin` });
      setPromoteEmail("");
      fetchAdmins();
    } catch (err: any) {
      toast({ title: err.message || "Promotion failed", variant: "destructive" });
    }
    setPromoting(false);
  };

  const handleDemote = async (userId: string) => {
    try {
      await adminApi.demoteAdmin(userId);
      toast({ title: "Admin demoted" });
      fetchAdmins();
    } catch (err: any) {
      toast({ title: err.message || "Demotion failed", variant: "destructive" });
    }
  };

  if (loading) return null;
  if (!user) return <Navigate to="/admin-login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const tabs: { key: Tab; label: string; icon: typeof BarChart3; superOnly?: boolean }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "submissions", label: "Submissions", icon: Clock },
    { key: "users", label: "Users", icon: Users },
    { key: "books", label: "Books", icon: BookOpen },
    { key: "admins", label: "Admins", icon: ShieldCheck, superOnly: true },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="border-b border-border bg-primary py-10 text-primary-foreground">
        <div className="container flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-primary-foreground/70 text-sm mt-1">Authors Bureau administration</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/10">
              <Link to="/dashboard">Author Dashboard</Link>
            </Button>
            <Button onClick={signOut} variant="outline" size="sm" className="text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/10">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="container flex gap-1 overflow-x-auto py-2">
          {tabs.filter((t) => !t.superOnly || isSuperAdmin).map((t) => {
            const Icon = t.icon;
            return (
              <Button
                key={t.key}
                variant={tab === t.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setTab(t.key)}
                className={tab === t.key ? "bg-secondary text-secondary-foreground" : ""}
              >
                <Icon className="mr-1.5 h-4 w-4" /> {t.label}
              </Button>
            );
          })}
        </div>
      </div>

      <section className="py-8">
        <div className="container">
          {tab === "overview" && <OverviewTab stats={stats} loading={statsLoading} />}
          {tab === "submissions" && (
            <SubmissionsTab
              submissions={submissions}
              loading={subsLoading}
              filter={subsFilter}
              setFilter={setSubsFilter}
              updatingId={updatingId}
              updateStatus={updateStatus}
            />
          )}
          {tab === "users" && <UsersTab users={users} loading={usersLoading} />}
          {tab === "books" && <BooksTab books={books} loading={booksLoading} />}
          {tab === "admins" && (
            <AdminsTab
              admins={admins}
              loading={adminsLoading}
              promoteEmail={promoteEmail}
              setPromoteEmail={setPromoteEmail}
              promoting={promoting}
              handlePromote={handlePromote}
              handleDemote={handleDemote}
            />
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ── Tab Components ── */

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function OverviewTab({ stats, loading }: { stats: any; loading: boolean }) {
  if (loading || !stats) return <LoadingSpinner />;

  const cards = [
    { label: "Total Users", value: stats.total_users ?? stats.users ?? 0, icon: Users },
    { label: "Submissions", value: stats.total_submissions ?? stats.submissions ?? 0, icon: Clock },
    { label: "Books", value: stats.total_books ?? stats.books ?? 0, icon: BookOpen },
    { label: "Admins", value: stats.total_admins ?? stats.admins ?? 0, icon: ShieldCheck },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-3xl font-bold font-heading">{c.value}</p>
          </div>
        );
      })}
    </div>
  );
}

function SubmissionsTab({
  submissions, loading, filter, setFilter, updatingId, updateStatus,
}: {
  submissions: any[]; loading: boolean; filter: string; setFilter: (f: string) => void;
  updatingId: string | null; updateStatus: (id: string, status: string) => void;
}) {
  if (loading) return <LoadingSpinner />;

  return (
    <>
      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "pending", "approved", "rejected"].map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}
            className={filter === f ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : ""}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {submissions.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">No submissions found.</p>
      ) : (
        <div className="space-y-4">
          {submissions.map((app) => {
            const sc = statusConfig[app.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            return (
              <div key={app.id} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-heading font-bold text-lg">{app.full_name}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${sc.className}`}>
                        <StatusIcon className="h-3 w-3" /> {sc.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{app.email}</p>
                    {app.genres && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {(typeof app.genres === "string" ? app.genres.split(",") : app.genres).map((g: string) => (
                          <Badge key={g} variant="secondary" className="text-xs">{g.trim()}</Badge>
                        ))}
                      </div>
                    )}
                    {app.bio && <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{app.bio}</p>}
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
                      <Button size="sm" disabled={updatingId === app.id} onClick={() => updateStatus(app.id, "approved")} className="bg-green-600 hover:bg-green-700 text-white">
                        {updatingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />} Approve
                      </Button>
                    )}
                    {app.status !== "rejected" && (
                      <Button size="sm" variant="outline" disabled={updatingId === app.id} onClick={() => updateStatus(app.id, "rejected")} className="border-red-200 text-red-600 hover:bg-red-50">
                        {updatingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="mr-1 h-4 w-4" />} Reject
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function UsersTab({ users, loading }: { users: any[]; loading: boolean }) {
  if (loading) return <LoadingSpinner />;
  if (users.length === 0) return <p className="text-center text-muted-foreground py-20">No users found.</p>;

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <div key={u.id} className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="font-medium">{u.display_name || u.email}</p>
            <p className="text-sm text-muted-foreground">{u.email}</p>
          </div>
          <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}

function BooksTab({ books, loading }: { books: any[]; loading: boolean }) {
  if (loading) return <LoadingSpinner />;
  if (books.length === 0) return <p className="text-center text-muted-foreground py-20">No books found.</p>;

  return (
    <div className="space-y-3">
      {books.map((b) => (
        <div key={b.id} className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-4">
          {b.cover_image_url && (
            <img src={b.cover_image_url} alt={b.title} className="h-16 w-12 rounded object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{b.title}</p>
            <p className="text-sm text-muted-foreground">{b.author_name}</p>
          </div>
          <p className="text-xs text-muted-foreground shrink-0">{b.genre}</p>
        </div>
      ))}
    </div>
  );
}

function AdminsTab({
  admins, loading, promoteEmail, setPromoteEmail, promoting, handlePromote, handleDemote,
}: {
  admins: any[]; loading: boolean; promoteEmail: string; setPromoteEmail: (v: string) => void;
  promoting: boolean; handlePromote: () => void; handleDemote: (id: string) => void;
}) {
  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 max-w-md">
        <Input
          type="email"
          placeholder="Email to promote..."
          value={promoteEmail}
          onChange={(e) => setPromoteEmail(e.target.value)}
        />
        <Button onClick={handlePromote} disabled={promoting || !promoteEmail.trim()} size="sm">
          {promoting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
          Promote
        </Button>
      </div>

      {admins.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No admins found.</p>
      ) : (
        <div className="space-y-3">
          {admins.map((a) => (
            <div key={a.id || a.user_id} className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-medium">{a.display_name || a.email}</p>
                <p className="text-sm text-muted-foreground">{a.email}</p>
                {a.is_super_admin && <Badge className="mt-1 text-xs">Super Admin</Badge>}
              </div>
              {!a.is_super_admin && (
                <Button variant="outline" size="sm" onClick={() => handleDemote(a.user_id || a.id)} className="border-red-200 text-red-600 hover:bg-red-50">
                  <UserMinus className="h-4 w-4 mr-1" /> Demote
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
