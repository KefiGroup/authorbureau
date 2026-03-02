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
import AIToolkit from "@/components/dashboard/AIToolkit";
import MyBooks from "@/components/dashboard/MyBooks";
import PremiumGate from "@/components/dashboard/PremiumGate";
import { Loader2 } from "lucide-react";

export type DashboardSection = "overview" | "profile" | "courses" | "speaking" | "coaching" | "ai-toolkit" | "my-books";

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

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileEditor onNavigate={(s) => setActiveSection(s as DashboardSection)} />;
      case "courses":
        return <PremiumGate isPremium={isPremium || isAdmin} featureName="Course Builder"><CourseBuilder /></PremiumGate>;
      case "speaking":
        return <PremiumGate isPremium={isPremium || isAdmin} featureName="Speaking Profile"><SpeakingProfile /></PremiumGate>;
      case "coaching":
        return <PremiumGate isPremium={isPremium || isAdmin} featureName="Coaching CRM"><CoachingCRM /></PremiumGate>;
      case "ai-toolkit":
        return <PremiumGate isPremium={isPremium || isAdmin} featureName="AI Toolkit"><AIToolkit /></PremiumGate>;
      case "my-books":
        return <MyBooks />;
      default:
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
