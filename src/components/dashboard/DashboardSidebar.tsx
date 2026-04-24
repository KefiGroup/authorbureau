import {
  LayoutDashboard, User, BookOpen, Sparkles,
  ChevronLeft, ChevronRight, ExternalLink, PenLine, BookMarked,
  Lock, Globe, BarChart3, Contact, DollarSign, Radio, Award, CreditCard, Package, Wallet,
  BookHeart, ChevronDown, ChevronUp, MessageSquare, Megaphone, Settings, Filter, Library,
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
  tier?: "free" | "brand" | "build" | "yield";
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
  /** Per-book stats when the user is inside a specific book context */
  currentBook?: {
    id: string;
    title: string;
    brand: number;
    build: number;
    yield: number;
    total: number;
  } | null;
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

// 5-minute TTL cached counter to avoid "0 built" flicker on hydration
const CACHE_TTL_MS = 5 * 60 * 1000;
function readCachedCount(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { value: number; ts: number };
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return 0;
    return typeof parsed.value === "number" ? parsed.value : 0;
  } catch {
    return 0;
  }
}
function writeCachedCount(key: string, value: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ value, ts: Date.now() }));
  } catch {
    /* ignore quota errors */
  }
}

export default function DashboardSidebar({
  activeSection, onSectionChange, collapsed, onToggleCollapse,
  isPremium, isAdmin = false, isSuperAdmin: isSuperAdminProp = false, tier = "free", hasBooks = true, hasAnalysis = true, hasMicrosite = true,
  buildUnlocked: buildUnlockedProp = 0,
  buildAuthorityUnlocked: buildAuthorityUnlockedProp = 0,
  yieldUnlocked: yieldUnlockedProp = 0,
  stripeConnected = false, pendingReviewCount = 0,
  buildAuthorityCategoryOpen = false, yieldCategoryOpen = false,
  currentBook = null,
}: Props) {

  // Hydrate from cache to prevent "0 built" flash, then update from live props
  const [buildUnlocked, setBuildUnlocked] = useState(() =>
    buildUnlockedProp > 0 ? buildUnlockedProp : readCachedCount("ab_bp_built_count")
  );
  const [buildAuthorityUnlocked, setBuildAuthorityUnlocked] = useState(() =>
    buildAuthorityUnlockedProp > 0 ? buildAuthorityUnlockedProp : readCachedCount("ab_ba_built_count")
  );
  const [yieldUnlocked, setYieldUnlocked] = useState(() =>
    yieldUnlockedProp > 0 ? yieldUnlockedProp : readCachedCount("ab_yr_built_count")
  );

  useEffect(() => {
    if (buildUnlockedProp > 0) {
      setBuildUnlocked(buildUnlockedProp);
      writeCachedCount("ab_bp_built_count", buildUnlockedProp);
    }
  }, [buildUnlockedProp]);
  useEffect(() => {
    if (buildAuthorityUnlockedProp > 0) {
      setBuildAuthorityUnlocked(buildAuthorityUnlockedProp);
      writeCachedCount("ab_ba_built_count", buildAuthorityUnlockedProp);
    }
  }, [buildAuthorityUnlockedProp]);
  useEffect(() => {
    if (yieldUnlockedProp > 0) {
      setYieldUnlocked(yieldUnlockedProp);
      writeCachedCount("ab_yr_built_count", yieldUnlockedProp);
    }
  }, [yieldUnlockedProp]);

  const bypassLocks = isPremium || isAdmin;

  const tierAccess = (required: "brand" | "build" | "yield") => {
    if (bypassLocks) return true;
    const order: string[] = ["free", "brand", "build", "yield"];
    return order.indexOf(tier) >= order.indexOf(required);
  };

  const [businessExpanded, setBusinessExpanded] = useState(true);

  // Unread nudge count for Ask ABBY badge
  const [unreadNudges, setUnreadNudges] = useState(0);

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

      channel = supabase
        .channel("nudge-badge")
        .on("postgres_changes", { event: "*", schema: "public", table: "abby_nudges", filter: `author_id=eq.${authorId}` }, () => {
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

  // ── HOME ──
  const homeItems: NavItem[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    {
      id: "abby-coach" as DashboardSection, label: "Ask ABBY", icon: Sparkles,
      subtitle: "Your AI Business Coach",
      tooltip: "Ask ABBY anything about your author business.",
      color: "text-secondary",
      notificationCount: unreadNudges > 0 ? unreadNudges : undefined,
    },
  ];

  // ── GET STARTED ──
  const getStartedItems: NavItem[] = [
    { id: "my-books", label: "My Books Hub", icon: BookOpen, notificationCount: pendingReviewCount },
    {
      id: "build-business", label: hasAnalysis ? "My Business Plan" : "Build My Business Plan", icon: Sparkles,
      badge: !hasAnalysis ? "Start Here →" : undefined,
      color: !hasAnalysis ? "text-secondary" : undefined,
    },
  ];

  // ── BUILD YOUR BUSINESS ──
  const brandAccessible = hasAnalysis || bypassLocks;
  const buildAccessible = isSuperAdminProp || (buildAuthorityCategoryOpen && tierAccess("build"));
  const yieldAccessible = isSuperAdminProp || (yieldCategoryOpen && tierAccess("yield"));

  const businessItems: NavItem[] = [
    {
      id: "revenue-streams", label: "Brand Products", icon: DollarSign,
      subtitle: "Create Your Products",
      tooltip: "Turn your book into 9 digital products your audience can buy.",
      color: "text-emerald-500",
      badge: brandAccessible ? `${buildUnlocked} built` : undefined,
      lockMessage: !brandAccessible
        ? "Analyze a book first"
        : !tierAccess("brand")
        ? "Upgrade to Brand Plan ($49/mo)"
        : undefined,
    },
    {
      id: "marketing-channels", label: "Build Authority", icon: Radio,
      subtitle: buildAccessible ? "Scale Your Audience"
        : (isSuperAdminProp || buildAuthorityCategoryOpen) ? "Requires Build Plan" : "Coming Soon",
      tooltip: buildAccessible ? "Scale audience and recurring revenue"
        : !tierAccess("build") ? "Upgrade to Build Plan ($99/mo) to unlock"
        : "Build Authority is coming soon. Stay tuned!",
      color: "text-violet-500",
      badge: buildAccessible ? `${buildAuthorityUnlocked} built` : undefined,
      lockMessage: !buildAccessible
        ? (!tierAccess("build") && (isSuperAdminProp || buildAuthorityCategoryOpen)
          ? "Upgrade to Build Plan ($99/mo)"
          : (isSuperAdminProp || buildAuthorityCategoryOpen) ? undefined : "Build Authority is coming soon")
        : undefined,
    },
    {
      id: "authority-builders", label: "Yield Revenue", icon: Award,
      subtitle: yieldAccessible ? "Premium Services"
        : (isSuperAdminProp || yieldCategoryOpen) ? "Requires Yield Plan" : "Coming Soon",
      tooltip: yieldAccessible ? "Premium monetization services"
        : !tierAccess("yield") ? "Upgrade to Yield Plan ($249/mo) to unlock"
        : "Yield Revenue builders are coming soon. Stay tuned!",
      color: "text-amber-500",
      badge: yieldAccessible ? `${yieldUnlocked} built` : undefined,
      lockMessage: !yieldAccessible
        ? (!tierAccess("yield") && (isSuperAdminProp || yieldCategoryOpen)
          ? "Upgrade to Yield Plan ($249/mo)"
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
  ];

  // ── YOUR BRAND ──
  const brandItems: NavItem[] = [
    { id: "profile", label: "Author Profile", icon: User },
    { id: "microsite-manager" as DashboardSection, label: "My Author's Page", icon: Globe },
    { id: "my-funnels" as DashboardSection, label: "My Funnels", icon: Filter },
    {
      id: "author-crm" as DashboardSection, label: "My CRM",
      icon: Contact,
      lockMessage: !tierAccess("build") ? "Upgrade to Build Plan ($99/mo) to access CRM" : undefined,
    },
    {
      id: "messages" as DashboardSection, label: "Messages",
      icon: MessageSquare,
    },
  ];

  // ── REVENUE & TOOLS ──
  const revenueToolsItems: NavItem[] = [
    {
      id: "marketing-hub" as DashboardSection, label: "Marketing Hub",
      icon: Megaphone,
      subtitle: "Campaign Management",
      tooltip: "View and manage all your automated marketing campaigns.",
      color: "text-rose-500",
    },
    {
      id: "library" as DashboardSection, label: "My Library",
      icon: Library,
      subtitle: "All your assets",
      tooltip: "Every slide deck, PDF, workbook, and copy you've generated — re-download anytime.",
      color: "text-emerald-500",
    },
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
    {
      id: "connect-settings" as DashboardSection, label: "Connect Settings",
      icon: Settings,
      subtitle: "Integrations",
      tooltip: "Manage your connected services and integrations.",
    },
  ];

  // Sister platform links (AI Writing Studio, AI Publishing Studio) — now in REVENUE & TOOLS
  const sisterLinks = [
    { label: "AI Writing Studio", icon: PenLine, path: "/writing" },
    { label: "AI Publishing Studio", icon: BookMarked, path: "/publishing" },
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

          {/* REVENUE & TOOLS — includes Marketing Hub, Revenue Dashboard, Stripe, Payouts, and sister links */}
          <div className="space-y-0.5">
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
                Revenue &amp; Tools
              </p>
            )}
            {revenueToolsItems.filter(i => !i.hidden).map((item, idx) => {
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

            {/* AI Writing Studio & AI Publishing Studio */}
            {!collapsed && sisterLinks.map((link) => (
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
        </TooltipProvider>
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
