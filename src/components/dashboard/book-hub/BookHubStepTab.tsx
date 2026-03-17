import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AbbyBuildAdvisor from "./AbbyBuildAdvisor";
import AbbyExecutionDashboard from "@/components/dashboard/AbbyExecutionDashboard";
import AbbyAdvisorPanel from "@/components/dashboard/AbbyAdvisorPanel";
import { useAbbyPlan } from "@/hooks/useAbbyPlan";
import { hasTierAccess, useAuth } from "@/hooks/useAuth";
import type { SubscriptionTier } from "@/hooks/useAuth";
import {
  BookOpen, ArrowRight, Lock, Zap, CheckCircle2, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ABBY_CATEGORIES, getEffectiveCategory, getStudioPath as getStudioPathFromConfig, type AbbyCategory, type AbbyNode } from "@/config/abbyFrameworkConfig";
import { isSuperAdmin } from "@/lib/superadmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ProductNode {
  id: string;
  label: string;
  icon: typeof BookOpen;
  description: string;
  status: "available" | "coming-soon" | "planned";
  group?: string;
  requiredTier: SubscriptionTier;
}

/** Derive local ProductNode[] from shared config */
function deriveNodes(catId: AbbyCategory, isAdmin: boolean, superAdmin = false): ProductNode[] {
  const cat = getEffectiveCategory(catId, isAdmin, superAdmin);
  if (!cat) return [];
  return cat.nodes.map(n => ({
    id: n.id,
    label: n.label,
    icon: n.icon,
    description: n.description,
    status: n.status,
    group: n.subCategory,
    requiredTier: (n.tierRequired?.toLowerCase() || "starter") as SubscriptionTier,
  }));
}

interface DerivedCategory {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  headerIcon: typeof BookOpen;
  nodes: ProductNode[];
}

function deriveCategoryConfig(catId: AbbyCategory, isAdmin: boolean): DerivedCategory | null {
  const cat = getEffectiveCategory(catId, isAdmin);
  if (!cat) return null;
  return {
    id: cat.id,
    label: cat.label,
    subtitle: cat.subtitle,
    color: cat.color,
    bgColor: cat.bgColor,
    gradientFrom: cat.gradientFrom,
    gradientTo: cat.gradientTo,
    headerIcon: cat.headerIcon,
    nodes: deriveNodes(catId, isAdmin),
  };
}

const statusStyles = {
  available: { badge: "Available", className: "bg-accent/15 text-accent border-accent/30" },
  "coming-soon": { badge: "Coming Soon", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  planned: { badge: "Planned", className: "bg-muted text-muted-foreground" },
};

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
  bookGenre?: string;
  isPremium: boolean;
  tier: SubscriptionTier;
}

export default function BookHubStepTab({ categoryId, bookId, bookTitle, bookGenre, isPremium, tier }: Props) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { plan, completedAssets } = useAbbyPlan(bookId);
  const [executingNode, setExecutingNode] = useState<ProductNode | null>(null);
  const [notifiedNodes, setNotifiedNodes] = useState<Set<string>>(new Set());
  const catData = deriveCategoryConfig(categoryId as AbbyCategory, isAdmin);
  if (!catData) return null;

  const HeaderIcon = catData.headerIcon;
  const titleParam = bookTitle ? `&bookTitle=${encodeURIComponent(bookTitle)}` : "";

  const getStudioPath = (nodeId: string): string | null => {
    return getStudioPathFromConfig(nodeId, bookId, titleParam);
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
      <AbbyBuildAdvisor categoryId={categoryId} bookId={bookId} bookTitle={bookTitle} bookGenre={bookGenre} />

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
          // BUG-042: Rename generic labels to descriptive ones
          const labelMap: Record<string, string> = {
            "Other": "Premium Programs & Live Events",
            "Pro Products": "Digital Products", // BUG-036: Remove tier references
          };
          const groups: { name: string; nodes: ProductNode[] }[] = [];
          catData.nodes.forEach((node) => {
            const rawGroup = node.group || "Other";
            const groupName = labelMap[rawGroup] || rawGroup;
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
                  const Icon = node.icon;
                  const canOpen = node.status === "available";
                  const studioPath = getStudioPath(node.id);
                  const isCompleted = isNodeCompleted(node.id);
                  const nodeAccessible = hasTierAccess(tier, node.requiredTier);
                  const isClickable = canOpen && Boolean(studioPath) && nodeAccessible;
                  const canBuild = (node.status === "available" || node.status === "coming-soon") && nodeAccessible && plan;
                  const isPlanned = node.status === "planned";
                  const isNotified = notifiedNodes.has(node.id);

                  // Lock info for inaccessible nodes
                  const lockLabel = !nodeAccessible
                    ? node.requiredTier === "enterprise"
                      ? "Upgrade to Enterprise"
                      : node.requiredTier === "pro"
                        ? "Upgrade to Pro"
                        : "Subscribe to unlock"
                    : null;

                  // BUG-040: Handle Notify Me
                  const handleNotifyMe = async (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (!user) return;
                    try {
                      await supabase.from("feature_requests").insert({
                        author_id: user.id,
                        book_id: bookId,
                        request_type: node.id,
                        status: "pending",
                      });
                      setNotifiedNodes(prev => new Set(prev).add(node.id));
                      toast({ title: "We'll notify you!", description: `You'll be notified when ${node.label} becomes available.` });
                    } catch {
                      toast({ title: "Error", description: "Could not register interest. Please try again.", variant: "destructive" });
                    }
                  };

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

                          {/* BUG-040: Notify Me button for planned products */}
                          {isPlanned && !isCompleted && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isNotified}
                              className="mt-2 text-[11px] gap-1.5 h-7"
                              onClick={handleNotifyMe}
                            >
                              <Bell className="h-3 w-3" />
                              {isNotified ? "We'll Notify You!" : "Notify Me"}
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
