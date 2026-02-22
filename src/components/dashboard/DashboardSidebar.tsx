import { User, BookOpen, Mic, GraduationCap, LayoutDashboard, ChevronLeft, ChevronRight, Crown, Sparkles, ExternalLink, PenLine, BookMarked } from "lucide-react";
import type { DashboardSection } from "@/pages/AuthorDashboard";
import logoIcon from "@/assets/logo-icon.png";
import { redirectToPublishNow } from "@/lib/publishnow-redirect";
import { toast } from "@/hooks/use-toast";

interface Props {
  activeSection: DashboardSection;
  onSectionChange: (s: DashboardSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isPremium: boolean;
}

const navItems: { id: DashboardSection; label: string; icon: typeof LayoutDashboard; premiumOnly?: boolean }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: User },
  { id: "my-books", label: "My Books", icon: BookOpen },
  { id: "ai-toolkit", label: "AI Toolkit", icon: Sparkles, premiumOnly: true },
  { id: "courses", label: "Courses", icon: GraduationCap, premiumOnly: true },
  { id: "speaking", label: "Speaking", icon: Mic, premiumOnly: true },
  { id: "coaching", label: "Coaching", icon: BookOpen, premiumOnly: true },
];

const sisterLinks = [
  { label: "AI Writing Studio", icon: PenLine, path: "/ai-writing-studio" },
  { label: "AI Publishing Studio", icon: BookMarked, path: "/ai-publishing-studio" },
];

export default function DashboardSidebar({ activeSection, onSectionChange, collapsed, onToggleCollapse, isPremium }: Props) {
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
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isLocked) return;
                onSectionChange(item.id);
              }}
              disabled={isLocked}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isLocked
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title={isLocked ? "Premium feature" : item.label}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {isLocked && <Crown className="ml-auto h-3.5 w-3.5 text-secondary" />}
                </>
              )}
            </button>
          );
        })}

        {/* Sister platform links */}
        {!collapsed && (
          <div className="mt-4 pt-4 border-t border-border space-y-1">
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              Writing & Publishing
            </p>
            {sisterLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  redirectToPublishNow(link.path).then(({ error }) => {
                    if (error) toast({ title: "Could not open", description: error, variant: "destructive" });
                  });
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
                title={link.label}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{link.label}</span>
                <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground/40" />
              </button>
            ))}
          </div>
        )}
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
