import {
  LayoutDashboard, User, BookOpen, Sparkles,
  ChevronLeft, ChevronRight, Crown, ExternalLink, PenLine, BookMarked,
  Megaphone, Contact, DollarSign, Radio, Award,
} from "lucide-react";
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
  premiumOnly?: boolean;
  color?: string;
}

const navItems: NavItem[] = [
  { id: "overview", label: "ABBY Framework", icon: LayoutDashboard },
  { id: "profile", label: "Author Profile", icon: User },
  { id: "my-books", label: "My Books Hub", icon: BookOpen },
  { id: "build-business", label: "Analyze with Abby", icon: Sparkles, premiumOnly: true },
  { id: "revenue-streams", label: "Revenue Streams", icon: DollarSign, premiumOnly: true, color: "text-emerald-500" },
  { id: "marketing-channels", label: "Marketing Channels", icon: Radio, premiumOnly: true, color: "text-violet-500" },
  { id: "authority-builders", label: "Authority Builders", icon: Award, premiumOnly: true, color: "text-sky-500" },
  { id: "marketing" as DashboardSection, label: "Marketing", icon: Megaphone, premiumOnly: true },
  { id: "crm" as DashboardSection, label: "CRM", icon: Contact, premiumOnly: true },
];

const sisterLinks = [
  { label: "AI Writing Studio", icon: PenLine, path: "/writing" },
  { label: "AI Publishing Studio", icon: BookMarked, path: "/publishing" },
];

export default function DashboardSidebar({ activeSection, onSectionChange, collapsed, onToggleCollapse, isPremium }: Props) {
  const handleNav = (id: DashboardSection) => {
    onSectionChange(id);
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
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isLocked = item.premiumOnly && !isPremium;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isLocked) return;
                handleNav(item.id);
              }}
              disabled={isLocked}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isLocked
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title={isLocked ? "Premium feature" : item.label}
            >
              <item.icon className={`h-4 w-4 shrink-0 ${!isActive && item.color ? item.color : ""}`} />
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {isLocked && <Crown className="ml-auto h-3 w-3 text-secondary" />}
                </>
              )}
            </button>
          );
        })}

        {/* Sister platform links */}
        {!collapsed && (
          <div className="mt-6 pt-4 border-t border-border space-y-1">
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              Writing & Publishing
            </p>
            {sisterLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  redirectToPublishNow(link.path).then(({ error, fallbackUrl }) => {
                    if (error) {
                      toast({
                        title: "Could not open",
                        description: error,
                        variant: "destructive",
                        action: fallbackUrl ? (
                          <button
                            className="shrink-0 rounded bg-destructive-foreground/10 px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive-foreground/20 transition-colors"
                            onClick={() => window.open(fallbackUrl, "_blank")}
                          >
                            Open directly
                          </button>
                        ) : undefined,
                      });
                    }
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
