import { Navigate, useSearchParams, useLocation } from "react-router-dom";
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
import DashboardOverview from "@/components/dashboard/DashboardOverview";
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
import { Loader2, Rocket, FileText, Video, Share2, CreditCard, Users, Trophy, Podcast, Building2, Bookmark, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// All builder node IDs for the type union
const BUILDER_NODE_IDS = Object.keys(BUILDER_NODE_MAP) as Array<keyof typeof BUILDER_NODE_MAP>;

export type DashboardSection =
  | "overview" | "profile" | "my-books"
  | "build-business"
  | "courses" | "workbooks" | "webinars" | "social-media" | "memberships"
  | "audiobook-studio"
  | "coaching" | "group-coaching" | "big-ticket"
  | "speaking" | "podcast" | "corporate-training"
  | "retreats" | "certification" | "masterminds"
  | "email-marketing" | "subscribers" | "email-templates"
  | "revenue-streams" | "marketing-channels" | "authority-builders"
  | "marketing" | "crm" | "author-crm" | "reading-club"
  | "analytics" | "microsite-manager"
  | "connect-stripe" | "review-products"
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
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const sectionParam = searchParams.get("section") as DashboardSection | null;
  const [activeSection, setActiveSection] = useState<DashboardSection>(
    sectionParam || initialSection || (location.pathname === "/my-books" ? "my-books" : "overview")
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  useEffect(() => {
    if (sectionParam && sectionParam !== activeSection) setActiveSection(sectionParam);
  }, [sectionParam]);

  useEffect(() => {
    const status = searchParams.get("checkout");
    if (status === "success") {
      toast({ title: "Welcome to Premium! 🎉", description: "Your subscription is now active." });
      checkSubscription();
    } else if (status === "cancelled") {
      toast({ title: "Checkout cancelled", variant: "destructive" });
    }
    // Stripe Connect return
    if (searchParams.get("stripe_connected") === "true") {
      toast({ title: "Stripe Connected! 💳", description: "You can now accept payments from your audience." });
      setStripeConnected(true);
    }
  }, [searchParams]);

  // Fetch journey state
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: profile } = await supabase
          .from("author_profiles")
          .select("directory_status, pen_name, photo_url, bio_short, bio_long, stripe_onboarding_complete")
          .eq("user_id", user.id)
          .maybeSingle();

        const hasName = !!profile?.pen_name?.trim();
        const hasPhoto = !!profile?.photo_url?.trim();
        const hasBio = !!(profile?.bio_long?.trim() || profile?.bio_short?.trim());
        const isListed = profile && ["listed", "verified", "featured"].includes(profile.directory_status || "");
        const profileComplete = isListed && hasName && hasPhoto && hasBio;
        setStripeConnected(!!(profile as any)?.stripe_onboarding_complete);

        const { data: books } = await supabase
          .from("books")
          .select("id")
          .eq("author_id", user.id);
        const bookCount = (books || []).length;
        setHasBooks(bookCount > 0);

        // Step 1 done = profile complete + has books
        const step1Done = !!profileComplete && bookCount > 0;
        setHasMicrosite(step1Done);

        const { data: plans } = await supabase
          .from("generated_assets")
          .select("book_id")
          .eq("author_id", user.id)
          .eq("asset_type", "business_plan");

        const analyzed = new Set((plans || []).map((p: any) => p.book_id)).size;
        setBooksAnalyzed(analyzed);
        const step2Done = analyzed > 0;
        setHasAnalysis(step2Done);

        // Sequential journey logic
        setJourneyMicrosite(step1Done ? "done" : "current");
        setJourneyPlan(step2Done ? "done" : step1Done ? "current" : "upcoming");
        setJourneyBuild(step2Done ? (isPremium ? "current" : "upcoming") : "upcoming");
        setJourneySell("upcoming");

        // Count pending review products
        let reviewCount = 0;
        const tables = ["courses", "home_study_courses", "webinars", "audiobooks", "podcasts"] as const;
        for (const table of tables) {
          const { count } = await supabase
            .from(table)
            .select("id", { count: "exact", head: true })
            .eq("author_id", user.id)
            .eq("status", "ready_for_review");
          reviewCount += count || 0;
        }
        setPendingReviewCount(reviewCount);
      } catch {}
    })();
  }, [user, isPremium]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
      return (
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
        return <MyBooks isPremium={isPremium || isAdmin} onNavigate={handleNavigate} stripeConnected={stripeConnected} />;
      case "build-business":
        return <BuildMyBusiness />;
      case "analytics":
        return <RevenueDashboard onNavigate={handleNavigate} />;
      case "microsite-manager":
        return <MicrositeManager onNavigate={handleNavigate} />;
      case "courses":
        return gate("Course Builder", <CourseBuilder />, "pro");
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
      case "email-marketing":
      case "subscribers":
      case "email-templates":
        return gate("Email Marketing", <EmailMarketing activeTab={activeSection} onTabChange={(s) => setActiveSection(s as DashboardSection)} />);
      case "revenue-streams":
        if (!hasAnalysis) {
          return <SectionGatePage
            sectionTitle="B · Build Authority"
            sectionSubtitle="Create digital products that establish you as the expert in your field."
            gateMessage="Abby needs to understand your book before she can recommend which authority products to build."
            productNames={["Online Courses", "Home Study", "Workbook", "Audiobook", "Memberships", "Upsells", "1-on-1 Coaching", "Group Coaching", "Big Ticket Consulting", "Revenue Sharing", "Keynotes"]}
            onAnalyze={() => setActiveSection("build-business")}
          />;
        }
        return <PortfolioStepView categoryId={activeSection} tier={tier} onNavigate={handleNavigate} />;
      case "marketing-channels":
        if (!hasAnalysis) {
          return <SectionGatePage
            sectionTitle="B · Bridge Channels"
            sectionSubtitle="Marketing channels & audience connections."
            gateMessage="Abby needs to understand your audience before she can recommend which marketing channels to activate."
            productNames={["Social Media", "Webinars", "Podcasts", "Website / Microsite", "Affiliates", "Email Marketing", "PR / Media", "Strategic Partnerships"]}
            onAnalyze={() => setActiveSection("build-business")}
          />;
        }
        return <PortfolioStepView categoryId={activeSection} tier={tier} onNavigate={handleNavigate} />;
      case "authority-builders":
        if (!hasAnalysis) {
          return <SectionGatePage
            sectionTitle="Y · Yield Revenue"
            sectionSubtitle="Premium revenue streams & monetization."
            gateMessage="Abby needs to understand your business model before she can recommend which revenue streams to pursue."
            productNames={["Book Sales", "Course Sales", "Coaching Fees", "Speaking Fees", "Licensing", "Sponsorships", "Events", "Affiliate Income"]}
            onAnalyze={() => setActiveSection("build-business")}
          />;
        }
        return <PortfolioStepView categoryId={activeSection} tier={tier} onNavigate={handleNavigate} />;
      case "review-products":
        return <ReviewProductsPage onNavigate={handleNavigate} />;
      case "author-crm":
        return gate("My Contacts", <AuthorCRMPage onNavigate={handleNavigate} />, "pro");
      case "reading-club":
        return <AuthorReadingClub onNavigate={handleNavigate} />;
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
      <DashboardSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isPremium={isPremium || isAdmin}
        tier={tier}
        hasBooks={hasBooks}
        hasAnalysis={hasAnalysis}
        hasMicrosite={hasMicrosite}
        stripeConnected={stripeConnected}
        pendingReviewCount={pendingReviewCount}
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
        <div className="border-b border-border px-6 lg:px-8 bg-card">
          <JourneyBreadcrumb
            steps={[
              {
                label: journeyMicrosite === "done" ? "Microsite Live" : "Set Up Microsite",
                state: journeyMicrosite,
                onClick: () => setActiveSection("my-books"),
              },
              {
                label: booksAnalyzed > 0 ? `${booksAnalyzed} Book${booksAnalyzed !== 1 ? "s" : ""} Analyzed` : "Analyze Books",
                state: journeyPlan,
                onClick: () => setActiveSection("build-business"),
              },
              ...(isPremium && !stripeConnected ? [{
                label: "Connect Payments" as string,
                state: (journeyPlan === "done" && !stripeConnected ? "current" : journeyPlan === "done" ? "done" : "upcoming") as JourneyStep,
                onClick: () => setActiveSection("connect-stripe" as DashboardSection),
              }] : []),
              {
                label: "Building Products",
                state: journeyBuild,
                onClick: () => setActiveSection("revenue-streams"),
              },
              {
                label: "Earning Revenue",
                state: journeySell,
                onClick: () => setActiveSection("analytics" as DashboardSection),
              },
            ]}
          />
        </div>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
