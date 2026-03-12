import { Navigate, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import JourneyBreadcrumb from "@/components/dashboard/JourneyBreadcrumb";
import type { JourneyStep } from "@/components/dashboard/JourneyBreadcrumb";
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
import UniversalBuilderStudio from "@/components/dashboard/builders/UniversalBuilderStudio";
import { BUILDER_NODE_MAP } from "@/components/dashboard/builders/builderNodeConfig";
import ConnectStripePage from "@/components/dashboard/ConnectStripePage";
import ReviewProductsPage from "@/components/dashboard/ReviewProductsPage";
import AuthorCRMPage from "@/components/dashboard/AuthorCRMPage";
import AuthorReadingClub from "@/components/dashboard/AuthorReadingClub";
import AbbyConsultantBanner from "@/components/dashboard/AbbyConsultantBanner";
import ABBYJourneyOnboarding from "@/components/dashboard/ABBYJourneyOnboarding";
import { Loader2, Rocket, FileText, Video, Share2, CreditCard, Users, Trophy, Podcast, Building2, Bookmark, Award, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supabase as sharedSupabase } from "@/lib/shared-backend";
import { useAuthorStats } from "@/hooks/useAuthorStats";

import { getActiveToken, fetchWithTimeout } from "@/lib/get-active-token";

// All builder node IDs for the type union
const BUILDER_NODE_IDS = Object.keys(BUILDER_NODE_MAP) as Array<keyof typeof BUILDER_NODE_MAP>;

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
  | "marketing" | "crm" | "author-crm" | "reading-club" | "how-it-works"
  | "analytics" | "microsite-manager"
  | "connect-stripe" | "review-products"
  | "book-sales" | "special-editions" | "lead-magnet"
  // Universal builder nodes
  | "builder";

const comingSoonSections: Record<string, { title: string; description: string; icon: typeof Rocket }> = {
  crm: { title: "CRM & Contacts", description: "Your unified customer relationship management hub.", icon: Users },
  marketing: { title: "Marketing Package", description: "AI-driven marketing suite — email flows, social media, affiliate dashboard.", icon: Rocket },
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
  const sectionParam = searchParams.get("section") as DashboardSection | null;
  const [activeSection, setActiveSectionState] = useState<DashboardSection>(
    sectionParam || initialSection || (location.pathname === "/my-books" ? "my-books" : "overview")
  );

  // Sync section to URL so refresh preserves the active section
  const setActiveSection = (section: DashboardSection) => {
    setActiveSectionState(section);
    if (section === "overview") {
      searchParams.delete("section");
    } else {
      searchParams.set("section", section);
    }
    // Clear builder param when navigating to a non-builder section
    if (section !== "builder") {
      searchParams.delete("builder");
    }
    setSearchParams(searchParams, { replace: true });
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Centralized stats from author-stats edge function
  const { stats, refetch: refetchStats } = useAuthorStats(user?.id);

  // Journey state
  const [journeyMicrosite, setJourneyMicrosite] = useState<JourneyStep>("current");
  const [journeyPlan, setJourneyPlan] = useState<JourneyStep>("upcoming");
  const [journeyBuild, setJourneyBuild] = useState<JourneyStep>("upcoming");
  const [journeySell, setJourneySell] = useState<JourneyStep>("upcoming");
  const [booksAnalyzed, setBooksAnalyzed] = useState(0);
  const [hasBooks, setHasBooks] = useState(false);
  const [hasMicrosite, setHasMicrosite] = useState(false);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [analyzedBookList, setAnalyzedBookList] = useState<Array<{ id: string; title: string }>>([]);
  const [showJourneyOnboarding, setShowJourneyOnboarding] = useState(false);

  // Derive journey state from centralized stats
  useEffect(() => {
    setHasBooks(stats.bookCount > 0);
    setBooksAnalyzed(stats.analyzedCount);
    setHasAnalysis(stats.analyzedCount > 0);
    setStripeConnected(stats.stripeConnected);
    setPendingReviewCount(stats.products.totalReadyForReview);
    setHasMicrosite(stats.liveMicrosites > 0);

    const step1Done = stats.liveMicrosites > 0;
    const step2Done = stats.analyzedCount > 0;
    const step3Done = stats.products.totalBuilt > 0;

    setJourneyMicrosite(step1Done ? "done" : "current");
    setJourneyPlan(step2Done ? "done" : "current");
    setJourneyBuild(step3Done ? "done" : step2Done && (isPremium || isAdmin) ? "current" : "upcoming");
    setJourneySell("upcoming");
  }, [stats, isPremium, isAdmin]);

  // Check if journey onboarding should show (first time user has an analyzed book)
  useEffect(() => {
    if (!user || !stats.analyzedCount) return;
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

  const gate = (featureName: string, children: React.ReactNode, requiredTier: "starter" | "pro" | "enterprise" = "starter") => (
    <PremiumGate isPremium={isPremium || isAdmin} featureName={featureName} requiredTier={requiredTier} currentTier={tier}>{children}</PremiumGate>
  );

  const handleNavigate = (s: string) => setActiveSection(s as DashboardSection);

  const renderSection = () => {
    // Check if this is a universal builder node
    const builderNodeId = searchParams.get("builder");
    if (builderNodeId && BUILDER_NODE_MAP[builderNodeId]) {
      return gate(
        BUILDER_NODE_MAP[builderNodeId].label,
        <UniversalBuilderStudio
          nodeConfig={BUILDER_NODE_MAP[builderNodeId]}
          onNavigate={handleNavigate}
        />
      );
    }

    switch (activeSection) {
      case "profile":
        return <ProfileEditor onNavigate={handleNavigate} />;
      case "my-books":
        return <MyBooks isPremium={isPremium || isAdmin} onNavigate={handleNavigate} stripeConnected={stripeConnected} centralStats={stats} />;
      case "build-business":
        return <BuildMyBusiness onNavigate={handleNavigate} />;
      case "analytics":
        return <RevenueDashboard onNavigate={handleNavigate} />;
      case "microsite-manager":
        return <MicrositeManager onNavigate={handleNavigate} />;
      case "courses":
        return gate("Course Builder", <CourseBuilder />, "pro");
      case "home-study":
        return gate("Home Study Course", 
          <UniversalBuilderStudio 
            nodeConfig={BUILDER_NODE_MAP["home-study-course"]} 
            onNavigate={handleNavigate} 
          />, "starter");
      case "workbooks":
        return gate("Workbooks", <WorkbooksManager onNavigate={handleNavigate} />);
      case "webinars":
        return gate("Webinars", <WebinarsManager onNavigate={handleNavigate} />, "pro");
      case "social-media":
        return gate("Social Media", <SocialMediaManager />);
      case "audiobook-studio": {
        const bookIdParam = searchParams.get("bookId") || "";
        const bookTitleParam = searchParams.get("bookTitle") || "";
        return gate("Audiobook Studio", <AudiobookStudio bookId={bookIdParam} bookTitle={bookTitleParam} userId={user.id} />, "pro");
      }
      case "podcast":
        return gate("Podcast Studio", <PodcastManager />, "pro");
      case "speaking":
        return gate("Speaking Profile", <SpeakingProfile />, "enterprise");
      case "coaching":
        return gate("Coaching CRM", <CoachingCRM />, "pro");
      case "group-coaching":
        return gate("Group Coaching", 
          <UniversalBuilderStudio 
            nodeConfig={BUILDER_NODE_MAP["group-coaching"]} 
            onNavigate={handleNavigate} 
          />, "pro");
      case "memberships":
        return gate("Monthly Membership", 
          <UniversalBuilderStudio 
            nodeConfig={BUILDER_NODE_MAP["membership"]} 
            onNavigate={handleNavigate} 
          />, "pro");
      case "email-marketing":
      case "subscribers":
      case "email-templates":
        return gate("Email Marketing", <EmailMarketing activeTab={activeSection} onTabChange={(s) => setActiveSection(s as DashboardSection)} />);
      case "revenue-streams":
        // Subscribers can always access product sections; only gate for free users without analysis
        if (!hasAnalysis && !isPremium && !isAdmin) {
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
        if (!hasAnalysis && !isPremium && !isAdmin) {
          return <SectionGatePage
            sectionTitle="B · Bridge Channels"
            sectionSubtitle="Marketing channels & audience connections."
            gateMessage="Abby needs to understand your audience before she can recommend which marketing channels to activate."
            productNames={["Social Media", "Webinars", "Podcasts", "Website / Microsite", "Affiliates", "Email Marketing", "PR / Media", "Strategic Partnerships"]}
            onAnalyze={() => setActiveSection("build-business")}
          />;
        }
        return <PortfolioStepView categoryId={activeSection} tier={tier} onNavigate={handleNavigate} analyzedBooks={analyzedBookList} />;
      case "authority-builders":
        if (!hasAnalysis && !isPremium && !isAdmin) {
          return <SectionGatePage
            sectionTitle="Y · Yield Revenue"
            sectionSubtitle="Premium revenue streams & monetization."
            gateMessage="Abby needs to understand your business model before she can recommend which revenue streams to pursue."
            productNames={["Book Sales", "Course Sales", "Coaching Fees", "Speaking Fees", "Licensing", "Sponsorships", "Events", "Affiliate Income"]}
            onAnalyze={() => setActiveSection("build-business")}
          />;
        }
        return <PortfolioStepView categoryId={activeSection} tier={tier} onNavigate={handleNavigate} analyzedBooks={analyzedBookList} />;
      case "review-products":
        return <ReviewProductsPage onNavigate={handleNavigate} />;
      case "author-crm":
        return gate("My Contacts", <AuthorCRMPage onNavigate={handleNavigate} />, "pro");
      case "reading-club":
        return <AuthorReadingClub onNavigate={handleNavigate} />;
      case "book-sales":
        return gate("Book Sales", 
          BUILDER_NODE_MAP["book-sales"] ? (
            <UniversalBuilderStudio 
              nodeConfig={BUILDER_NODE_MAP["book-sales"]} 
              onNavigate={handleNavigate} 
            />
          ) : <ComingSoonPlaceholder sectionId="book-sales" />
        );
      case "special-editions":
        return gate("Special Editions", 
          BUILDER_NODE_MAP["special-editions"] ? (
            <UniversalBuilderStudio 
              nodeConfig={BUILDER_NODE_MAP["special-editions"]} 
              onNavigate={handleNavigate} 
            />
          ) : <ComingSoonPlaceholder sectionId="special-editions" />
        );
      case "lead-magnet":
        return gate("Lead Magnet Funnel", 
          BUILDER_NODE_MAP["lead-magnet"] ? (
            <UniversalBuilderStudio 
              nodeConfig={BUILDER_NODE_MAP["lead-magnet"]} 
              onNavigate={handleNavigate} 
            />
          ) : <ComingSoonPlaceholder sectionId="lead-magnet" />
        );
      case "big-ticket":
        return gate("Big Ticket Consulting", 
          BUILDER_NODE_MAP["big-ticket"] ? (
            <UniversalBuilderStudio 
              nodeConfig={BUILDER_NODE_MAP["big-ticket"]} 
              onNavigate={handleNavigate} 
            />
          ) : <ComingSoonPlaceholder sectionId="big-ticket" />
        , "pro");
      case "connect-stripe":
        return <ConnectStripePage />;
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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {!sidebarCollapsed && (
        <div className="fixed inset-0 z-40 bg-foreground/30 lg:hidden" onClick={() => setSidebarCollapsed(true)} />
      )}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:static lg:z-auto
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
          tier={tier}
          hasBooks={hasBooks}
          hasAnalysis={hasAnalysis}
          hasMicrosite={hasMicrosite}
          stripeConnected={stripeConnected}
          pendingReviewCount={pendingReviewCount}
          buildUnlocked={
            (stats.products.perTable["workbooks"]?.total || 0) +
            (stats.products.perTable["home_study_courses"]?.total || 0) +
            (stats.products.perTable["courses"]?.total || 0) +
            (stats.products.perTable["social_media_content"]?.total || 0) +
            (stats.products.perTable["email_flows"]?.total || 0)
          }
          bridgeUnlocked={
            (stats.products.perTable["audiobooks"]?.total || 0) +
            (stats.products.perTable["podcasts"]?.total || 0)
          }
          yieldUnlocked={
            (stats.products.perTable["coaching_packages"]?.total || 0)
          }
        />
      </div>
      <div className="flex flex-1 flex-col min-w-0">
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
        <div className="border-b border-border px-6 lg:px-8 bg-card">
          <JourneyBreadcrumb
            steps={[
              {
                label: journeyMicrosite === "done" ? "Profile Set Up ✓" : "1. Set Up Profile",
                state: journeyMicrosite,
                onClick: () => setActiveSection("profile"),
              },
              {
                label: booksAnalyzed > 0 ? `2. Book Analyzed ✓` : "2. Analyze First Book",
                state: journeyPlan,
                onClick: () => setActiveSection("build-business"),
              },
              {
                label: journeyBuild === "done" ? "3. Product Built ✓" : "3. Build First Product",
                state: journeyBuild,
                onClick: () => setActiveSection("revenue-streams"),
              },
              {
                label: hasMicrosite ? "4. Website Live ✓" : "4. Build Website",
                state: hasMicrosite ? "done" : (journeyBuild === "done" ? "current" : "upcoming"),
                onClick: () => setActiveSection("microsite-manager" as DashboardSection),
              },
              {
                label: stripeConnected ? "5. Stripe Connected ✓" : "5. Connect Stripe",
                state: stripeConnected ? "done" : (hasMicrosite ? "current" : "upcoming"),
                onClick: () => setActiveSection("connect-stripe" as DashboardSection),
              },
            ]}
          />
        </div>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-4">
          {activeSection !== "overview" && activeSection !== "build-business" && (
            <AbbyConsultantBanner compact onAnalyze={() => setActiveSection("build-business")} />
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
              console.log("User selected path:", selectedPath);
            }
          }}
        />
      )}
    </div>
  );
}
