import { Navigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
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
import { Loader2, Rocket, FileText, Video, Share2, CreditCard, Users, Trophy, Podcast, Building2, Bookmark, Award } from "lucide-react";

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
  | "marketing" | "crm";

const comingSoonSections: Record<string, { title: string; description: string; icon: typeof Rocket }> = {
  memberships: {
    title: "Monthly Memberships",
    description: "Tiered membership programs with content drip schedules, member-only resources, and recurring billing via Stripe.",
    icon: CreditCard,
  },
  "group-coaching": {
    title: "Group Coaching",
    description: "AI-generated 8-week group coaching curriculum with session agendas, participant workbooks, and cohort management.",
    icon: Users,
  },
  "big-ticket": {
    title: "Big Ticket Packages",
    description: "Premium consulting packages ($5K–$25K) with application forms, sales pages, and VIP delivery tracking.",
    icon: Trophy,
  },
  "corporate-training": {
    title: "Corporate Training",
    description: "Half-day and full-day corporate training curricula derived from your book, with facilitator guides and participant handbooks.",
    icon: Building2,
  },
  retreats: {
    title: "Retreats & Bootcamps",
    description: "2-3 day retreat programs with detailed agendas, participant materials, registration systems, and early-bird pricing.",
    icon: Bookmark,
  },
  certification: {
    title: "Certification Programs",
    description: "Professional certification programs with multi-module curricula, exam question banks, grading rubrics, and digital certificates.",
    icon: Award,
  },
  masterminds: {
    title: "Masterminds",
    description: "Structured mastermind group programs with quarterly agendas, hot-seat formats, accountability frameworks, and member applications.",
    icon: Trophy,
  },
  crm: {
    title: "CRM & Contacts",
    description: "Your unified customer relationship management hub — track every lead, client, and attendee across all categories.",
    icon: Users,
  },
  marketing: {
    title: "Marketing Package",
    description: "AI-driven marketing suite — email flows, social media calendars, affiliate dashboard, and upsell/downsell automation.",
    icon: Rocket,
  },
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
      <p className="text-muted-foreground text-sm leading-relaxed max-w-lg mx-auto mb-6">
        {info.description}
      </p>
      <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
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

  // Sync section from query param
  useEffect(() => {
    if (sectionParam && sectionParam !== activeSection) {
      setActiveSection(sectionParam);
    }
  }, [sectionParam]);

  useEffect(() => {
    const status = searchParams.get("checkout");
    if (status === "success") {
      toast({ title: "Welcome to Premium! 🎉", description: "Your subscription is now active." });
      checkSubscription();
    } else if (status === "cancelled") {
      toast({ title: "Checkout cancelled", variant: "destructive" });
    }
  }, [searchParams]);

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

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileEditor onNavigate={(s) => setActiveSection(s as DashboardSection)} />;
      case "my-books":
        return <MyBooks isPremium={isPremium || isAdmin} onNavigate={(s) => setActiveSection(s as DashboardSection)} />;
      case "build-business":
        return <BuildMyBusiness />;
      case "courses":
        return gate("Course Builder", <CourseBuilder />, "pro");
      case "workbooks":
        return gate("Workbooks", <WorkbooksManager />);
      case "webinars":
        return gate("Webinars", <WebinarsManager />, "pro");
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
      
      // 3-category views
      case "revenue-streams":
      case "marketing-channels":
      case "authority-builders":
        return <PortfolioStepView categoryId={activeSection} />;

      case "overview":
        return (
          <BusinessFramework
            onNavigate={(s) => setActiveSection(s as DashboardSection)}
            isPremium={isPremium || isAdmin}
          />
        );

      default:
        // All coming-soon sections
        if (comingSoonSections[activeSection]) {
          return gate(comingSoonSections[activeSection].title, <ComingSoonPlaceholder sectionId={activeSection} />);
        }
        return (
          <BusinessFramework
            onNavigate={(s) => setActiveSection(s as DashboardSection)}
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
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
