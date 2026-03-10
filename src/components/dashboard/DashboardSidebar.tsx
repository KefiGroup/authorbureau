import {
  LayoutDashboard, User, BookOpen, Sparkles,
  ChevronLeft, ChevronRight, Crown, ExternalLink, PenLine, BookMarked,
  Lock, Globe, BarChart3, Contact, DollarSign, Radio, Award, CreditCard, Package,
  BookHeart, HelpCircle,
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
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
  isAdmin?: boolean;
  tier?: "free" | "starter" | "pro" | "enterprise";
  hasBooks?: boolean;
  hasAnalysis?: boolean;
  hasMicrosite?: boolean;
  buildUnlocked?: number;
  bridgeUnlocked?: number;
  yieldUnlocked?: number;
  stripeConnected?: boolean;
  pendingReviewCount?: number;
}

interface NavItem {
  id: DashboardSection;
  label: string;
  subtitle?: string;
  tooltip?: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  lockMessage?: string;
  hidden?: boolean;
  color?: string;
  notificationCount?: number;
}

const sisterLinks = [
  { label: "AI Writing Studio", icon: PenLine, path: "/writing" },
  { label: "AI Publishing Studio", icon: BookMarked, path: "/publishing" },
];

export default function DashboardSidebar({
  activeSection, onSectionChange, collapsed, onToggleCollapse,
  isPremium, isAdmin = false, tier = "free", hasBooks = true, hasAnalysis = true, hasMicrosite = true,
  buildUnlocked = 0, bridgeUnlocked = 0, yieldUnlocked = 0,
  stripeConnected = false, pendingReviewCount = 0,
}: Props) {

  // Admin and premium users bypass all tier locks
  const bypassLocks = isPremium || isAdmin;

  const tierAccess = (required: "starter" | "pro" | "enterprise") => {
    if (bypassLocks) return true;
    const order = ["free", "starter", "pro", "enterprise"];
    return order.indexOf(tier) >= order.indexOf(required);
  };

  // Section 1: Your Journey
  const journeyItems: NavItem[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "my-books", label: "My Books Hub", icon: BookOpen, notificationCount: pendingReviewCount },
    { id: "build-business", label: "Analyze with Abby", icon: Sparkles },
  ];

  // Section 2: Build Your Business
  const businessItems: NavItem[] = [
    {
      id: "revenue-streams", label: "B·Build Authority", icon: DollarSign,
      subtitle: "Create Digital Products",
      tooltip: "Turn your book into 11 digital products your audience can buy.",
      color: "text-emerald-500",
      badge: hasAnalysis || bypassLocks ? `${buildUnlocked} of 11` : undefined,
      lockMessage: (!hasAnalysis && !bypassLocks) ? "Analyze a book first" : (!tierAccess("starter") ? "Requires Starter" : undefined),
    },
    {
      id: "marketing-channels", label: "B·Bridge Channels", icon: Radio,
      subtitle: "Grow Your Audience",
      tooltip: "Build the marketing channels that bring readers to you.",
      color: "text-violet-500",
      badge: tierAccess("pro") ? `${bridgeUnlocked} of 8` : undefined,
      lockMessage: !tierAccess("pro") ? "Requires Pro Plan" : undefined,
    },
    {
      id: "authority-builders", label: "Y·Yield Revenue", icon: Award,
      subtitle: "High-Ticket & Premium Offers",
      tooltip: "Unlock premium speaking, coaching, and event income.",
      color: "text-amber-500",
      badge: tierAccess("enterprise") ? `${yieldUnlocked} of 8` : undefined,
      lockMessage: !tierAccess("enterprise") ? "Requires Enterprise" : undefined,
    },
    {
      id: "reading-club" as DashboardSection, label: "Reading Club", icon: BookHeart,
    },
  ];

  // Section 3: Your Brand
  const brandItems: NavItem[] = [
    { id: "profile", label: "Author Profile", icon: User },
    { id: "microsite-manager" as DashboardSection, label: "My Microsite", icon: Globe },
    {
      id: "author-crm" as DashboardSection, label: "My Contacts",
      icon: Contact,
      lockMessage: !tierAccess("pro") ? `Upgrade to ${tier === "starter" ? "Pro" : "Pro"} to access your CRM` : undefined,
    },
    {
      id: "review-products" as DashboardSection, label: "Review Products", icon: Package,
      notificationCount: pendingReviewCount,
    },
    {
      id: "analytics" as DashboardSection, label: "Revenue Dashboard", icon: BarChart3,
      hidden: !hasMicrosite && !isPremium,
    },
  ];

  const renderSection = (title: string, items: NavItem[]) => (
    <div className="space-y-0.5">
      {!collapsed && (
        <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
          {title}
        </p>
      )}
      {items.filter(i => !i.hidden).map((item, idx) => {
        const isLocked = !!item.lockMessage;
        const isActive = activeSection === item.id && !isLocked;

        const btn = (
          <button
            key={`${item.id}-${idx}`}
            onClick={() => {
              if (isLocked) {
                toast({ title: "Locked", description: item.lockMessage });
                return;
              }
              onSectionChange(item.id);
            }}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : isLocked
                ? "text-muted-foreground/35 cursor-default"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            title={isLocked ? item.lockMessage : item.label}
          >
            <item.icon className={`h-4 w-4 shrink-0 ${!isActive && item.color ? item.color : ""}`} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left whitespace-normal leading-tight">
                  <span className="block">{item.label}</span>
                  {item.subtitle && (
                    <span className="block text-[10px] font-normal text-muted-foreground/50 leading-tight">{item.subtitle}</span>
                  )}
                </span>
                {isLocked && <Lock className="h-3 w-3 text-muted-foreground/30" />}
                {item.badge && !isLocked && (
                  <span className="text-[10px] text-muted-foreground/60 font-normal">{item.badge}</span>
                )}
                {(item.notificationCount ?? 0) > 0 && !isLocked && (
                  <span className="inline-flex items-center justify-center rounded-full bg-secondary text-secondary-foreground w-4 h-4 text-[9px] font-bold">
                    {item.notificationCount}
                  </span>
                )}
              </>
            )}
          </button>
        );

        if (item.tooltip) {
          return (
            <Tooltip key={`${item.id}-${idx}`}>
              <TooltipTrigger asChild>{btn}</TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px] text-xs">
                {item.tooltip}
              </TooltipContent>
            </Tooltip>
          );
        }
        return btn;
      })}
    </div>
  );

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
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
        <TooltipProvider delayDuration={300}>
        {renderSection("Your Journey", journeyItems)}
        {renderSection("Build Your Business", businessItems)}
        {renderSection("Your Brand", brandItems)}

        {/* Stripe Connect status badge */}
        {!collapsed && isPremium && (
          <div className="px-3">
            {stripeConnected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 text-accent px-2.5 py-1 text-[10px] font-semibold">
                <CreditCard className="h-3 w-3" /> Payments Active
              </span>
            ) : (
              <button
                onClick={() => onSectionChange("connect-stripe" as any)}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 text-secondary px-2.5 py-1 text-[10px] font-semibold hover:bg-secondary/25 transition-colors"
              >
                <CreditCard className="h-3 w-3" /> Connect Stripe
              </button>
            )}
          </div>
        )}

        {/* Sister platform links */}
        {!collapsed && (
          <div className="space-y-0.5">
            <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
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
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors"
                title={link.label}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                <span className="truncate text-[13px]">{link.label}</span>
                <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground/30" />
              </button>
            ))}
          </div>
        )}

        {/* Support link */}
        {!collapsed && (
          <div className="space-y-0.5">
            <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
              Support
            </p>
            <a
              href="/faq"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors"
            >
              <HelpCircle className="h-4 w-4 shrink-0" />
              <span className="truncate text-[13px]">Help &amp; FAQ</span>
            </a>
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
