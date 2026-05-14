import { useEffect, useState, useCallback } from "react";
import { Navigate, Link, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, BarChart3, ShieldCheck, Globe, UserCheck, Users, BookMarked, Headphones, MessageSquare, Wallet, ToggleRight } from "lucide-react";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { useAuthReady } from "@/hooks/useAuthReady";
import logoIcon from "@/assets/logo-icon.webp";

import OverviewTab from "@/components/admin/OverviewTab";
import BooksTab from "@/components/admin/BooksTab";
import AdminsTab from "@/components/admin/AdminsTab";
import PlatformAccessTab from "@/components/admin/PlatformAccessTab";
import AuthorsTab from "@/components/admin/AuthorsTab";
import AdminCRMTab from "@/components/admin/AdminCRMTab";
import ReadingClubTab from "@/components/admin/ReadingClubTab";
import SupportTab from "@/components/admin/SupportTab";
import AdminMessagesTab from "@/components/admin/AdminMessagesTab";
import AdminPayoutsDashboard from "@/components/admin/AdminPayoutsDashboard";
import NodeGatingTab from "@/components/admin/NodeGatingTab";
import AdminNotificationBell from "@/components/admin/AdminNotificationBell";
import AuditLogTab from "@/components/admin/AuditLogTab";
import ErrorsTab from "@/components/admin/ErrorsTab";
import DailyAuditTab from "@/components/admin/DailyAuditTab";
import { FileSearch, AlertOctagon, Activity } from "lucide-react";

import type { AdminStats, AdminBook, AdminInfo } from "@/types/admin";

type Tab = "overview" | "books" | "authors" | "admins" | "platforms" | "crm" | "messages" | "reading-club" | "support" | "payouts" | "node-gating" | "audit" | "errors" | "daily-audit";

