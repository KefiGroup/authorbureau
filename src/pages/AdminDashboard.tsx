import { useEffect, useState, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { LogOut, BookOpen, BarChart3, ShieldCheck, Globe, UserCheck, Users, BookMarked, Headphones } from "lucide-react";
import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

import OverviewTab from "@/components/admin/OverviewTab";
import BooksTab from "@/components/admin/BooksTab";
import AdminsTab from "@/components/admin/AdminsTab";
import PlatformAccessTab from "@/components/admin/PlatformAccessTab";
import AuthorsTab from "@/components/admin/AuthorsTab";
import AdminCRMTab from "@/components/admin/AdminCRMTab";
import ReadingClubTab from "@/components/admin/ReadingClubTab";
import SupportTab from "@/components/admin/SupportTab";

import type { AdminStats, AdminBook, AdminInfo } from "@/types/admin";

type Tab = "overview" | "books" | "authors" | "admins" | "platforms" | "crm" | "reading-club" | "support";

async function adminFetch(action: string, body: Record<string, unknown> = {}) {
  const token = await getActiveToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetchWithTimeout(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-books`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...body }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export default function AdminDashboard() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("overview");
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
    try {
      // Parallel: get books list, pending-counts, authors count, overview-counts
      const [listData, countData, overviewRes] = await Promise.all([
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

      const totalBooks = countData?.totalBooks ?? listData?.totalCount ?? 0;
      const pendingBooks = countData?.pendingBooks ?? listData?.pendingCount ?? 0;
      const pendingAuthorsCount = countData?.pendingAuthors ?? 0;

      // Get admins count
      let adminsCount = 0;
      try {
        const adminsData = await adminApi.listAdmins();
        adminsCount = (adminsData?.admins || adminsData?.data || []).length;
      } catch {}

      // Get authors count from overview data or fallback
      const authorsCount = overviewRes
        ? (overviewRes.subscriberCount !== undefined ? 0 : 0) // we'll get this from list-authors
        : 0;

      setPendingBookCount(pendingBooks);
      setPendingAuthorCount(pendingAuthorsCount);
      setOverviewData(overviewRes);

      // Also fetch author count
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
      } catch {}

      setStats({
        total_users: authorCount,
        total_books: totalBooks,
        total_admins: adminsCount,
        total_submissions: 0,
        pending_submissions: 0,
        recent_submissions: [],
      });
    } catch {
      toast({ title: "Failed to load stats", variant: "destructive" });
    }
    setStatsLoading(false);
  }, []);

  const fetchBooks = useCallback(async () => {
    setBooksLoading(true);
    try {
      const data = await adminFetch("list", { page: booksPage, filter: booksFilter });
      setBooks(data?.books || []);
      setPendingBookCount(data?.pendingCount || 0);
    } catch {
      toast({ title: "Failed to load books", variant: "destructive" });
    }
    setBooksLoading(false);
  }, [booksPage, booksFilter]);

  const fetchPendingCounts = useCallback(async () => {
    try {
      const data = await adminFetch("pending-counts");
      setPendingBookCount(data.pendingBooks || 0);
      setPendingAuthorCount(data.pendingAuthors || 0);
    } catch {}
  }, []);

  const fetchAdmins = useCallback(async () => {
    setAdminsLoading(true);
    try {
      const data = await adminApi.listAdmins();
      setAdmins(data?.admins || data?.data || []);
    } catch {
      toast({ title: "Failed to load admins", variant: "destructive" });
    }
    setAdminsLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    setIsSuperAdmin(true);
    adminApi.checkPublishNowAdmin().then((data) => setIsPublishNowAdmin(!!data?.is_super_admin)).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "overview") { fetchStats(); fetchPendingCounts(); }
    else if (tab === "books") fetchBooks();
    else if (tab === "admins") fetchAdmins();
  }, [tab, isAdmin, booksPage, booksFilter]);

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

  const handleDeleteBook = async (bookId: string) => {
    setDeletingBookId(bookId);
    try {
      await adminFetch("delete", { bookId });
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
      toast({ title: "Book deleted" });
    } catch (err: any) {
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
    } catch (err: any) {
      toast({ title: err.message || "Approve failed", variant: "destructive" });
    }
    setApprovingBookId(null);
  };

  const handleRejectBook = async (bookId: string) => {
    setApprovingBookId(bookId);
    try {
      await adminFetch("reject", { bookId });
      toast({ title: "Book unpublished" });
      fetchBooks();
    } catch (err: any) {
      toast({ title: err.message || "Reject failed", variant: "destructive" });
    }
    setApprovingBookId(null);
  };

  const handleNavigate = (targetTab: string, filter?: string) => {
    setTab(targetTab as Tab);
    if (filter && targetTab === "books") setBooksFilter(filter);
  };

  if (loading) return null;
  if (!user) return <Navigate to="/admin-login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const tabs: { key: Tab; label: string; icon: typeof BarChart3; superOnly?: boolean; pnAdminOnly?: boolean }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "authors", label: "Authors", icon: UserCheck },
    { key: "books", label: "Books", icon: BookOpen },
    { key: "crm", label: "CRM", icon: Users },
    { key: "reading-club", label: "Reading Club", icon: BookMarked },
    { key: "support", label: "Support", icon: Headphones },
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
            <Button asChild variant="outline" size="sm" className="text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10 bg-primary-foreground/10">
              <Link to="/dashboard">Author Dashboard</Link>
            </Button>
            <Button onClick={signOut} variant="outline" size="sm" className="text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10 bg-primary-foreground/10">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </section>

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
          {tab === "reading-club" && <ReadingClubTab />}
          {tab === "support" && <SupportTab />}
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
