import {
  LayoutDashboard, User, BookOpen, Sparkles,
  ChevronLeft, ChevronRight, Crown, ExternalLink, PenLine, BookMarked,
  Lock, Globe, BarChart3, Contact, DollarSign, Radio, Award, CreditCard, Package, Wallet,
  BookHeart, HelpCircle, ChevronDown, ChevronUp, MessageSquare, Megaphone,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import type { DashboardSection } from "@/pages/AuthorDashboard";
import logoIcon from "@/assets/logo-icon.webp";
import { redirectToPublishNow } from "@/lib/publishnow-redirect";
import { toast } from "@/hooks/use-toast";

interface Props {
  activeSection: DashboardSection;
  onSectionChange: (s: DashboardSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isPremium: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  tier?: "free" | "starter" | "pro" | "enterprise";
  hasBooks?: boolean;
  hasAnalysis?: boolean;
  hasMicrosite?: boolean;
  buildUnlocked?: number;
  buildAuthorityUnlocked?: number;
  yieldUnlocked?: number;
  stripeConnected?: boolean;
  pendingReviewCount?: number;
  buildAuthorityCategoryOpen?: boolean;
  yieldCategoryOpen?: boolean;
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
  isPremium, isAdmin = false, isSuperAdmin: isSuperAdminProp = false, tier = "free", hasBooks = true, hasAnalysis = true, hasMicrosite = true,
  buildUnlocked = 0, buildAuthorityUnlocked = 0, yieldUnlocked = 0,
  stripeConnected = false, pendingReviewCount = 0,
  buildAuthorityCategoryOpen = false, yieldCategoryOpen = false,
}: Props) {

  const bypassLocks = isPremium || isAdmin;

  const tierAccess = (required: "starter" | "pro" | "enterprise") => {
    if (bypassLocks) return true;
    const order = ["free", "starter", "pro", "enterprise"];
    return order.indexOf(tier) >= order.indexOf(required);
  };

  // Collapse BUILD YOUR BUSINESS if no analysis and no products
  const [businessExpanded, setBusinessExpanded] = useState(true);

  // Unread nudge count for ABBY Coach badge
  const [unreadNudges, setUnreadNudges] = useState(0);

  // Fetch unread nudges count
  useEffect(() => {
    let channel: any;
    const fetchCount = async () => {
      const { data: profileData } = await supabase
        .from("author_profiles")
        .select("id")
        .limit(1)
        .maybeSingle();
      if (!profileData) return;
      const authorId = profileData.id;

      const { count } = await supabase
        .from("abby_nudges")
        .select("id", { count: "exact", head: true })
        .eq("author_id", authorId)
        .eq("is_read", false);
      setUnreadNudges(count || 0);

      // Realtime subscription
      channel = supabase
        .channel("nudge-badge")
        .on("postgres_changes", { event: "*", schema: "public", table: "abby_nudges", filter: `author_id=eq.${authorId}` }, () => {
          // Re-fetch count on any change
          supabase
            .from("abby_nudges")
            .select("id", { count: "exact", head: true })
            .eq("author_id", authorId)
            .eq("is_read", false)
            .then(({ count: c }) => setUnreadNudges(c || 0));
        })
        .subscribe();
    };
    fetchCount();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  // HOME
  const homeItems: NavItem[] = [
    { id: "abby-coach" as DashboardSection, label: "ABBY Coach", icon: Sparkles,
      subtitle: "Your AI Business Coach",
      tooltip: "Ask ABBY anything about your author business.",
      color: "text-secondary",
      notificationCount: unreadNudges > 0 ? unreadNudges : undefined,
    },
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "brand-products-hub" as DashboardSection, label: "Brand Products", icon: Package,
      subtitle: "9 Revenue Streams",
      tooltip: "View and build your 9 Brand Product nodes.",
      color: "text-emerald-500",
    },
  ];

  // GET STARTED
  const getStartedItems: NavItem[] = [
    { id: "build-business", label: "Analyze with Abby", icon: Sparkles },
    { id: "my-books", label: "My Books Hub", icon: BookOpen, notificationCount: pendingReviewCount },
  ];

  // BUILD YOUR BUSINESS
  // Determine lock state for each B-B-Y category
  const brandAccessible = hasAnalysis || bypassLocks;
  const buildAccessible = isSuperAdminProp || (buildAuthorityCategoryOpen && tierAccess("pro"));
  const yieldAccessible = isSuperAdminProp || (yieldCategoryOpen && tierAccess("enterprise"));

  const businessItems: NavItem[] = [
    {
      id: "revenue-streams", label: "B·Brand Products", icon: DollarSign,
      subtitle: "Create Your Products",
      tooltip: "Turn your book into 9 digital products your audience can buy.",
      color: "text-emerald-500",
      badge: brandAccessible ? `${buildUnlocked} built` : undefined,
      lockMessage: !brandAccessible
        ? "Analyze a book first"
        : !tierAccess("starter")
        ? "Upgrade to Brand Package ($49/mo)"
        : undefined,
    },
    {
      id: "marketing-channels", label: "B·Build Authority", icon: Radio,
      subtitle: buildAccessible ? "Scale Your Audience"
        : (isSuperAdminProp || buildAuthorityCategoryOpen) ? "Requires Build Package" : "Coming Soon",
      tooltip: buildAccessible ? "Scale audience and recurring revenue"
        : !tierAccess("pro") ? "Upgrade to Build Package ($99/mo) to unlock"
        : "Build Authority is coming soon. Stay tuned!",
      color: "text-violet-500",
      badge: buildAccessible ? `${buildAuthorityUnlocked} built` : undefined,
      lockMessage: !buildAccessible
        ? (!tierAccess("pro") && (isSuperAdminProp || buildAuthorityCategoryOpen)
          ? "Upgrade to Build Package ($99/mo)"
          : (isSuperAdminProp || buildAuthorityCategoryOpen) ? undefined : "Build Authority is coming soon")
        : undefined,
    },
    {
      id: "authority-builders", label: "Y·Yield Revenue", icon: Award,
      subtitle: yieldAccessible ? (isSuperAdminProp ? "Dev Access" : "Premium Services")
        : (isSuperAdminProp || yieldCategoryOpen) ? "Requires Yield Package" : "Coming Soon",
      tooltip: yieldAccessible ? "Premium monetization services"
        : !tierAccess("enterprise") ? "Upgrade to Yield Package ($249/mo) to unlock"
        : "Yield Revenue builders are coming soon. Stay tuned!",
      color: "text-amber-500",
      badge: yieldAccessible ? `${yieldUnlocked} built` : undefined,
      lockMessage: !yieldAccessible
        ? (!tierAccess("enterprise") && (isSuperAdminProp || yieldCategoryOpen)
          ? "Upgrade to Yield Package ($249/mo)"
          : (isSuperAdminProp || yieldCategoryOpen) ? undefined : "Yield Revenue builders are coming soon")
        : undefined,
    },
    {
      id: "review-products" as DashboardSection, label: "Review & Publish",
      icon: Package,
      subtitle: "Approve & Go Live",
      tooltip: "Review AI-generated products and publish them to your microsite.",
      notificationCount: pendingReviewCount,
    },
    {
      id: "reading-club" as DashboardSection, label: "Reading Club", icon: BookHeart,
      hidden: true,
    },
  ];

  // YOUR BRAND
  const brandItems: NavItem[] = [
    { id: "profile", label: "Author Profile", icon: User },
    { id: "microsite-manager" as DashboardSection, label: "My Website", icon: Globe },
    {
      id: "author-crm" as DashboardSection, label: "My Contacts",
      icon: Contact,
      lockMessage: !tierAccess("pro") ? "Upgrade to Build Package ($99/mo) to access CRM" : undefined,
    },
    {
      id: "messages" as DashboardSection, label: "Messages",
      icon: MessageSquare,
    },
    {
      id: "marketing-hub" as DashboardSection, label: "Marketing Hub",
      icon: Megaphone,
      subtitle: "Campaign Management",
      tooltip: "View and manage all your automated marketing campaigns.",
      color: "text-rose-500",
    },
  ];

  // REVENUE
  const revenueItems: NavItem[] = [
    {
      id: "analytics" as DashboardSection, label: "Revenue Dashboard", icon: BarChart3,
    },
    {
      id: "connect-stripe" as DashboardSection, label: stripeConnected ? "Stripe Connected" : "Connect Stripe",
      icon: CreditCard,
    },
    {
      id: "payout-settings" as DashboardSection, label: "Payout Settings",
      icon: Wallet,
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
                : "text-foreground hover:bg-muted"
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

        if (item.tooltip || collapsed) {
          return (
            <Tooltip key={`${item.id}-${idx}`}>
              <TooltipTrigger asChild>{btn}</TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px] text-xs">
                {collapsed ? item.label : item.tooltip}
              </TooltipContent>
            </Tooltip>
          );
        }
        return btn;
      })}
    </div>
  );

  const renderCollapsibleBusinessSection = () => {
    const shouldCollapse = !hasAnalysis && !bypassLocks && buildUnlocked === 0 && buildAuthorityUnlocked === 0 && yieldUnlocked === 0;

    return (
      <div className="space-y-0.5">
        {!collapsed && (
          <button
            onClick={() => setBusinessExpanded(!businessExpanded)}
            className="flex items-center justify-between w-full px-3 mb-1.5"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
              Build Your Business
            </p>
            <div className="flex items-center gap-1">
              {shouldCollapse && !businessExpanded && (
                <span className="text-[8px] text-muted-foreground/30 italic">Complete analysis first</span>
              )}
              {businessExpanded ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground/40" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
              )}
            </div>
          </button>
        )}
        {(businessExpanded || collapsed) && businessItems.filter(i => !i.hidden).map((item, idx) => {
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
                </>
              )}
            </button>
          );

          if (item.tooltip || collapsed) {
            return (
              <Tooltip key={`${item.id}-${idx}`}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right" className="max-w-[220px] text-xs">
                  {collapsed ? item.label : item.tooltip}
                </TooltipContent>
              </Tooltip>
            );
          }
          return btn;
        })}
      </div>
    );
  };

  return (
    <aside
      className={`flex flex-col border-r border-border bg-card transition-all duration-200 h-full ${
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
          {renderSection("Home", homeItems)}
          {renderSection("Get Started", getStartedItems)}
          {renderCollapsibleBusinessSection()}
          {renderSection("Your Brand", brandItems)}
          {renderSection("Revenue", revenueItems)}
        </TooltipProvider>

        {/* Sister platform links (TOOLS) */}
        {!collapsed && (
          <div className="space-y-0.5">
            <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
              Tools
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

        {/* SUPPORT */}
        {!collapsed && (
          <div className="space-y-0.5">
            <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
              Support
            </p>
            <button
              onClick={() => onSectionChange("how-it-works" as DashboardSection)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
                activeSection === "how-it-works"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Crown className="h-4 w-4 shrink-0 text-[hsl(45,50%,54%)]" />
              <span className="truncate text-[13px]">How It Works</span>
            </button>
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
