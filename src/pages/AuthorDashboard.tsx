import { Navigate, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import OnboardingBanner from "@/components/dashboard/OnboardingBanner";
import SectionGatePage from "@/components/dashboard/SectionGatePage";
import ProfileEditor from "@/components/dashboard/ProfileEditor";
import CourseBuilder from "@/components/dashboard/CourseBuilder";
import SpeakingProfile from "@/components/dashboard/SpeakingProfile";
import CoachingCRM from "@/components/dashboard/CoachingCRM";
// DashboardOverview removed — replaced by ABBYFrameworkDashboard
import ABBYFrameworkDashboard from "@/components/dashboard/ABBYFrameworkDashboard";
import PortfolioStepView from "@/components/dashboard/PortfolioStepView";
import WorkbooksManager from "@/components/dashboard/WorkbooksManager";
import WebinarsManager from "@/components/dashboard/WebinarsManager";
import SocialMediaManager from "@/components/dashboard/SocialMediaManager";
import PodcastManager from "@/components/dashboard/PodcastManager";
import AudiobookStudio from "@/components/dashboard/AudiobookStudio";
import MyBooks from "@/components/dashboard/MyBooks";
import BuildMyBusiness from "@/components/dashboard/BuildMyBusiness";
import PremiumGate from "@/components/dashboard/PremiumGate";
import EmailMarketing from "@/components/dashboard/EmailMarketing";
import RevenueDashboard from "@/components/dashboard/RevenueDashboard";
import MicrositeManager from "@/components/dashboard/MicrositeManager";
import { resolveLegacyBuilderRoute } from "@/components/dashboard/builders/legacyBuilderRedirect";
import ConnectStripePage from "@/components/dashboard/ConnectStripePage";
import HowItWorksSection from "@/components/dashboard/HowItWorksSection";
import PayoutSettingsPage from "@/components/dashboard/PayoutSettingsPage";
import ReviewProductsPage from "@/components/dashboard/ReviewProductsPage";
import AuthorCRMPage from "@/components/dashboard/AuthorCRMPage";
import AuthorMessagesPage from "@/components/dashboard/AuthorMessagesPage";
import FunnelsHub from "@/components/dashboard/FunnelsHub";
import AuthorReadingClub from "@/components/dashboard/AuthorReadingClub";
// AbbyConsultantBanner removed from dashboard per reorganization
import ABBYJourneyOnboarding from "@/components/dashboard/ABBYJourneyOnboarding";
import MarketingHub from "@/components/dashboard/MarketingHub";
import BookBuilderContextBar from "@/components/dashboard/BookBuilderContextBar";
import AuthorLibrary from "@/pages/AuthorLibrary";
import { Loader2, Rocket, FileText, Video, Share2, CreditCard, Users, Trophy, Podcast, Building2, Bookmark, Award, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { useAuthorStats } from "@/hooks/useAuthorStats";
import { useMyBooks } from "@/hooks/useMyBooks";

import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";
import { isSuperAdmin } from "@/lib/superadmin";
import { useNodeGating } from "@/hooks/useNodeGating";

// Legacy builder ?builder=<id> values still supported via legacyBuilderRedirect.

export type DashboardSection =
  | "overview" | "profile" | "my-books"
  | "build-business"
  | "courses" | "workbooks" | "webinars" | "social-media" | "memberships" | "home-study"
  | "audiobook-studio"
  | "coaching" | "group-coaching" | "big-ticket"
  | "speaking" | "podcast" | "corporate-training"
  | "retreats" | "certification" | "masterminds"
  | "email-marketing" | "subscribers" | "email-templates"
  | "revenue-streams" | "marketing-channels" | "authority-builders"
  | "marketing" | "crm" | "author-crm" | "messages" | "reading-club" | "how-it-works" | "my-funnels"
  | "analytics" | "microsite-manager"
  | "connect-stripe" | "payout-settings" | "review-products" | "connect-settings"
  | "marketing-hub" | "library"
  | "book-sales" | "special-editions" | "lead-magnet"
  // Universal builder nodes
  | "builder";

const comingSoonSections: Record<string, { title: string; description: string; icon: typeof Rocket }> = {
  crm: { title: "CRM & Contacts", description: "Your unified customer relationship management hub.", icon: Users },
  marketing: { title: "Marketing Package", description: "AI-driven marketing suite: email flows, social media, affiliate dashboard.", icon: Rocket },
};

function ComingSoonPlaceholder({ sectionId }: { sectionId: string }) {
  const info = comingSoonSections[sectionId];
  if (!info) return null;
  const Icon = info.icon;
  return (
    <div className="max-w-2xl mx-auto py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-6">
        <Icon className="h-8 w-8 text-secondary" />
      </div>
      <h2 className="font-heading text-2xl font-bold mb-3">{info.title}</h2>
      <p className="text-muted-foreground text-sm leading-relaxed max-w-lg mx-auto mb-6">{info.description}</p>
      <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
        </span>
        Coming Soon
      </div>
    </div>
  );
}

export default function AuthorDashboard({ initialSection }: { initialSection?: DashboardSection }) {
  const { user, loading, isAdmin, isPremium, tier, subscription, checkSubscription, signOut } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const dashboardNavigate = useNavigate();
  const sectionParamRaw = searchParams.get("section");
  const INITIAL_ALIASES: Record<string, DashboardSection> = {
    "review-publish": "review-products",
    "review": "review-products",
    "funnels": "my-funnels",
    "crm": "author-crm",
    "contacts": "author-crm",
  };
  const sectionParam = (sectionParamRaw
    ? (INITIAL_ALIASES[sectionParamRaw] || (sectionParamRaw as DashboardSection))
    : null);
  const [activeSection, setActiveSectionState] = useState<DashboardSection>(
    sectionParam || initialSection || (location.pathname === "/my-books" ? "my-books" : "overview")
  );

  // Sections that redirect to standalone pages — handle on URL load too
  const REDIRECT_SECTIONS: Record<string, string> = {
    "brand-products-hub": "/brand-products",
    "revenue-streams": "/brand-products",
    "marketing-channels": "/build-authority",
    "authority-builders": "/yield-revenue",
    "analytics": "/revenue-dashboard",
    "revenue-dashboard": "/revenue-dashboard",
    "revenue": "/revenue-dashboard",
    "abby-coach": "/abby-coach",
    "connect-settings": "/connect-settings",
  };

  // URL aliases → real internal section keys (e.g. /dashboard?section=funnels → my-funnels)
  const URL_SECTION_ALIASES: Record<string, DashboardSection> = {
    "review-publish": "review-products",
    "review": "review-products",
    "funnels": "my-funnels",
    "crm": "author-crm",
    "contacts": "author-crm",
  };

  // Per-book builder sections — when accessed with a bookId, route into Book Hub tabs
  const PER_BOOK_SECTIONS: Record<string, string> = {
    "revenue-streams": "revenue-streams",
    "marketing-channels": "marketing-channels",
    "authority-builders": "authority-builders",
    "review-products": "review-publish",
    "review-publish": "review-publish",
    "review": "review-publish",
  };

  // Keep dashboard state in sync when URL params change (e.g. internal links)
  useEffect(() => {
    const urlSectionRaw = searchParams.get("section");
    if (urlSectionRaw) {
      // If this is a per-book section AND a bookId is attached, redirect to Book Hub
      const bookId = searchParams.get("bookId");
      const bookHubTab = PER_BOOK_SECTIONS[urlSectionRaw];
      if (bookHubTab && bookId) {
        dashboardNavigate(`/dashboard/book/${bookId}?tab=${bookHubTab}`, { replace: true });
        return;
      }
      const redirectPath = REDIRECT_SECTIONS[urlSectionRaw];
      if (redirectPath) {
        dashboardNavigate(redirectPath, { replace: true });
        return;
      }
      const resolved = (URL_SECTION_ALIASES[urlSectionRaw] || urlSectionRaw) as DashboardSection;
      if (resolved !== activeSection) {
        setActiveSectionState(resolved);
      }
    }
  }, [searchParams]);

  // Sync section to URL so refresh preserves the active section
  const setActiveSection = (section: DashboardSection) => {
    // Intercept standalone page navigations
    if (section === ("brand-products-hub" as DashboardSection)) {
      dashboardNavigate("/brand-products");
      return;
    }
    if (section === ("revenue-streams" as DashboardSection)) {
      dashboardNavigate("/brand-products");
      return;
    }
    if (section === ("marketing-channels" as DashboardSection)) {
      dashboardNavigate("/build-authority");
      return;
    }
    if (section === ("authority-builders" as DashboardSection)) {
      dashboardNavigate("/yield-revenue");
      return;
    }
    if (section === ("analytics" as DashboardSection)) {
      dashboardNavigate("/revenue-dashboard");
      return;
    }
    if (section === ("abby-coach" as DashboardSection)) {
      dashboardNavigate("/abby-coach");
      return;
    }
    if (section === ("connect-settings" as DashboardSection)) {
      dashboardNavigate("/connect-settings");
      return;
    }
    setActiveSectionState(section);
    const next = new URLSearchParams(searchParams);
    if (section === "overview") {
      next.delete("section");
    } else {
      next.set("section", section);
    }
    // Clear builder param when navigating to a non-builder section
    if (section !== "builder") {
      next.delete("builder");
    }
    setSearchParams(next, { replace: true });
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Centralized stats from author-stats edge function
  const { stats, refetch: refetchStats } = useAuthorStats(user?.id);
  const { books: myBooks, loading: myBooksLoading } = useMyBooks(user?.id);

  // Active book from URL (?bookId=...) — drives sidebar's currentBook context
  const activeBookId = searchParams.get("bookId");
  const activeBookEntry = activeBookId ? myBooks.find(b => b.id === activeBookId) : null;
  const activeBookStats = activeBookId ? stats.products?.perBook?.[activeBookId] : undefined;
  const sidebarCurrentBook = activeBookEntry
    ? {
        id: activeBookEntry.id,
        title: activeBookEntry.title,
        brand: activeBookStats?.brand ?? 0,
        build: activeBookStats?.build ?? 0,
        yield: activeBookStats?.yield ?? 0,
        total: activeBookStats?.total ?? 0,
      }
    : null;

  const handlePickBookForSection = (section: DashboardSection, bookId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("section", section);
    next.set("bookId", bookId);
    setSearchParams(next, { replace: false });
    setActiveSectionState(section);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarCollapsed(true);
    }
  };

  // DB-driven node gating
  const { gating, isNodeOpen, isCategoryFullyClosed } = useNodeGating();
  const openNodeIds = new Set(gating.filter(r => r.is_open).map(r => r.node_id));

  // Journey state
  const [booksAnalyzed, setBooksAnalyzed] = useState(0);
  const [hasBooks, setHasBooks] = useState(false);
  const [hasMicrosite, setHasMicrosite] = useState(false);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [analyzedBookList, setAnalyzedBookList] = useState<Array<{ id: string; title: string }>>([]);
  const [showJourneyOnboarding, setShowJourneyOnboarding] = useState(false);

  // Refetch stats when returning to dashboard or changing sections
  useEffect(() => {
    refetchStats();
  }, [activeSection]);

  // Derive journey state from centralized stats — but trust myBooks (the
  // canonical books endpoint) for hasBooks so a transient author-stats failure
  // can't make the dashboard flip back to "no books / new author" state.
  useEffect(() => {
    setHasBooks(myBooks.length > 0 || stats.bookCount > 0);
    setBooksAnalyzed(stats.analyzedCount);
    setHasAnalysis(stats.analyzedCount > 0);
    setStripeConnected(stats.stripeConnected);
    setPendingReviewCount(stats.products.totalReadyForReview);
    setHasMicrosite(stats.liveMicrosites > 0);
  }, [stats, isPremium, isAdmin, myBooks.length]);

  // Onboarding redirect state
  const [onboardingRedirect, setOnboardingRedirect] = useState<"profile" | "my-books" | null>(null);
  const checkingOnboarding = false;

  // Check if journey onboarding should show (first time user has an analyzed book)
  useEffect(() => {
    if (!user || !stats.bookCount || stats.analyzedCount > 0) return;
    (async () => {
      const { data } = await supabase
        .from("author_profiles")
        .select("has_seen_journey_onboarding")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data && !(data as any).has_seen_journey_onboarding) {
        setShowJourneyOnboarding(true);
      }
    })();
  }, [user, stats.analyzedCount]);

  // Fetch analyzed book list separately (lightweight, needed for navigation)
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await getActiveToken();
        if (!token) return;
        const booksResp = await fetchWithTimeout(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-my-books`,
          { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );
        const booksResult = await booksResp.json();
        const fetchedBooks = booksResult.books || [];
        if (fetchedBooks.length > 0) {
          const bookIds = fetchedBooks.map((b: any) => b.id);
          const statusResp = await fetchWithTimeout(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-manuscript`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ action: "batch-status", bookIds }),
            }
          );
          const statusResult = await statusResp.json();
          if (statusResp.ok) {
            const analyzedIds: string[] = statusResult.analyzed || [];
            const analyzedBooks = fetchedBooks
              .filter((b: any) => analyzedIds.includes(b.id))
              .map((b: any) => ({ id: b.id, title: b.title }));
            setAnalyzedBookList(analyzedBooks);
          }
        }
      } catch (err) {
        console.error("Failed to fetch analyzed book list:", err);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-6xl px-4">
          <div className="flex gap-4">
            {/* Sidebar skeleton */}
            <div className="hidden lg:flex flex-col w-64 space-y-3">
              <div className="h-16 rounded-xl bg-muted animate-pulse" />
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-9 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
            {/* Main content skeleton */}
            <div className="flex-1 space-y-4">
              <div className="h-16 rounded-xl bg-muted animate-pulse" />
              <div className="h-10 rounded-lg bg-muted animate-pulse w-3/4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
              <div className="h-64 rounded-xl bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const gate = (featureName: string, children: React.ReactNode, requiredTier: "brand" | "build" | "yield" = "brand") => (
    <PremiumGate isPremium={isPremium || isAdmin || userIsSuperAdmin} featureName={featureName} requiredTier={requiredTier} currentTier={userIsSuperAdmin ? "yield" : tier}>{children}</PremiumGate>
  );

  const handleNavigate = (s: string) => setActiveSection(s as DashboardSection);

  // Map sections to their node IDs for DB gating lookup
  const SECTION_TO_NODE: Record<string, string> = {
    "webinars": "webinars",
    "audiobook-studio": "audiobook",
    "podcast": "podcast-guest",
    "lead-magnet": "lead-magnet",
    "coaching": "coaching-1on1",
    "group-coaching": "group-coaching",
    "memberships": "memberships",
    "speaking": "keynotes",
    "big-ticket": "big-ticket",
  };

  const userIsSuperAdmin = isSuperAdmin(user?.email);

  /** Check if a section is gated (closed) via DB */
  const isSectionGated = (section: string): boolean => {
    if (userIsSuperAdmin) return false;
    const nodeId = SECTION_TO_NODE[section];
    if (!nodeId) return false;
    // If DB data loaded, use it; otherwise fall back to closed
    if (gating.length > 0) return !isNodeOpen(nodeId);
    return true; // default closed for Build/Yield sections
  };

  const renderSection = () => {
    // Gate individual builders via DB gating — superadmins bypass
    if (!isAdmin && isSectionGated(activeSection)) {
      return (
        <div className="max-w-2xl mx-auto text-center space-y-6 py-20">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">🚧</span>
          </div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">Coming Soon</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            We're building something amazing for this section. You'll be the first to know when it's ready!
          </p>
          <button
            onClick={() => setActiveSection("overview")}
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Back to Dashboard
          </button>
        </div>
      );
    }

    // Legacy ?builder=<id> → redirect to dedicated /node-builder/<NODE_ID>
    const legacyBuilderId = searchParams.get("builder");
    const legacyRedirect = resolveLegacyBuilderRoute(legacyBuilderId);
    if (legacyRedirect) {
      return <Navigate to={legacyRedirect} replace />;
    }

    switch (activeSection) {
      case "profile":
        return <ProfileEditor onNavigate={handleNavigate} />;
      case "my-books":
        return <MyBooks isPremium={isPremium || isAdmin} onNavigate={handleNavigate} stripeConnected={stripeConnected} centralStats={stats} />;
      case "build-business":
        return <BuildMyBusiness onNavigate={handleNavigate} />;
      case "how-it-works":
        return <HowItWorksSection />;
      case "analytics":
        return <RevenueDashboard onNavigate={handleNavigate} />;
      case "microsite-manager":
        return <MicrositeManager onNavigate={handleNavigate} />;
      case "courses":
        return gate("Course Builder", <CourseBuilder />, "build");
      case "home-study":
        return <Navigate to="/node-builder/BA-11" replace />;
      case "workbooks":
        return gate("Workbooks", <WorkbooksManager onNavigate={handleNavigate} />);
      case "webinars":
        return gate("Webinars", <WebinarsManager onNavigate={handleNavigate} />, "build");
      case "social-media":
        return gate("Social Media", <SocialMediaManager />);
      case "audiobook-studio": {
        // Resolve bookId with graceful fallbacks: URL param → activeBookId → most recent book
        let bookIdParam = searchParams.get("bookId") || "";
        let bookTitleParam = searchParams.get("bookTitle") || "";
        if (!bookIdParam) {
          const fallbackBook = (activeBookId && myBooks.find(b => b.id === activeBookId)) || myBooks[0];
          if (fallbackBook) {
            bookIdParam = fallbackBook.id;
            bookTitleParam = bookTitleParam || fallbackBook.title || "";
          }
        }
        if (!bookIdParam) {
          return <Navigate to="/my-books?returnTo=/dashboard?section=audiobook-studio" replace />;
        }
        return gate("Audiobook Studio", <AudiobookStudio bookId={bookIdParam} bookTitle={bookTitleParam} userId={user.id} />, "build");
      }
      case "podcast":
        return gate("Podcast Studio", <PodcastManager />, "build");
      case "speaking":
        return gate("Speaking Profile", <SpeakingProfile />, "yield");
      case "coaching":
        return gate("Coaching CRM", <CoachingCRM />, "build");
      case "group-coaching":
        return <Navigate to="/node-builder/BA-13" replace />;
      case "memberships":
        return <Navigate to="/node-builder/BA-12" replace />;
      case "email-marketing":
        return <Navigate to="/node-builder/BP-01" replace />;
      case "subscribers":
      case "email-templates":
        return gate("Email Marketing", <EmailMarketing activeTab={activeSection} onTabChange={(s) => setActiveSection(s as DashboardSection)} />);
      case "revenue-streams":
        // Subscribers can always access product sections; only gate for free users without analysis
        if (!hasAnalysis && !isPremium && !isAdmin && !userIsSuperAdmin) {
          return <SectionGatePage
            sectionTitle="B · Build Authority"
            sectionSubtitle="Create digital products that establish you as the expert in your field."
            gateMessage="Abby needs to understand your book before she can recommend which authority products to build."
            productNames={["Online Courses", "Home Study", "Workbook", "Audiobook", "Memberships", "Upsells", "1-on-1 Coaching", "Group Coaching", "Big Ticket Consulting", "Revenue Sharing", "Keynotes"]}
            onAnalyze={() => setActiveSection("build-business")}
          />;
        }
        return <PortfolioStepView categoryId={activeSection} tier={tier} onNavigate={handleNavigate} analyzedBooks={analyzedBookList} />;
      case "marketing-channels":
        if (userIsSuperAdmin || !isCategoryFullyClosed("marketing-channels")) {
          return <PortfolioStepView categoryId={activeSection} tier={tier} onNavigate={handleNavigate} analyzedBooks={analyzedBookList} />;
        }
        return <SectionGatePage
          sectionTitle="B · Build Channels"
          sectionSubtitle="Coming Soon: Marketing channels & audience connections."
          gateMessage="Build Channels are currently under development. We're building powerful tools for podcasts, webinars, audiobooks, and more. Check back soon!"
          productNames={["Audiobook", "Podcast Tour", "Webinars", "Lead Magnet Funnel", "Media Outreach", "Affiliates", "Upsells / Downsells", "Revenue Sharing"]}
          onAnalyze={() => setActiveSection("revenue-streams")}
        />;
      case "authority-builders":
        if (userIsSuperAdmin || !isCategoryFullyClosed("authority-builders")) {
          return <PortfolioStepView categoryId={activeSection} tier={tier} onNavigate={handleNavigate} analyzedBooks={analyzedBookList} />;
        }
        return <SectionGatePage
          sectionTitle="Y · Yield Revenue"
          sectionSubtitle="Coming Soon: Premium revenue streams & monetization."
          gateMessage="Yield Revenue builders are currently under development. We're crafting premium tools for coaching, speaking, masterminds, and more. Check back soon!"
          productNames={["1-on-1 Coaching", "Group Coaching", "Memberships", "Big Ticket Consulting", "Keynotes", "Training Programs", "Masterminds", "Retreats"]}
          onAnalyze={() => setActiveSection("revenue-streams")}
        />;
      case "review-products":
        return <ReviewProductsPage onNavigate={handleNavigate} />;
      case "author-crm":
        return gate("My Contacts", <AuthorCRMPage onNavigate={handleNavigate} />, "build");
      case "messages":
        return <AuthorMessagesPage />;
      case "my-funnels":
        return <FunnelsHub />;
      case "marketing-hub":
        return <MarketingHub onNavigate={handleNavigate} />;
      case "library":
        return <AuthorLibrary />;
      case "reading-club":
        return <AuthorReadingClub onNavigate={handleNavigate} />;
      case "book-sales":
        return <Navigate to="/node-builder/BP-05" replace />;
      case "special-editions":
        return <Navigate to="/node-builder/BP-08" replace />;
      case "lead-magnet":
        return <Navigate to="/node-builder/BP-02" replace />;
      case "big-ticket":
        return <Navigate to="/node-builder/YR-20" replace />;
      case "connect-stripe":
        return <ConnectStripePage />;
      case "payout-settings":
        return <PayoutSettingsPage />;
      case "overview":
        return (
          <ABBYFrameworkDashboard
            onNavigate={handleNavigate}
            isPremium={isPremium || isAdmin}
          />
        );
      default:
        if (comingSoonSections[activeSection]) {
          return gate(comingSoonSections[activeSection].title, <ComingSoonPlaceholder sectionId={activeSection} />);
        }
        return (
          <ABBYFrameworkDashboard
            onNavigate={handleNavigate}
            isPremium={isPremium || isAdmin}
          />
        );
     }
  };
  const BUILDER_SECTIONS = new Set(["home-study", "group-coaching", "memberships", "email-marketing", "book-sales", "special-editions", "lead-magnet", "big-ticket"]);
  const isBuilderActive = !!searchParams.get("builder") || BUILDER_SECTIONS.has(activeSection);

  // Sections that already render their own BookBuilderContextBar — don't double-render
  const SELF_MOUNTED_CONTEXT_BAR = new Set(["social-media", "podcast", "webinars", "workbooks"]);
  const showLayoutContextBar =
    !!searchParams.get("bookId") &&
    !SELF_MOUNTED_CONTEXT_BAR.has(activeSection) &&
    activeSection !== "overview" &&
    activeSection !== "my-books" &&
    activeSection !== "profile";

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* Mobile sidebar overlay */}
      {!sidebarCollapsed && (
        <div className="fixed inset-0 z-40 bg-foreground/30 lg:hidden" onClick={() => setSidebarCollapsed(true)} />
      )}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:static lg:z-auto
        h-[100dvh] overflow-y-auto overscroll-contain
        transition-transform duration-200 lg:translate-x-0
        ${sidebarCollapsed ? "-translate-x-full" : "translate-x-0"}
      `}>
        <DashboardSidebar
          activeSection={activeSection}
          onSectionChange={(s) => { setActiveSection(s); if (window.innerWidth < 1024) setSidebarCollapsed(true); }}
          collapsed={false}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          isPremium={isPremium || isAdmin}
          isAdmin={isAdmin}
          isSuperAdmin={userIsSuperAdmin}
          tier={tier}
          hasBooks={hasBooks}
          hasAnalysis={hasAnalysis}
          hasMicrosite={hasMicrosite}
          stripeConnected={stripeConnected}
          pendingReviewCount={pendingReviewCount}
          bookCount={stats.bookCount}
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
          onNavigate={handleNavigate}
        />
        <main className={`flex-1 min-h-0 touch-pan-y ${isBuilderActive ? "overflow-y-auto" : "overflow-y-auto overscroll-y-contain [webkit-overflow-scrolling:touch] p-6 pb-20 lg:p-8 lg:pb-24 space-y-4"}`}>
          {/* Onboarding banners — only for genuinely new authors. Wait for
              the books query to resolve so we don't briefly flash these
              banners to existing authors during auth bootstrap. */}
          {activeSection === "profile" && !hasBooks && !myBooksLoading && (
            <OnboardingBanner
              message="Welcome to Authors Bureau! Let's set up your author profile first - this takes about 2 minutes."
              storageKey="ab_onboarding_profile_banner"
            />
          )}
          {activeSection === "my-books" && !hasBooks && !myBooksLoading && (
            <OnboardingBanner
              message="Great profile! Now let's add your first book. You can upload a manuscript or import from PublishNow."
              storageKey="ab_onboarding_books_banner"
            />
          )}
          {showLayoutContextBar && (
            <div className={isBuilderActive ? "px-6 pt-6 lg:px-8" : ""}>
              <BookBuilderContextBar backTab="overview" />
            </div>
          )}
          {renderSection()}
        </main>
      </div>

      {/* ABBY Journey Onboarding Modal */}
      {showJourneyOnboarding && user && (
        <ABBYJourneyOnboarding
          userId={user.id}
          onComplete={(selectedPath) => {
            setShowJourneyOnboarding(false);
            if (selectedPath) {
              // Track path preference (analytics)
            }
          }}
        />
      )}
    </div>
  );
}