async function adminFetch(action: string, body: Record<string, unknown> = {}, attempt = 0): Promise<any> {
  const token = await getActiveToken({ forceRefresh: attempt > 0 });
  if (!token) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      return adminFetch(action, body, attempt + 1);
    }
    throw new Error("Not authenticated");
  }
  const res = await fetchWithTimeout(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-books`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...body }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Auth failures: retry once with a forced token refresh before giving up.
    if ((res.status === 401 || res.status === 403) && attempt < 1) {
      return adminFetch(action, body, attempt + 1);
    }
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export default function AdminDashboard() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const { isReady: isAuthReady } = useAuthReady();
  const { toast } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const VALID_TABS: Tab[] = ["overview","books","authors","admins","platforms","crm","messages","reading-club","support","payouts","node-gating","audit","errors","daily-audit"];
  const urlTab = searchParams.get("tab") as Tab | null;
  const tab: Tab = (urlTab && VALID_TABS.includes(urlTab) ? urlTab : "overview");
  const setTab = useCallback((next: Tab) => {
    const sp = new URLSearchParams(searchParams);
    if (next === "overview") sp.delete("tab"); else sp.set("tab", next);
    setSearchParams(sp);
  }, [searchParams, setSearchParams]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isPublishNowAdmin, setIsPublishNowAdmin] = useState(false);

  // Overview
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [overviewData, setOverviewData] = useState<any>(null);

  // Books
  const [books, setBooks] = useState<AdminBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksPage, setBooksPage] = useState(1);
  const [booksFilter, setBooksFilter] = useState("all");
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);
  const [approvingBookId, setApprovingBookId] = useState<string | null>(null);
  const [pendingBookCount, setPendingBookCount] = useState(0);
  const [pendingAuthorCount, setPendingAuthorCount] = useState(0);

  // Admins
  const [admins, setAdmins] = useState<AdminInfo[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoting, setPromoting] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    let hadAnySuccess = false;
    try {
      const [listRes, countRes, overviewSettled] = await Promise.allSettled([
        adminFetch("list", { page: 1, filter: "all" }),
        adminFetch("pending-counts"),
        (async () => {
          const token = await getActiveToken();
          if (!token) return null;
          const res = await fetchWithTimeout(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ action: "overview-counts" }),
            }
          );
          return res.ok ? await res.json() : null;
        })(),
      ]);
      const listData = listRes.status === "fulfilled" ? listRes.value : null;
      const countData = countRes.status === "fulfilled" ? countRes.value : null;
      const overviewRes = overviewSettled.status === "fulfilled" ? overviewSettled.value : null;
      hadAnySuccess = !!(listData || countData || overviewRes);
      if (listRes.status === "rejected") console.error("admin list failed:", listRes.reason);
      if (countRes.status === "rejected") console.error("pending-counts failed:", countRes.reason);
      if (overviewSettled.status === "rejected") console.error("overview-counts failed:", overviewSettled.reason);

      const totalBooks = countData?.totalBooks ?? listData?.totalCount ?? 0;
      const pendingBooks = countData?.pendingBooks ?? listData?.pendingCount ?? 0;
      const pendingAuthorsCount = countData?.pendingAuthors ?? 0;

      let adminsCount = 0;
      try {
        const adminsData = await adminApi.listAdmins();
        adminsCount = (adminsData?.admins || adminsData?.data || []).length;
      } catch (error) {
      console.error(error);
    }

      setPendingBookCount(pendingBooks);
      setPendingAuthorCount(pendingAuthorsCount);
      setOverviewData(overviewRes);

      let authorCount = 0;
      try {
        const authorsRes = await (async () => {
          const token = await getActiveToken();
          if (!token) return null;
          const res = await fetchWithTimeout(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ action: "list-authors" }),
            }
          );
          return res.ok ? await res.json() : null;
        })();
        authorCount = authorsRes?.authors?.length ?? 0;
      } catch (error) {
      console.error(error);
    }

      setStats({
        total_users: authorCount,
        total_books: totalBooks,
        total_admins: adminsCount,
        total_submissions: 0,
        pending_submissions: 0,
        recent_submissions: [],
      });
    } catch (error) {
      console.error("fetchStats error:", error);
      hadAnySuccess = false;
    }
    if (!hadAnySuccess) {
      toast({ title: "Failed to load stats", variant: "destructive" });
    }
    setStatsLoading(false);
  }, [toast]);

  const fetchBooks = useCallback(async () => {
    setBooksLoading(true);
    try {
      const data = await adminFetch("list", { page: booksPage, filter: booksFilter });
      setBooks(data?.books || []);
      setPendingBookCount(data?.pendingCount || 0);
    } catch (error) {
      toast({ title: "Failed to load books", variant: "destructive" });
    }
    setBooksLoading(false);
  }, [booksPage, booksFilter, toast]);

  const fetchPendingCounts = useCallback(async () => {
    try {
      const data = await adminFetch("pending-counts");
      setPendingBookCount(data.pendingBooks || 0);
      setPendingAuthorCount(data.pendingAuthors || 0);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchAdmins = useCallback(async () => {
    setAdminsLoading(true);
    try {
      const data = await adminApi.listAdmins();
      setAdmins(data?.admins || data?.data || []);
    } catch (error) {
      toast({ title: "Failed to load admins", variant: "destructive" });
    }
    setAdminsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!isAdmin) return;
    adminApi.isSuperAdmin().then((data) => setIsSuperAdmin(!!data?.is_super_admin)).catch(() => setIsSuperAdmin(false));
    adminApi.checkPublishNowAdmin().then((data) => setIsPublishNowAdmin(!!data?.is_super_admin)).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "overview") { fetchStats(); fetchPendingCounts(); }
    else if (tab === "books") fetchBooks();
    else if (tab === "admins") fetchAdmins();
  }, [tab, isAdmin, booksPage, booksFilter, fetchAdmins, fetchBooks, fetchPendingCounts, fetchStats]);

  const handlePromote = async () => {
    if (!promoteEmail.trim()) return;
    setPromoting(true);
    try {
      await adminApi.promoteAdmin(promoteEmail.trim());
      toast({ title: `${promoteEmail} promoted to admin` });
      setPromoteEmail("");
      fetchAdmins();
    } catch (err) {
      toast({ title: err.message || "Promotion failed", variant: "destructive" });
    }
    setPromoting(false);
  };

  const handleDemote = async (userId: string) => {
    try {
      await adminApi.demoteAdmin(userId);
      toast({ title: "Admin demoted" });
      fetchAdmins();
    } catch (err) {
      toast({ title: err.message || "Demotion failed", variant: "destructive" });
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    setDeletingBookId(bookId);
    try {
      await adminFetch("delete", { bookId });
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
      toast({ title: "Book deleted" });
    } catch (err) {
      toast({ title: err.message || "Delete failed", variant: "destructive" });
    }
    setDeletingBookId(null);
  };

  const handleApproveBook = async (bookId: string) => {
    setApprovingBookId(bookId);
    try {
      await adminFetch("approve", { bookId });
      toast({ title: "Book approved & microsite published! 🎉" });
      fetchBooks();
    } catch (err) {
      toast({ title: err.message || "Approve failed", variant: "destructive" });
    }
    setApprovingBookId(null);
  };

  const handleRejectBook = async (bookId: string, reason: string) => {
    setApprovingBookId(bookId);
    try {
      await adminFetch("reject", { bookId, rejectionNote: reason });
      toast({ title: "Book rejected — author notified" });
      fetchBooks();
    } catch (err) {
      toast({ title: err.message || "Reject failed", variant: "destructive" });
    }
    setApprovingBookId(null);
  };

  const handleRequestChanges = async (bookId: string, reason: string) => {
    setApprovingBookId(bookId);
    try {
      await adminFetch("request-changes", { bookId, rejectionNote: reason });
      toast({ title: "Changes requested — author notified" });
      fetchBooks();
    } catch (err) {
      toast({ title: err.message || "Request changes failed", variant: "destructive" });
    }
    setApprovingBookId(null);
  };

  const handleNavigate = (targetTab: string, filter?: string) => {
    setTab(targetTab as Tab);
    if (filter && targetTab === "books") setBooksFilter(filter);
  };

  if (loading) return null;
  if (!user) {
    const here = location.pathname + location.search;
    return <Navigate to={`/admin-auth?redirect=${encodeURIComponent(here)}`} replace />;
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const tabs: { key: Tab; label: string; icon: typeof BarChart3; superOnly?: boolean; pnAdminOnly?: boolean }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "authors", label: "Authors", icon: UserCheck },
    { key: "books", label: "Books", icon: BookOpen },
    { key: "crm", label: "CRM", icon: Users },
    { key: "messages", label: "Messages", icon: MessageSquare },
    { key: "reading-club", label: "Reading Club", icon: BookMarked },
    { key: "support", label: "Support", icon: Headphones },
    { key: "payouts", label: "Payouts", icon: Wallet },
    { key: "errors", label: "Errors", icon: AlertOctagon },
    { key: "daily-audit", label: "Daily Audit", icon: Activity },
    { key: "node-gating", label: "Node Gating", icon: ToggleRight, superOnly: true },
    { key: "admins", label: "Admins", icon: ShieldCheck, superOnly: true },
    { key: "audit", label: "Audit", icon: FileSearch, superOnly: true },
    { key: "platforms", label: "Platforms", icon: Globe, pnAdminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Dedicated Admin Header */}
      <header className="border-b border-border bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoIcon} alt="Authors Bureau" className="h-8 w-8" />
            <div>
              <span className="font-heading text-lg font-bold">Admin Panel</span>
              <span className="ml-2 text-xs text-muted-foreground">Authors Bureau</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.id && <AdminNotificationBell userId={user.id} />}
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">Author Dashboard</Link>
            </Button>
            <Button onClick={signOut} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-card">
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
            <OverviewTab
              stats={stats}
              loading={statsLoading}
              onRefresh={() => { fetchStats(); fetchPendingCounts(); }}
              onNavigate={handleNavigate}
              pendingBookCount={pendingBookCount}
              pendingAuthorCount={pendingAuthorCount}
              overviewData={overviewData}
            />
          )}
          {tab === "authors" && <AuthorsTab />}
          {tab === "books" && (
            <BooksTab
              books={books}
              loading={booksLoading}
              onRefresh={fetchBooks}
              onDelete={handleDeleteBook}
              onApprove={handleApproveBook}
              onReject={handleRejectBook}
              onRequestChanges={handleRequestChanges}
              deletingId={deletingBookId}
              approvingId={approvingBookId}
              pendingCount={pendingBookCount}
              page={booksPage}
              setPage={setBooksPage}
              filter={booksFilter}
              setFilter={setBooksFilter}
            />
          )}
          {tab === "crm" && <AdminCRMTab />}
          {tab === "messages" && <AdminMessagesTab />}
          {tab === "reading-club" && <ReadingClubTab />}
          {tab === "support" && <SupportTab />}
          {tab === "payouts" && <AdminPayoutsDashboard />}
          {tab === "node-gating" && <NodeGatingTab />}
          {tab === "audit" && <AuditLogTab />}
          {tab === "errors" && <ErrorsTab />}
          {tab === "daily-audit" && <DailyAuditTab />}
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
    </div>
  );
}
