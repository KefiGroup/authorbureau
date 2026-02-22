import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformAccess } from "@/hooks/usePlatformAccess";
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
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";

export type DashboardSection = "overview" | "profile" | "courses" | "speaking" | "coaching" | "ai-toolkit" | "my-books";

export default function AuthorDashboard() {
  const { user, loading, isAdmin, isPremium, subscription, checkSubscription, signOut } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { hasMarketing, loading: accessLoading, requestAccess, requesting, requested } = usePlatformAccess();

  // Sync author profile from PublishNow → Cloud on dashboard load
  useEffect(() => {
    const syncProfile = async () => {
      try {
        const { supabase: sharedSupabase } = await import("@/lib/shared-backend");
        const { supabase: cloudClient } = await import("@/integrations/supabase/client");
        
        // Try shared session first (has the profile data), fallback to Cloud
        let token: string | null = null;
        const { data: sharedSession } = await sharedSupabase.auth.getSession();
        if (sharedSession?.session?.access_token) {
          token = sharedSession.session.access_token;
        } else {
          const { data: cloudSession } = await cloudClient.auth.getSession();
          token = cloudSession?.session?.access_token || null;
        }
        if (!token) return;

        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-author-profile`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } catch (err) {
        console.error("Profile sync failed:", err);
      }
    };

    if (user) syncProfile();
  }, [user]);

  useEffect(() => {
    const status = searchParams.get("checkout");
    if (status === "success") {
      toast({ title: "Welcome to Premium! 🎉", description: "Your subscription is now active." });
      checkSubscription();
    } else if (status === "cancelled") {
      toast({ title: "Checkout cancelled", variant: "destructive" });
    }
  }, [searchParams]);

  if (loading || accessLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  if (!hasMarketing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-md text-center space-y-5 p-8">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-8 w-8 text-secondary" />
          </div>
          <h1 className="font-heading text-2xl font-bold">Marketing Studio Access Required</h1>
          <p className="text-muted-foreground text-sm">
            Your account doesn't have access to the Authors Bureau Marketing Studio yet.
            Request access below and we'll get you set up.
          </p>
          {requested ? (
            <div className="flex items-center justify-center gap-2 text-secondary">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold text-sm">Access requested! We'll notify you soon.</span>
            </div>
          ) : (
            <Button
              onClick={requestAccess}
              disabled={requesting}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              {requesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Request Marketing Access
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileEditor />;
      case "courses":
        return <CourseBuilder />;
      case "speaking":
        return <SpeakingProfile />;
      case "coaching":
        return <CoachingCRM />;
      case "ai-toolkit":
        return <AIToolkit />;
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
        isPremium={isPremium}
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
