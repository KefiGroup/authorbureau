import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import BookHubContextBar from "@/components/dashboard/book-hub/BookHubContextBar";
import BookHubOverview from "@/components/dashboard/book-hub/BookHubOverview";
import BookHubStepTab from "@/components/dashboard/book-hub/BookHubStepTab";
import BookHubAnalytics from "@/components/dashboard/book-hub/BookHubAnalytics";
import type { DashboardSection } from "@/pages/AuthorDashboard";

type BookHubTab = "overview" | "automate" | "build" | "broadcast" | "yield" | "analytics";

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

async function getActiveToken(): Promise<string | null> {
  const { data: cloudSession } = await cloudSupabase.auth.getSession();
  if (cloudSession?.session?.access_token) return cloudSession.session.access_token;
  const { data: sharedSession } = await sharedSupabase.auth.getSession();
  return sharedSession?.session?.access_token || null;
}

const tabs: { id: BookHubTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "automate", label: "A · Analyze" },
  { id: "build", label: "B · Build" },
  { id: "broadcast", label: "B · Bridge" },
  { id: "yield", label: "Y · Yield" },
  { id: "analytics", label: "Analytics" },
];

const tabColors: Record<string, string> = {
  automate: "text-blue-600 border-blue-500",
  build: "text-amber-600 border-amber-500",
  broadcast: "text-rose-500 border-rose-500",
  yield: "text-emerald-500 border-emerald-500",
};

export default function BookHub() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin, isPremium, subscription, signOut } = useAuth();

  // Guard: if bookId is missing or is the literal route param placeholder, redirect
  useEffect(() => {
    if (!authLoading && bookId && (bookId === ":bookId" || !/^[0-9a-f-]{36}$/i.test(bookId))) {
      navigate("/dashboard?section=my-books", { replace: true });
    }
  }, [bookId, authLoading, navigate]);
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as BookHubTab) || "overview";
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BookHubTab>(initialTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    async function fetchBook() {
      if (!user || !bookId) return;
      setLoading(true);
      try {
        const token = await getActiveToken();
        if (!token) { setLoading(false); return; }

        const response = await fetch(
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
      } catch (err) {
        console.error("Failed to fetch book:", err);
      }
      setLoading(false);
    }
    fetchBook();
  }, [user, bookId]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth", { replace: true });
    return null;
  }

  if (!book) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="font-heading text-xl font-bold mb-2">Book not found</h2>
          <button onClick={() => navigate("/dashboard")} className="text-sm text-secondary hover:underline">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return (
          <BookHubOverview
            book={book}
            onConsultAbby={() => navigate("/dashboard?section=build-business")}
            onNavigateTab={(tab) => setActiveTab(tab as BookHubTab)}
          />
        );
      case "automate":
      case "build":
      case "broadcast":
      case "yield":
        return <BookHubStepTab stepId={activeTab} bookId={book.id} bookTitle={book.title} isPremium={isPremium || isAdmin} />;
      case "analytics":
        return <BookHubAnalytics bookId={book.id} />;
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
      />
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader
          user={user}
          isPremium={isPremium}
          isAdmin={isAdmin}
          subscription={subscription}
          onSignOut={signOut}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {/* Context Bar */}
          <BookHubContextBar book={book} onBack={() => navigate("/dashboard?section=my-books")} />

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
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

          {/* Tab Content */}
          {renderTab()}
        </main>
      </div>
    </div>
  );
}
