import { User, BookOpen, Mic, GraduationCap, LayoutDashboard, ChevronLeft, ChevronRight, Crown, Sparkles, Zap, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import type { DashboardSection } from "@/pages/AuthorDashboard";
import { supabase, SHARED_BACKEND_URL } from "@/lib/shared-backend";
import logoIcon from "@/assets/logo-icon.png";

interface Props {
  activeSection: DashboardSection;
  onSectionChange: (s: DashboardSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isPremium: boolean;
}

const navItems: { id: DashboardSection | "profile-external"; label: string; icon: typeof LayoutDashboard; premiumOnly?: boolean; external?: boolean }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "profile-external", label: "Profile", icon: User, external: true },
  { id: "my-books", label: "My Books", icon: BookOpen },
  { id: "ai-toolkit", label: "AI Toolkit", icon: Sparkles, premiumOnly: true },
  { id: "courses", label: "Courses", icon: GraduationCap, premiumOnly: true },
  { id: "speaking", label: "Speaking", icon: Mic, premiumOnly: true },
  { id: "coaching", label: "Coaching", icon: BookOpen, premiumOnly: true },
];

export default function DashboardSidebar({ activeSection, onSectionChange, collapsed, onToggleCollapse, isPremium }: Props) {
  const [ssoLoading, setSsoLoading] = useState(false);

  const handleProfileRedirect = async () => {
    setSsoLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.open("https://publishnowinterface.lovable.app", "_blank");
        return;
      }
      const res = await fetch(`${SHARED_BACKEND_URL}/functions/v1/sso-handoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          action: "generate",
          session_data: { access_token: session.access_token, refresh_token: session.refresh_token },
          source_platform: "authorsbureau",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        window.open("https://publishnowinterface.lovable.app", "_blank");
        return;
      }
      window.open(`https://publishnowinterface.lovable.app/#/sso?token=${data.token}&from=authorsbureau&redirect=profile`, "_blank");
    } catch (err) {
      console.error("SSO redirect to profile failed:", err);
      window.open("https://publishnowinterface.lovable.app", "_blank");
    } finally {
      setSsoLoading(false);
    }
  };

  return (
    <aside
      className={`hidden lg:flex flex-col border-r border-border bg-card transition-all duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <img src={logoIcon} alt="Authors Bureau" className="h-8 w-8 shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <span className="font-heading text-lg font-bold truncate block">
              Authors <span className="text-gradient-gold">Bureau</span>
            </span>
            <span className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground/60 leading-none">
              AI Marketing Studio
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isLocked = item.premiumOnly && !isPremium;
          const isActive = !item.external && activeSection === item.id;
          const isProfileLoading = item.external && ssoLoading;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isLocked) return;
                if (item.external) {
                  handleProfileRedirect();
                } else {
                  onSectionChange(item.id as DashboardSection);
                }
              }}
              disabled={isLocked || isProfileLoading}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isLocked
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title={isLocked ? "Premium feature" : item.external ? "Edit on PublishNow.io" : item.label}
            >
              {isProfileLoading ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              ) : (
                <item.icon className="h-5 w-5 shrink-0" />
              )}
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {isLocked && <Crown className="ml-auto h-3.5 w-3.5 text-secondary" />}
                  {item.external && <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
