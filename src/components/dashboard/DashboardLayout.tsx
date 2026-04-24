import { ReactNode, useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { useAuthorStats } from "@/hooks/useAuthorStats";
import { useNodeGating } from "@/hooks/useNodeGating";
import { useMyBooks } from "@/hooks/useMyBooks";
import { isSuperAdmin } from "@/lib/superadmin";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardSection } from "@/pages/AuthorDashboard";

interface Props {
  children: ReactNode;
  /** Optional explicit override; otherwise derived from pathname */
  activeSection?: DashboardSection;
  /** Disable inner padding when child manages its own scroll/layout (e.g. chat) */
  bare?: boolean;
}

/**
 * Map a pathname → which sidebar item should appear active.
 * Standalone hub pages map to the same IDs the sidebar uses internally
 * (revenue-streams = Brand, marketing-channels = Build Authority, etc.).
 */
function deriveActiveSection(pathname: string, nodeId?: string): DashboardSection {
  if (pathname.startsWith("/brand-products")) return "revenue-streams" as DashboardSection;
  if (pathname.startsWith("/build-authority")) return "marketing-channels" as DashboardSection;
  if (pathname.startsWith("/yield-revenue")) return "authority-builders" as DashboardSection;
  if (pathname.startsWith("/revenue-dashboard") || pathname.startsWith("/earnings"))
    return "analytics" as DashboardSection;
  if (pathname.startsWith("/account-settings")) return "profile" as DashboardSection;
  if (pathname.startsWith("/connect-settings")) return "connect-settings" as DashboardSection;
  if (pathname.startsWith("/abby-coach")) return "abby-coach" as DashboardSection;
  if (pathname.startsWith("/admin/payouts")) return "analytics" as DashboardSection;
  if (pathname.startsWith("/node-builder/")) {
    if (nodeId?.startsWith("BP-")) return "revenue-streams" as DashboardSection;
    if (nodeId?.startsWith("BA-")) return "marketing-channels" as DashboardSection;
    if (nodeId?.startsWith("YR-")) return "authority-builders" as DashboardSection;
  }
  return "overview" as DashboardSection;
}

/**
 * When a sidebar item is clicked, route to its appropriate destination.
 * Standalone pages get their own URLs; everything else goes through
 * /dashboard?section=... so AuthorDashboard handles it.
 */
function sectionToPath(section: DashboardSection): string {
  switch (section) {
    case "revenue-streams" as DashboardSection:
      return "/brand-products";
    case "marketing-channels" as DashboardSection:
      return "/build-authority";
    case "authority-builders" as DashboardSection:
      return "/yield-revenue";
    case "analytics" as DashboardSection:
      return "/revenue-dashboard";
    case "abby-coach" as DashboardSection:
      return "/abby-coach";
    case "connect-settings" as DashboardSection:
      return "/connect-settings";
    case "overview":
      return "/dashboard";
    default:
      return `/dashboard?section=${section}`;
  }
}

export default function DashboardLayout({ children, activeSection, bare = false }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ nodeId?: string; bookId?: string }>();
  const [searchParams] = useSearchParams();
  const { user, isAdmin, isPremium, tier, subscription, signOut } = useAuth();

  const { stats } = useAuthorStats(user?.id);
  const { books } = useMyBooks(user?.id);
  const { gating, isCategoryFullyClosed } = useNodeGating();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const userIsSuperAdmin = isSuperAdmin(user?.email);

  const resolvedActive = useMemo<DashboardSection>(
    () => activeSection ?? deriveActiveSection(location.pathname, params.nodeId),
    [activeSection, location.pathname, params.nodeId]
  );

  // Detect active book id from route params or query string
  const activeBookId = params.bookId ?? searchParams.get("bookId") ?? null;

  // Resolve the title for the active book (lookup once when bookId changes)
  const [currentBookTitle, setCurrentBookTitle] = useState<string>("");
  useEffect(() => {
    if (!activeBookId) {
      setCurrentBookTitle("");
      return;
    }
    let cancelled = false;
    supabase
      .from("books")
      .select("title")
      .eq("id", activeBookId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setCurrentBookTitle(data.title);
      });
    return () => { cancelled = true; };
  }, [activeBookId]);

  const currentBook = useMemo(() => {
    if (!activeBookId) return null;
    const s = stats.products?.perBook?.[activeBookId];
    return {
      id: activeBookId,
      title: currentBookTitle || "Current Book",
      brand: s?.brand ?? 0,
      build: s?.build ?? 0,
      yield: s?.yield ?? 0,
      total: s?.total ?? 0,
    };
  }, [activeBookId, currentBookTitle, stats.products?.perBook]);

  if (!user) return <>{children}</>;

  const handleSectionChange = (s: DashboardSection) => {
    navigate(sectionToPath(s));
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarCollapsed(true);
    }
  };

  const handleHeaderNavigate = (s: string) => {
    navigate(sectionToPath(s as DashboardSection));
  };

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* Mobile overlay */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 lg:static lg:z-auto
          h-[100dvh] overflow-y-auto overscroll-contain
          transition-transform duration-200 lg:translate-x-0
          ${sidebarCollapsed ? "-translate-x-full" : "translate-x-0"}
        `}
      >
        <DashboardSidebar
          activeSection={resolvedActive}
          onSectionChange={handleSectionChange}
          collapsed={false}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          isPremium={isPremium || isAdmin}
          isAdmin={isAdmin}
          isSuperAdmin={userIsSuperAdmin}
          tier={tier}
          hasBooks={stats.bookCount > 0}
          hasAnalysis={stats.analyzedCount > 0}
          hasMicrosite={stats.liveMicrosites > 0}
          stripeConnected={stats.stripeConnected}
          pendingReviewCount={stats.products?.totalReadyForReview || 0}
          buildUnlocked={0}
          buildAuthorityUnlocked={0}
          yieldUnlocked={0}
          currentBook={currentBook}
          buildAuthorityCategoryOpen={
            gating.length > 0 ? !isCategoryFullyClosed("marketing-channels") : true
          }
          yieldCategoryOpen={gating.length > 0 ? !isCategoryFullyClosed("authority-builders") : true}
        />
      </div>
      <div className="flex flex-1 flex-col min-w-0 h-[100dvh] overflow-hidden">
        <DashboardHeader
          user={user}
          isPremium={isPremium}
          isAdmin={isAdmin}
          tier={tier}
          subscription={subscription}
          onSignOut={signOut}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onNavigate={handleHeaderNavigate}
        />
        <main
          className={
            bare
              ? "flex-1 min-h-0 overflow-hidden"
              : "flex-1 min-h-0 touch-pan-y overflow-y-auto overscroll-y-contain [webkit-overflow-scrolling:touch]"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
