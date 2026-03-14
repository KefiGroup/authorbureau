import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Library, GraduationCap, FileText, Target,
  Users, Calendar, Trophy, Star, User, Settings,
  Menu, X, Bell, ArrowLeftRight, LogOut, Loader2, Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_SECTIONS = [
  {
    label: "Reading",
    items: [
      { title: "Reading Club", icon: BookOpen, path: "/portal/reading-club" },
      { title: "My Library", icon: Library, path: "/portal/library" },
    ],
  },
  {
    label: "Learning",
    items: [
      { title: "My Courses", icon: GraduationCap, path: "/portal/courses" },
      { title: "My Workbooks", icon: FileText, path: "/portal/workbooks" },
    ],
  },
  {
    label: "Premium",
    items: [
      { title: "My Coaching", icon: Target, path: "/portal/coaching" },
      { title: "My Memberships", icon: Users, path: "/portal/memberships" },
      { title: "My Events", icon: Calendar, path: "/portal/events" },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "My Badges", icon: Trophy, path: "/portal/badges" },
      { title: "My Reviews", icon: Star, path: "/portal/reviews" },
      { title: "Profile", icon: User, path: "/portal/profile" },
      { title: "Settings", icon: Settings, path: "/portal/settings" },
    ],
  },
];

interface ReaderProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_streak_days: number;
}

export default function PortalLayout() {
  const { user, loading: authLoading, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [readerProfile, setReaderProfile] = useState<ReaderProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Auto-create reader profile
  useEffect(() => {
    if (!user) return;
    async function ensureProfile() {
      setProfileLoading(true);
      const { data } = await supabase
        .from("reader_profiles")
        .select("id, display_name, avatar_url, total_streak_days")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (data) {
        setReaderProfile(data);
      } else {
        // Auto-create
        const displayName = user!.user_metadata?.display_name || user!.email?.split("@")[0] || "Reader";
        const { data: newProfile } = await supabase
          .from("reader_profiles")
          .insert({ user_id: user!.id, display_name: displayName })
          .select("id, display_name, avatar_url, total_streak_days")
          .single();
        if (newProfile) setReaderProfile(newProfile);
      }
      setProfileLoading(false);
    }
    ensureProfile();
  }, [user]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?redirect=/portal" replace />;
  }

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 z-50
        bg-[hsl(219,47%,12%)] text-[hsl(220,15%,85%)] flex flex-col
        transition-transform duration-300 lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Sidebar header */}
        <div className="p-5 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--accent))] flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="font-heading text-lg font-bold text-white">Readers Portal</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden absolute top-5 right-4 text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Reader info */}
        {readerProfile && (
          <div className="px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[hsl(var(--accent))]/20 flex items-center justify-center text-[hsl(var(--accent))] font-bold text-sm">
                {readerProfile.display_name?.[0]?.toUpperCase() || "R"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{readerProfile.display_name || "Reader"}</p>
                {readerProfile.total_streak_days > 0 && (
                  <p className="text-xs text-amber-400 flex items-center gap-1">
                    <Flame className="h-3 w-3" /> {readerProfile.total_streak_days} day streak
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 px-3 mb-2">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      isActive(item.path)
                        ? "bg-[hsl(var(--accent))] text-white font-medium"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" /> Switch to Authors Portal
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/50 hover:text-red-400 hover:bg-white/5 transition-all w-full text-left"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Portal header */}
        <header className="sticky top-0 z-30 bg-card border-b border-border px-4 lg:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="lg:hidden flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[hsl(var(--accent))]" />
              <span className="font-heading font-bold text-sm">Authors Bureau</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--accent))]/10 flex items-center justify-center text-[hsl(var(--accent))] font-bold text-sm">
              {readerProfile?.display_name?.[0]?.toUpperCase() || "R"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 bg-[hsl(210,20%,98%)]">
          <Outlet context={{ readerProfile, user }} />
        </main>
      </div>
    </div>
  );
}
