import {
  LayoutDashboard, User, BookOpen, Sparkles, Rocket,
  GraduationCap, FileText, Video, Share2, CreditCard,
  Mic, Podcast, Building2, Award,
  Users as UsersIcon, Trophy, Bookmark,
  ChevronLeft, ChevronRight, Crown, ExternalLink, PenLine, BookMarked,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
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

interface NavItem {
  id: DashboardSection;
  label: string;
  icon: typeof LayoutDashboard;
  comingSoon?: boolean;
  premiumOnly?: boolean;
}

interface NavGroup {
  label: string;
  step?: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navGroups: NavGroup[] = [
  {
    label: "Dashboard",
    defaultOpen: true,
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "profile", label: "Author Profile", icon: User },
      { id: "my-books", label: "My Books", icon: BookOpen },
    ],
  },
  {
    label: "AI Engine",
    items: [
      { id: "build-business", label: "Build My Business", icon: Rocket, premiumOnly: true },
      { id: "ai-toolkit", label: "AI Toolkit", icon: Sparkles, premiumOnly: true },
    ],
  },
  {
    label: "Step 1 — Digital Products",
    step: "1",
    items: [
      { id: "courses", label: "Online Courses", icon: GraduationCap, premiumOnly: true },
      { id: "workbooks", label: "Workbooks", icon: FileText, premiumOnly: true, comingSoon: true },
      { id: "webinars", label: "Webinars", icon: Video, premiumOnly: true, comingSoon: true },
      { id: "social-media", label: "Social Media", icon: Share2, premiumOnly: true, comingSoon: true },
      { id: "memberships", label: "Memberships", icon: CreditCard, premiumOnly: true, comingSoon: true },
    ],
  },
  {
    label: "Step 2 — Coaching",
    step: "2",
    items: [
      { id: "coaching", label: "Coaching Packages", icon: UsersIcon, premiumOnly: true },
      { id: "group-coaching", label: "Group Coaching", icon: UsersIcon, premiumOnly: true, comingSoon: true },
      { id: "big-ticket", label: "Big Ticket", icon: Trophy, premiumOnly: true, comingSoon: true },
    ],
  },
  {
    label: "Step 3 — Speaking",
    step: "3",
    items: [
      { id: "speaking", label: "Speaking Topics", icon: Mic, premiumOnly: true },
      { id: "podcast", label: "Podcast", icon: Podcast, premiumOnly: true, comingSoon: true },
      { id: "corporate-training", label: "Corporate Training", icon: Building2, premiumOnly: true, comingSoon: true },
    ],
  },
  {
    label: "Step 4 — Seminars",
    step: "4",
    items: [
      { id: "retreats", label: "Retreats & Bootcamps", icon: Bookmark, premiumOnly: true, comingSoon: true },
      { id: "certification", label: "Certification", icon: Award, premiumOnly: true, comingSoon: true },
      { id: "masterminds", label: "Masterminds", icon: Trophy, premiumOnly: true, comingSoon: true },
    ],
  },
];

const sisterLinks = [
  { label: "AI Writing Studio", icon: PenLine, path: "/writing" },
  { label: "AI Publishing Studio", icon: BookMarked, path: "/publishing" },
];

const stepColors: Record<string, string> = {
  "1": "text-blue-500",
  "2": "text-amber-600",
  "3": "text-rose-500",
  "4": "text-emerald-500",
};

export default function DashboardSidebar({ activeSection, onSectionChange, collapsed, onToggleCollapse, isPremium }: Props) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navGroups.forEach((g) => {
      initial[g.label] = g.defaultOpen || g.items.some((i) => i.id === "overview");
    });
    return initial;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside
      className={`hidden lg:flex flex-col border-r border-border bg-card transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
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
      <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
        {navGroups.map((group) => {
          const isOpen = openGroups[group.label] ?? false;
          const hasActiveItem = group.items.some((i) => i.id === activeSection);

          return (
            <div key={group.label}>
              {/* Group header */}
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center justify-between px-3 py-1.5 mt-2 first:mt-0"
                >
                  <span className="flex items-center gap-1.5">
                    {group.step && (
                      <span className={`text-[10px] font-bold ${stepColors[group.step] || "text-muted-foreground"}`}>
                        {group.step}
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                      hasActiveItem ? "text-foreground" : "text-muted-foreground/50"
                    }`}>
                      {group.label}
                    </span>
                  </span>
                  <ChevronDown className={`h-3 w-3 text-muted-foreground/40 transition-transform ${
                    isOpen ? "" : "-rotate-90"
                  }`} />
                </button>
              )}

              {/* Items */}
              {(collapsed || isOpen) && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
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
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : isLocked
                            ? "text-muted-foreground/40 cursor-not-allowed"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                        title={isLocked ? "Premium feature" : item.label}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="truncate text-[13px]">{item.label}</span>
                            {item.comingSoon && !isLocked && (
                              <span className="ml-auto text-[9px] font-medium uppercase tracking-wide text-muted-foreground/50 bg-muted rounded px-1.5 py-0.5">
                                Soon
                              </span>
                            )}
                            {isLocked && <Crown className="ml-auto h-3 w-3 text-secondary" />}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
                title={link.label}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                <span className="truncate text-[13px]">{link.label}</span>
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
