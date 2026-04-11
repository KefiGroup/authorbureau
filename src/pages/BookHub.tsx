import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, SubscriptionTier, hasTierAccess } from "@/hooks/useAuth";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import BookHubContextBar from "@/components/dashboard/book-hub/BookHubContextBar";
import BookHubOverview from "@/components/dashboard/book-hub/BookHubOverview";
import PortfolioStepView from "@/components/dashboard/PortfolioStepView";
import BookHubAnalytics from "@/components/dashboard/book-hub/BookHubAnalytics";
import BookHubSkeleton from "@/components/dashboard/book-hub/BookHubSkeleton";
import type { DashboardSection } from "@/pages/AuthorDashboard";

type BookHubTab = "overview" | "revenue-streams" | "marketing-channels" | "authority-builders" | "analytics";

interface BookData {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  cover_image_url: string | null;
  genre: string | null;
  published_at: string | null;
  author_name: string | null;
}

import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

const tabs: { id: BookHubTab; label: string }[] = [
  { id: "overview", label: "Analysis" },
  { id: "revenue-streams", label: "💰 Brand" },
  { id: "marketing-channels", label: "📈 Build" },
  { id: "authority-builders", label: "🏆 Yield" },
  { id: "analytics", label: "Analytics" },
];

const tabColors: Record<string, string> = {
  "revenue-streams": "text-emerald-600 border-emerald-500",
  "marketing-channels": "text-violet-600 border-violet-500",
  "authority-builders": "text-sky-600 border-sky-500",
};

// Simple in-memory cache so returning to the page doesn't flash skeleton
const bookCache = new Map<string, BookData>();

export default function BookHub() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin, isPremium, subscription, tier, signOut } = useAuth();

  useEffect(() => {
    if (!authLoading && bookId && (bookId === ":bookId" || !/^[0-9a-f-]{36}$/i.test(bookId))) {
      navigate("/dashboard?section=my-books", { replace: true });
    }
  }, [bookId, authLoading, navigate]);

  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as BookHubTab) || "overview";
  const cachedBook = bookId ? bookCache.get(bookId) : undefined;
  const [book, setBook] = useState<BookData | null>(cachedBook || null);
  const [loading, setLoading] = useState(!cachedBook);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BookHubTab>(initialTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authorSlug, setAuthorSlug] = useState<string | null>(null);

  const effectiveTier: SubscriptionTier = isAdmin ? "yield" : tier;

  const fetchBook = useCallback(async () => {
    if (!user || !bookId) return;
    if (bookCache.has(bookId)) {
      setBook(bookCache.get(bookId)!);
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError(null);
    try {
      const token = await getActiveToken();
      if (!token) { setFetchError("Unable to authenticate. Please sign out and back in."); setLoading(false); return; }
      const response = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "get", bookId }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setBook(result.book);
      if (result.book) bookCache.set(bookId, result.book);
    } catch (err) {
      console.error("Failed to fetch book:", err);
      setFetchError(err?.name === "AbortError" ? "Request timed out." : "Could not load book data.");
    }
    setLoading(false);
  }, [user, bookId]);

  useEffect(() => {
    fetchBook();
  }, [fetchBook]);

  if (!authLoading && !user) {
    navigate("/auth", { replace: true });
    return null;
  }

  if (!user) return null;

  const showSkeleton = authLoading || loading;

  const renderTab = () => {
    if (!book) return null;
    switch (activeTab) {
      case "overview":
        return (
          <BookHubOverview
            book={{ id: book.id, title: book.title, genre: book.genre }}
            tier={effectiveTier}
            onConsultAbby={() => navigate("/dashboard?section=build-business")}
            onNavigateTab={(tab) => setActiveTab(tab as BookHubTab)}
          />
        );
      case "revenue-streams":
      case "marketing-channels":
      case "authority-builders":
        return (
          <PortfolioStepView
            categoryId={activeTab}
            tier={effectiveTier}
            onNavigate={(section) => navigate(`/dashboard?section=${section}&bookId=${book.id}&bookTitle=${encodeURIComponent(book.title)}`)}
            analyzedBooks={book ? [{ id: book.id, title: book.title }] : []}
          />
        );
      case "analytics":
        return <BookHubAnalytics bookId={book.id} tier={effectiveTier} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar
        activeSection={"my-books" as DashboardSection}
        onSectionChange={(s) => navigate(`/dashboard?section=${s}`)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isPremium={isPremium || isAdmin}
        tier={effectiveTier}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader
          user={user!}
          isPremium={isPremium}
          isAdmin={isAdmin}
          tier={effectiveTier}
          subscription={subscription}
          onSignOut={signOut}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {showSkeleton ? (
            <BookHubSkeleton />
          ) : fetchError ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center space-y-3">
                <p className="text-muted-foreground text-sm">{fetchError}</p>
                <button onClick={fetchBook} className="text-sm text-secondary hover:underline">Try again</button>
                <span className="mx-2 text-muted-foreground">|</span>
                <button onClick={() => navigate("/dashboard")} className="text-sm text-secondary hover:underline">Back to Dashboard</button>
              </div>
            </div>
          ) : !book ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <h2 className="font-heading text-xl font-bold mb-2">Book not found</h2>
                <button onClick={() => navigate("/dashboard")} className="text-sm text-secondary hover:underline">
                  Back to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div className="transition-opacity duration-300 animate-in fade-in">
              <BookHubContextBar book={book} tier={effectiveTier} onBack={() => navigate("/dashboard?section=my-books")} />

              {/* Tab Navigation */}
              <div className="flex items-center gap-1 border-b border-border overflow-x-auto mt-6">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const colorClass = tabColors[tab.id] || "";
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                        isActive
                          ? `${colorClass || "text-foreground border-primary"}`
                          : "text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/20"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                {renderTab()}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
