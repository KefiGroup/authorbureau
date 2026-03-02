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

import MyBooks from "@/components/dashboard/MyBooks";
import BuildMyBusiness from "@/components/dashboard/BuildMyBusiness";
import PremiumGate from "@/components/dashboard/PremiumGate";
import { Loader2, Rocket, FileText, Video, Share2, CreditCard, Users, Trophy, Podcast, Building2, Bookmark, Award } from "lucide-react";

export type DashboardSection =
  | "overview" | "profile" | "my-books"
  | "build-business"
  | "courses" | "workbooks" | "webinars" | "social-media" | "memberships"
  | "coaching" | "group-coaching" | "big-ticket"
  | "speaking" | "podcast" | "corporate-training"
  | "retreats" | "certification" | "masterminds";

const comingSoonSections: Record<string, { title: string; description: string; icon: typeof Rocket }> = {
  workbooks: {
    title: "Workbooks",
    description: "AI-generated companion workbooks (PDF) with exercises, reflection questions, and action plans derived from your book chapters.",
    icon: FileText,
  },
  webinars: {
    title: "Webinars",
    description: "AI-generated webinar scripts, slide decks, registration pages, and follow-up email sequences — all from your book's most compelling chapters.",
    icon: Video,
  },
  "social-media": {
    title: "Social Media Content",
    description: "90-day social media content calendar with platform-specific posts for Facebook, Instagram, LinkedIn, and Twitter/X — all derived from your book.",
    icon: Share2,
  },
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
  podcast: {
    title: "Podcast",
    description: "AI-generated podcast series from your book chapters — episode scripts, show notes, and distribution to Apple Podcasts & Spotify.",
    icon: Podcast,
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
  const { user, loading, isAdmin, isPremium, subscription, checkSubscription, signOut } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<DashboardSection>(
    initialSection || (location.pathname === "/my-books" ? "my-books" : "overview")
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const gate = (featureName: string, children: React.ReactNode) => (
    <PremiumGate isPremium={isPremium || isAdmin} featureName={featureName}>{children}</PremiumGate>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileEditor onNavigate={(s) => setActiveSection(s as DashboardSection)} />;
      case "my-books":
        return <MyBooks />;
      case "build-business":
        return gate("Build My Business", <BuildMyBusiness />);
      case "courses":
        return gate("Course Builder", <CourseBuilder />);
      case "speaking":
        return gate("Speaking Profile", <SpeakingProfile />);
      case "coaching":
        return gate("Coaching CRM", <CoachingCRM />);
      case "overview":
        return <DashboardOverview onNavigate={(s) => setActiveSection(s as DashboardSection)} />;
      default:
        // All coming-soon sections
        if (comingSoonSections[activeSection]) {
          return gate(comingSoonSections[activeSection].title, <ComingSoonPlaceholder sectionId={activeSection} />);
        }
        return <DashboardOverview onNavigate={(s) => setActiveSection(s as DashboardSection)} />;
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
