import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Globe, UserCheck, ArrowRight, X, Lock,
} from "lucide-react";
import type { DashboardSection } from "@/pages/AuthorDashboard";
import ABBYFrameworkVisual from "@/components/dashboard/book-hub/ABBYFrameworkVisual";
import { ABBY_CATEGORIES, ABBY_CATEGORY_LIST, getEffectiveCategory, type AbbyCategoryConfig, type AbbyNode, type AbbyCategory } from "@/config/abbyFrameworkConfig";
import { useAuth } from "@/hooks/useAuth";
import { isSuperAdmin } from "@/lib/superadmin";
import { useNodeGating } from "@/hooks/useNodeGating";

// Alias for backward compat in this file
type Node = AbbyNode;
type Category = AbbyCategoryConfig;

interface Props {
  onNavigate: (section: DashboardSection | string) => void;
  isPremium: boolean;
  focusStep?: string;
}

const statusStyles = {
  available: { badge: "Available", className: "bg-accent/15 text-accent border-accent/30" },
  "coming-soon": { badge: "Coming Soon", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  planned: { badge: "Planned", className: "bg-muted text-muted-foreground" },
};

export default function BusinessFramework({ onNavigate, isPremium, focusStep }: Props) {
  const { isAdmin, user } = useAuth();
  const { gating } = useNodeGating();
  const openNodeIds = new Set(gating.filter(r => r.is_open).map(r => r.node_id));
  const categories = (Object.keys(ABBY_CATEGORIES) as AbbyCategory[]).map(k => getEffectiveCategory(k, isAdmin, isSuperAdmin(user?.email), openNodeIds));
  const [activeCategory, setActiveCategory] = useState<string | null>(focusStep || null);
  useEffect(() => { if (focusStep) setActiveCategory(focusStep); }, [focusStep]);
  const activeCatData = categories.find((c) => c.id === activeCategory);

  return (
    <div className="max-w-6xl space-y-6">
      {/* Title */}
      <div className="text-center space-y-1">
        <h1 className="font-heading text-3xl md:text-4xl font-bold">
          Your <span className="text-gradient-gold">Monetization Framework</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Brand Products · Build Authority · Yield Revenue — your complete ABBY journey from published author to thriving business owner.
        </p>
      </div>

      {/* ═══ PHASE 1: FOUNDATION (FREE) ═══ */}
      <motion.div
        className="rounded-2xl border border-border bg-card p-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-500/10 rounded-full px-3 py-1">
            Foundation · Free
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-border p-4 bg-muted/30">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm flex-shrink-0">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-heading font-bold text-sm">Your Published Book</p>
              <p className="text-[11px] text-muted-foreground">The hook that starts everything</p>
            </div>
          </div>
          <div
            className="flex items-center gap-3 rounded-xl border border-border p-4 bg-muted/30 cursor-pointer hover:border-muted-foreground/30 hover:shadow-sm transition-all"
            onClick={() => onNavigate("my-books")}
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm flex-shrink-0">
              <Globe className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-heading font-bold text-sm">Author Page</p>
              <p className="text-[11px] text-muted-foreground">Your live landing page & sales hub</p>
            </div>
          </div>
          <div
            className="flex items-center gap-3 rounded-xl border border-border p-4 bg-muted/30 cursor-pointer hover:border-muted-foreground/30 hover:shadow-sm transition-all"
            onClick={() => onNavigate("profile")}
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm flex-shrink-0">
              <UserCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-heading font-bold text-sm">Author Profile</p>
              <p className="text-[11px] text-muted-foreground">Your public credibility page</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          ✓ Already included — your book, microsite, and author profile are live and working for you.
        </p>
      </motion.div>

      {/* Connector */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-px h-6 bg-gradient-to-b from-border to-muted-foreground/20" />
        <ArrowRight className="h-4 w-4 text-muted-foreground/40 rotate-90" />
      </div>

      {/* ═══ PHASE 3: MONETIZATION MAP ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/50 rounded-full px-3 py-1">
            Your Monetization Map
          </span>
        </div>

        <ABBYFrameworkVisual
          hasConsultation={true}
          tier="free"
          completedAssets={[]}
          recommendedNodes={[]}
          onConsultAbby={() => onNavigate("build-business")}
          onNavigateTab={(tab) => {
            setActiveCategory(tab);
          }}
        />
      </motion.div>

      {/* Expanded Category Detail Panel */}
      <AnimatePresence mode="wait">
        {activeCatData && (
          <motion.div
            key={activeCatData.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className={`rounded-2xl border-2 ${activeCatData.ringColor} border-transparent ring-1 p-6 md:p-8 bg-card shadow-lg`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeCatData.gradientFrom} ${activeCatData.gradientTo} flex items-center justify-center text-white`}>
                    <activeCatData.headerIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-heading text-xl font-bold">{activeCatData.label}</h2>
                    <p className="text-xs text-muted-foreground">{activeCatData.subtitle}</p>
                  </div>
                </div>
                <button onClick={() => setActiveCategory(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-6">
                {(() => {
                  const labelMap: Record<string, string> = { "Other": "Premium Programs & Live Events", "Pro Products": "Digital Products" };
                  const groups: { name: string; nodes: Node[] }[] = [];
                  activeCatData.nodes.forEach((node) => {
                    const rawGroup = node.subCategory || "Other";
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {group.nodes.map((node) => (
                          <NodeCard key={node.id} node={node} category={activeCatData} onNavigate={onNavigate} isPremium={isPremium} />
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Journey Summary */}
      <motion.div
        className="rounded-xl bg-muted/30 border border-border p-5 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-xs text-muted-foreground leading-relaxed max-w-lg mx-auto">
          <strong>Your monetization journey:</strong> <strong>Brand</strong> your products from your book →
          <strong>Build</strong> authority & scale your audience →
          <strong>Yield</strong> premium revenue & maximize your ROI.
          <br />
          <span className="text-secondary font-medium">Turn your book into revenue streams with ABBY.</span>
        </p>
      </motion.div>
    </div>
  );
}

/* ─── Individual Node Card ─── */
function NodeCard({
  node, category, onNavigate, isPremium,
}: {
  node: Node;
  category: Category;
  onNavigate: (s: DashboardSection | string) => void;
  isPremium: boolean;
}) {
  const status = statusStyles[node.status];
  const canNavigate = node.section && node.status === "available";
  const Icon = node.icon;

  return (
    <motion.div
      className={`group relative rounded-xl border p-4 transition-all ${
        canNavigate
          ? "border-border hover:border-muted-foreground/30 hover:shadow-md cursor-pointer"
          : "border-border/50 opacity-75"
      }`}
      onClick={() => {
        if (canNavigate && node.section) onNavigate(node.section);
      }}
      whileHover={canNavigate ? { y: -1 } : {}}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg ${category.bgColor} flex items-center justify-center shrink-0`}>
          <Icon className={`h-4 w-4 ${category.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm truncate">{node.label}</h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{node.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${status.className}`}>
              {status.badge}
            </span>
            {canNavigate && (
              <span className="text-[10px] font-medium text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowRight className="h-3 w-3" />
              </span>
            )}
            {!isPremium && node.section && (
              <Lock className="h-3 w-3 text-muted-foreground/40 ml-auto" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
