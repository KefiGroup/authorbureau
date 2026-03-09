import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AbbyBuildAdvisor from "./AbbyBuildAdvisor";
import AbbyExecutionDashboard from "@/components/dashboard/AbbyExecutionDashboard";
import AbbyAdvisorPanel from "@/components/dashboard/AbbyAdvisorPanel";
import { useAbbyPlan } from "@/hooks/useAbbyPlan";
import { hasTierAccess } from "@/hooks/useAuth";
import type { SubscriptionTier } from "@/hooks/useAuth";
import {
  BookOpen, Mic, Podcast, GraduationCap, FileText, Video,
  Share2, CreditCard, Users, Trophy, Building2,
  Bookmark, Calendar, Link2, TrendingUp, Megaphone,
  Headphones, BookMarked, Presentation, UserCheck,
  HandCoins, Handshake, BarChart3, ShieldCheck,
  ArrowRight, Lock, Sparkles, DollarSign, Radio, Award,
  Zap, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, typeof BookOpen> = {
  Share2, FileText, Video, Podcast, GraduationCap, Headphones, BookMarked,
  CreditCard, Link2, TrendingUp, UserCheck, Users, Trophy, Handshake,
  Mic, Building2, BookOpen, Sparkles, Presentation, HandCoins, Calendar,
  Bookmark, ShieldCheck, BarChart3, Megaphone, DollarSign, Radio, Award,
};

interface ProductNode {
  id: string;
  label: string;
  iconName: string;
  description: string;
  status: "live" | "coming-soon" | "planned";
  group?: string;
  requiredTier: SubscriptionTier;
}

interface CategoryConfig {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  headerIconName: string;
  nodes: ProductNode[];
}

const statusStyles = {
  live: { badge: "Live", className: "bg-green-500/15 text-green-700 dark:text-green-400" },
  "coming-soon": { badge: "Building", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  planned: { badge: "Planned", className: "bg-muted text-muted-foreground" },
};

export const categoryConfigs: CategoryConfig[] = [
  {
    id: "revenue-streams", label: "B · Build Authority", subtitle: "Digital assets & authority products (18 nodes)",
    color: "text-emerald-600", bgColor: "bg-emerald-500/10",
    gradientFrom: "from-emerald-500", gradientTo: "to-emerald-600",
    headerIconName: "DollarSign",
    nodes: [
      { id: "workbooks", label: "Workbook", iconName: "FileText", description: "Companion workbook PDFs with exercises & action plans.", status: "live", group: "Digital Products", requiredTier: "starter" },
      { id: "audiobook", label: "Audiobook", iconName: "Headphones", description: "AI-narrated audiobook from your manuscript.", status: "coming-soon", group: "Digital Products", requiredTier: "pro" },
      { id: "book-sales-events", label: "Book Sales (Events)", iconName: "BookOpen", description: "QR code order pages for live event sales.", status: "planned", group: "Digital Products", requiredTier: "enterprise" },
      { id: "home-study", label: "Home Study Courses", iconName: "BookMarked", description: "Self-paced study guide with daily schedules.", status: "coming-soon", group: "Digital Products", requiredTier: "pro" },
      { id: "courses", label: "Online Courses", iconName: "GraduationCap", description: "8-12 module structured courses from your manuscript.", status: "coming-soon", group: "Digital Products", requiredTier: "pro" },
      { id: "special-editions", label: "Special Editions", iconName: "Sparkles", description: "Signed copies, bundles, collector's editions.", status: "planned", group: "Digital Products", requiredTier: "enterprise" },
      { id: "memberships", label: "Monthly Memberships", iconName: "CreditCard", description: "3-tier membership with gated content drip.", status: "planned", group: "Digital Products", requiredTier: "pro" },
      { id: "group-coaching", label: "Group Coaching", iconName: "Users", description: "8-week group coaching curriculum.", status: "coming-soon", group: "Coaching", requiredTier: "pro" },
      { id: "coaching-1on1", label: "1-on-1 Coaching", iconName: "UserCheck", description: "6/12-session coaching programs with session outlines.", status: "live", group: "Coaching", requiredTier: "pro" },
      { id: "in-house-speaker", label: "In-House Speaker", iconName: "Presentation", description: "Corporate speaker profile + booking.", status: "planned", group: "Speaking", requiredTier: "pro" },
      { id: "training", label: "Training Programs", iconName: "Building2", description: "Half/full-day corporate training programs.", status: "planned", group: "Speaking", requiredTier: "enterprise" },
      { id: "retreats", label: "Retreats & Bootcamps", iconName: "Bookmark", description: "2-3 day retreat programs.", status: "planned", group: "Speaking", requiredTier: "enterprise" },
      { id: "masterminds", label: "Masterminds", iconName: "BarChart3", description: "Quarterly mastermind group programs.", status: "planned", group: "Speaking", requiredTier: "enterprise" },
      { id: "certification", label: "Certification", iconName: "ShieldCheck", description: "Curriculum + exam + digital certificates.", status: "planned", group: "Speaking", requiredTier: "enterprise" },
      { id: "keynotes", label: "Keynotes", iconName: "Mic", description: "3-5 keynote topics with slide decks.", status: "live", group: "Speaking", requiredTier: "pro" },
      { id: "big-ticket", label: "Big Ticket Consulting", iconName: "Trophy", description: "Premium consulting packages ($5K–$25K).", status: "planned", group: "Speaking", requiredTier: "pro" },
      { id: "upsells", label: "Upsells / Downsells / Cross Sells", iconName: "TrendingUp", description: "AI-generated conversion sequences.", status: "planned", group: "Partnerships", requiredTier: "pro" },
      { id: "revenue-sharing", label: "Revenue Sharing", iconName: "Handshake", description: "Partnership matching + contract templates.", status: "planned", group: "Partnerships", requiredTier: "pro" },
    ],
  },
  {
    id: "marketing-channels", label: "B · Bridge Channels", subtitle: "Marketing channels & audience connections (6 nodes)",
    color: "text-violet-600", bgColor: "bg-violet-500/10",
    gradientFrom: "from-violet-500", gradientTo: "to-violet-600",
    headerIconName: "Radio",
    nodes: [
      { id: "social-media", label: "Social Media", iconName: "Share2", description: "90-day AI content calendar from your book.", status: "live", requiredTier: "starter" },
      { id: "webinars", label: "Webinars", iconName: "Video", description: "Webinar scripts + slide decks + registration pages.", status: "live", requiredTier: "pro" },
      { id: "podcast-guest", label: "Podcasts (Guest)", iconName: "Podcast", description: "Pitch kit to get booked as a guest expert.", status: "planned", requiredTier: "pro" },
      { id: "microsite", label: "Website / Microsite", iconName: "BookOpen", description: "Your book's landing page (built-in).", status: "live", requiredTier: "starter" },
      { id: "affiliates", label: "Affiliates", iconName: "Link2", description: "Affiliate tracking links + commission structures.", status: "planned", requiredTier: "pro" },
      { id: "email-marketing", label: "Email Marketing", iconName: "Megaphone", description: "AI-driven nurture sequences from book content.", status: "coming-soon", requiredTier: "starter" },
    ],
  },
  {
    id: "authority-builders", label: "Y · Yield Revenue", subtitle: "Premium revenue streams & monetization (3 nodes)",
    color: "text-sky-600", bgColor: "bg-sky-500/10",
    gradientFrom: "from-sky-500", gradientTo: "to-sky-600",
    headerIconName: "Award",
    nodes: [
      { id: "conventions", label: "Conventions / Conferences", iconName: "Calendar", description: "Conference submission generator.", status: "planned", requiredTier: "enterprise" },
      { id: "fundraising", label: "Fund Raising", iconName: "HandCoins", description: "Fundraising event templates.", status: "planned", requiredTier: "enterprise" },
      { id: "exhibitors", label: "Exhibitors / JV", iconName: "Megaphone", description: "Exhibitor prospectus + partnership matching.", status: "planned", requiredTier: "enterprise" },
    ],
  },
];

// Tier-specific upgrade banner config
function getUpgradeBanner(tier: SubscriptionTier, categoryId: string): { message: string; cta: string; link: string } | null {
  if (tier === "enterprise") return null;

  if (tier === "free") {
    return {
      message: "Subscribe to unlock the AI builders and start creating products from your book.",
      cta: "View Plans →",
      link: "/dashboard?section=build-business",
    };
  }

  if (tier === "starter") {
    if (categoryId === "revenue-streams") {
      return {
        message: "You're building great momentum! Upgrade to Pro ($199/mo) to unlock 8 more Build products: Online Courses, Audiobooks, Memberships, Coaching, and more.",
        cta: "Upgrade to Pro →",
        link: "/dashboard?section=build-business",
      };
    }
    if (categoryId === "marketing-channels") {
      return {
        message: "Ready to reach your audience? The Bridge builders help you create coaching programs, speaking kits, webinar frameworks, and podcast pitches. Upgrade to Pro ($199/mo) to unlock all Bridge builders.",
        cta: "Upgrade to Pro →",
        link: "/dashboard?section=build-business",
      };
    }
    if (categoryId === "authority-builders") {
      return {
        message: "Yield builders create retreats, certification programs, masterminds, and more. Upgrade to Enterprise ($499/mo) to unlock all Yield builders.",
        cta: "Upgrade to Enterprise →",
        link: "/dashboard?section=build-business",
      };
    }
  }

  if (tier === "pro" && categoryId === "authority-builders") {
    return {
      message: "Scale to the next level. Upgrade to Enterprise ($499/mo) to unlock retreats, certification, masterminds, corporate training, and a 1-on-1 strategy session with Pauline Teo.",
      cta: "Upgrade to Enterprise →",
      link: "/dashboard?section=build-business",
    };
  }

  return null;
}

interface Props {
  categoryId: string;
  bookId: string;
  bookTitle?: string;
  isPremium: boolean;
  tier: SubscriptionTier;
}

export default function BookHubStepTab({ categoryId, bookId, bookTitle, isPremium, tier }: Props) {
  const navigate = useNavigate();
  const { plan, completedAssets } = useAbbyPlan(bookId);
  const [executingNode, setExecutingNode] = useState<ProductNode | null>(null);
  const catData = categoryConfigs.find((c) => c.id === categoryId);
  if (!catData) return null;

  const HeaderIcon = iconMap[catData.headerIconName] || BookOpen;
  const titleParam = bookTitle ? `&bookTitle=${encodeURIComponent(bookTitle)}` : "";

  const getStudioPath = (nodeId: string): string | null => {
    const map: Record<string, string> = {
      "social-media": `/dashboard?section=social-media&bookId=${bookId}${titleParam}`,
      workbooks: `/dashboard?section=workbooks&bookId=${bookId}${titleParam}`,
      webinars: `/dashboard?section=webinars&bookId=${bookId}${titleParam}`,
      audiobook: `/dashboard?section=audiobook-studio&bookId=${bookId}${titleParam}`,
      "coaching-1on1": `/dashboard?section=coaching&bookId=${bookId}${titleParam}`,
      keynotes: `/dashboard?section=speaking&bookId=${bookId}${titleParam}`,
      courses: `/dashboard?section=courses&bookId=${bookId}${titleParam}`,
      "home-study": `/dashboard?section=home-study&bookId=${bookId}${titleParam}`,
      "email-marketing": `/dashboard?section=email-marketing&bookId=${bookId}${titleParam}`,
      "podcast-guest": `/dashboard?section=podcast&bookId=${bookId}${titleParam}`,
      memberships: `/dashboard?section=memberships&bookId=${bookId}${titleParam}`,
      "group-coaching": `/dashboard?section=group-coaching&bookId=${bookId}${titleParam}`,
    };
    return map[nodeId] || null;
  };

  const isNodeCompleted = (nodeId: string): boolean => {
    return completedAssets.includes(nodeId) || completedAssets.includes(nodeId.replace(/-/g, "_"));
  };

  const handleBuildWithAbby = (node: ProductNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasTierAccess(tier, node.requiredTier)) return;
    setExecutingNode(node);
  };

  const builtCount = catData.nodes.filter(n => isNodeCompleted(n.id)).length;
  const upgradeBanner = getUpgradeBanner(tier, categoryId);

  // Enterprise empty-state banner
  const showEnterpriseEmptyBanner = tier === "enterprise" && builtCount === 0;

  return (
    <div className="space-y-6">
      {/* Upgrade banner */}
      {upgradeBanner && (
        <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-4">
          <p className="text-sm text-foreground">{upgradeBanner.message}</p>
          <a href={upgradeBanner.link} className="inline-block mt-2 text-sm font-semibold text-secondary hover:underline">
            {upgradeBanner.cta}
          </a>
        </div>
      )}

      {showEnterpriseEmptyBanner && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
          <p className="text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 inline mr-1" />
            All builders are unlocked! Click "Build Now" on any product to get started, or use the "Build My Author Business" button on the Overview tab to create everything at once.
          </p>
        </div>
      )}

      {/* Abby Build Advisor */}
      <AbbyBuildAdvisor categoryId={categoryId} bookId={bookId} bookTitle={bookTitle} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${catData.gradientFrom} ${catData.gradientTo} flex items-center justify-center text-white shadow-sm`}>
          <HeaderIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-bold">{catData.label}</h2>
          <p className="text-xs text-muted-foreground">{builtCount} of {catData.nodes.length} built</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs font-medium rounded-full px-3 py-1 ${catData.bgColor} ${catData.color}`}>
            {catData.nodes.length} products
          </span>
          {builtCount > 0 && (
            <span className="text-xs font-medium rounded-full px-3 py-1 bg-green-500/15 text-green-700">
              {builtCount} built
            </span>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div className="space-y-8">
        {(() => {
          const groups: { name: string; nodes: ProductNode[] }[] = [];
          catData.nodes.forEach((node) => {
            const groupName = node.group || "Other";
            const existing = groups.find((g) => g.name === groupName);
            if (existing) existing.nodes.push(node);
            else groups.push({ name: groupName, nodes: [node] });
          });
          return groups.map((group) => (
            <div key={group.name}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                {group.name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.nodes.map((node) => {
                  const status = statusStyles[node.status];
                  const Icon = iconMap[node.iconName] || BookOpen;
                  const canOpen = node.status === "live";
                  const studioPath = getStudioPath(node.id);
                  const isCompleted = isNodeCompleted(node.id);
                  const nodeAccessible = hasTierAccess(tier, node.requiredTier);
                  const isClickable = canOpen && Boolean(studioPath) && nodeAccessible;
                  const canBuild = (node.status === "live" || node.status === "coming-soon") && nodeAccessible && plan;

                  // Lock info for inaccessible nodes
                  const lockLabel = !nodeAccessible
                    ? node.requiredTier === "enterprise"
                      ? "Upgrade to Enterprise"
                      : node.requiredTier === "pro"
                        ? "Upgrade to Pro"
                        : "Subscribe to unlock"
                    : null;

                  return (
                    <motion.div
                      key={node.id}
                      className={`group relative rounded-xl border p-4 transition-all ${
                        isCompleted
                          ? "border-green-500/30 bg-green-500/5"
                          : !nodeAccessible
                            ? "border-border/50 bg-muted/30"
                            : isClickable
                              ? "border-border hover:border-muted-foreground/30 hover:shadow-md cursor-pointer"
                              : "border-border/50 opacity-75"
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={isClickable ? { y: -2 } : {}}
                      onClick={() => { if (isClickable && studioPath) navigate(studioPath); }}
                      role={isClickable ? "button" : undefined}
                      tabIndex={isClickable ? 0 : -1}
                      onKeyDown={(e) => {
                        if (!isClickable || !studioPath) return;
                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(studioPath); }
                      }}
                    >
                      {/* Completed badge */}
                      {isCompleted && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </div>
                      )}

                      {/* Lock badge for inaccessible */}
                      {!nodeAccessible && !isCompleted && (
                        <div className="absolute top-2 right-2">
                          <Lock className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg ${nodeAccessible ? catData.bgColor : "bg-muted"} flex items-center justify-center shrink-0`}>
                          <Icon className={`h-4 w-4 ${nodeAccessible ? catData.color : "text-muted-foreground"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-sm truncate">{node.label}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1">{node.description}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${status.className}`}>
                              {isCompleted ? "✅ Built" : status.badge}
                            </span>
                            {isClickable && !isCompleted && (
                              <span className="text-[10px] font-medium text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                Open Studio <ArrowRight className="h-3 w-3" />
                              </span>
                            )}
                            {lockLabel && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Lock className="h-2.5 w-2.5" />
                                {lockLabel}
                              </span>
                            )}
                          </div>

                          {/* Build with Abby button — only for accessible nodes */}
                          {canBuild && !isCompleted && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 text-[11px] gap-1.5 h-7 text-teal-700 border-teal-300 hover:bg-teal-50"
                              onClick={(e) => handleBuildWithAbby(node, e)}
                            >
                              <Zap className="h-3 w-3 text-secondary" />
                              Build Now
                            </Button>
                          )}

                          {/* View/Edit buttons for completed nodes */}
                          {isCompleted && studioPath && (
                            <div className="flex gap-1.5 mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[11px] h-7 gap-1 text-teal-700 border-teal-300"
                                onClick={(e) => { e.stopPropagation(); navigate(studioPath); }}
                              >
                                View Product
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Abby Advisor Panel (floating) */}
      <AbbyAdvisorPanel
        bookId={bookId}
        bookTitle={bookTitle || ""}
        productNode={categoryId}
        productLabel={catData.label}
      />

      {/* Abby Execution Dashboard (full-screen overlay) */}
      <AnimatePresence>
        {executingNode && plan && (
          <AbbyExecutionDashboard
            bookId={bookId}
            bookTitle={bookTitle || ""}
            productNode={executingNode.id}
            productLabel={executingNode.label}
            businessPlan={plan}
            onClose={() => setExecutingNode(null)}
            onComplete={() => setExecutingNode(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
