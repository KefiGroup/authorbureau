import { motion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import type { DashboardSection } from "@/pages/AuthorDashboard";
import { ABBY_CATEGORIES, ABBY_CATEGORY_LIST, getEffectiveCategory, type AbbyCategoryConfig, type AbbyNode, type AbbyCategory } from "@/config/abbyFrameworkConfig";
import { useAuth } from "@/hooks/useAuth";
import { isSuperAdmin } from "@/lib/superadmin";
import { useNodeGating } from "@/hooks/useNodeGating";

const statusStyles = {
  available: { badge: "Available", className: "bg-accent/15 text-accent border-accent/30" },
  "coming-soon": { badge: "Coming Soon", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  planned: { badge: "Planned", className: "bg-muted text-muted-foreground" },
};

interface Props {
  categoryId: string;
  onNavigate: (section: DashboardSection | string) => void;
  isPremium: boolean;
}

export default function StepDetailView({ categoryId, onNavigate, isPremium }: Props) {
  const { isAdmin, user } = useAuth();
  const { gating } = useNodeGating();
  const openNodeIds = new Set(gating.filter(r => r.is_open).map(r => r.node_id));
  const catData = getEffectiveCategory(categoryId as AbbyCategory, isAdmin, isSuperAdmin(user?.email), openNodeIds);
  if (!catData) return null;

  const HeaderIcon = catData.headerIcon;

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${catData.gradientFrom} ${catData.gradientTo} flex items-center justify-center text-white shadow-sm`}>
          <HeaderIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">{catData.label}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{catData.subtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs font-medium rounded-full px-3 py-1 ${catData.bgColor} ${catData.color}`}>
            {catData.nodes.length} products
          </span>
          {catData.nodes.filter(n => n.status === "available").length > 0 && (
            <span className="text-xs font-medium rounded-full px-3 py-1 bg-accent/15 text-accent">
              {catData.nodes.filter(n => n.status === "available").length} available
            </span>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {catData.nodes.map((node) => {
          const status = statusStyles[node.status];
          const canNavigate = (node.section || node.navigateTo) && node.status === "available";
          const Icon = node.icon;

          return (
            <motion.div
              key={node.id}
              className={`group relative rounded-xl border p-4 transition-all ${
                canNavigate
                  ? "border-border hover:border-muted-foreground/30 hover:shadow-md cursor-pointer"
                  : "border-border/50 opacity-75"
              }`}
              onClick={() => {
                if (canNavigate) onNavigate((node.section || node.navigateTo) as string);
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={canNavigate ? { y: -2 } : {}}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${catData.bgColor} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${catData.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm truncate">{node.label}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1">{node.description}</p>
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
        })}
      </div>
    </div>
  );
}
