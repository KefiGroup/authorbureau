import { useEffect, useState, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth, ADMIN_EMAILS } from "@/hooks/useAuth";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { LogOut, Users, BookOpen, BarChart3, ShieldCheck, Clock, Globe } from "lucide-react";

import OverviewTab from "@/components/admin/OverviewTab";
import SubmissionsTab from "@/components/admin/SubmissionsTab";
import UsersTab from "@/components/admin/UsersTab";
import BooksTab from "@/components/admin/BooksTab";
import AdminsTab from "@/components/admin/AdminsTab";
import PlatformAccessTab from "@/components/admin/PlatformAccessTab";

import type { AdminStats, Submission, AdminUser, AdminBook, AdminInfo } from "@/types/admin";

type Tab = "overview" | "submissions" | "users" | "books" | "admins" | "platforms";

export default function AdminDashboard() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("overview");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isPublishNowAdmin, setIsPublishNowAdmin] = useState(false);

  // Overview
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Submissions
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsFilter, setSubsFilter] = useState("all");
  const [subsPage, setSubsPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);

  // Books
  const [books, setBooks] = useState<AdminBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksPage, setBooksPage] = useState(1);

  // Admins
  const [admins, setAdmins] = useState<AdminInfo[]>([]);
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
      const data = await adminApi.listSubmissions(subsPage, subsFilter === "all" ? undefined : subsFilter);
      setSubmissions(data?.submissions || data?.data || []);
    } catch { toast({ title: "Failed to load submissions", variant: "destructive" }); }
    setSubsLoading(false);
  }, [subsFilter, subsPage]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await adminApi.listUsers(usersPage);
      setUsers(data?.users || data?.data || []);
    } catch { toast({ title: "Failed to load users", variant: "destructive" }); }
    setUsersLoading(false);
  }, [usersPage]);

  const fetchBooks = useCallback(async () => {
    setBooksLoading(true);
    try {
      const data = await adminApi.listBooks(booksPage);
      setBooks(data?.books || data?.data || []);
    } catch { toast({ title: "Failed to load books", variant: "destructive" }); }
    setBooksLoading(false);
  }, [booksPage]);

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
    adminApi.checkPublishNowAdmin().then((data) => setIsPublishNowAdmin(!!data?.is_super_admin)).catch(() => {});
  }, [isAdmin]);

  // Fetch data when tab/page/filter changes
  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "overview") fetchStats();
    else if (tab === "submissions") fetchSubmissions();
    else if (tab === "users") fetchUsers();
    else if (tab === "books") fetchBooks();
    else if (tab === "admins") fetchAdmins();
  }, [tab, isAdmin, subsFilter, subsPage, usersPage, booksPage]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await adminApi.updateSubmissionStatus(id, status);
      setSubmissions((prev) => prev.map((a) => (a.id === id ? { ...a, status: status as Submission["status"] } : a)));
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

  const handleNavigate = (targetTab: string, filter?: string) => {
    setTab(targetTab as Tab);
    if (filter && targetTab === "submissions") setSubsFilter(filter);
  };

  if (loading) return null;
  if (!user) return <Navigate to="/admin-login" replace />;
  if (!isAdmin && !ADMIN_EMAILS.includes(user?.email?.toLowerCase() ?? "")) return <Navigate to="/dashboard" replace />;

  const tabs: { key: Tab; label: string; icon: typeof BarChart3; superOnly?: boolean; pnAdminOnly?: boolean }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "submissions", label: "Submissions", icon: Clock },
    { key: "users", label: "Users", icon: Users },
    { key: "books", label: "Books", icon: BookOpen },
    { key: "admins", label: "Admins", icon: ShieldCheck, superOnly: true },
    { key: "platforms", label: "Platforms", icon: Globe, pnAdminOnly: true },
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
          {tabs.filter((t) => (!t.superOnly || isSuperAdmin) && (!t.pnAdminOnly || isPublishNowAdmin)).map((t) => {
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
          {tab === "overview" && (
            <OverviewTab stats={stats} loading={statsLoading} onRefresh={fetchStats} onNavigate={handleNavigate} />
          )}
          {tab === "submissions" && (
            <SubmissionsTab
              submissions={submissions}
              loading={subsLoading}
              filter={subsFilter}
              setFilter={setSubsFilter}
              updatingId={updatingId}
              updateStatus={updateStatus}
              onRefresh={fetchSubmissions}
              page={subsPage}
              setPage={setSubsPage}
            />
          )}
          {tab === "users" && (
            <UsersTab users={users} loading={usersLoading} onRefresh={fetchUsers} page={usersPage} setPage={setUsersPage} />
          )}
          {tab === "books" && (
            <BooksTab books={books} loading={booksLoading} onRefresh={fetchBooks} page={booksPage} setPage={setBooksPage} />
          )}
          {tab === "platforms" && <PlatformAccessTab />}
          {tab === "admins" && (
            <AdminsTab
              admins={admins}
              loading={adminsLoading}
              promoteEmail={promoteEmail}
              setPromoteEmail={setPromoteEmail}
              promoting={promoting}
              handlePromote={handlePromote}
              handleDemote={handleDemote}
              onRefresh={fetchAdmins}
            />
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
