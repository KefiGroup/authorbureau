import { type LucideIcon } from "lucide-react";
import { categoryStyles, getBuilderCategory } from "./BuilderTheme";
import { cn } from "@/lib/utils";

/**
 * Unified header bar for every BP-0x builder so all 9 nodes share the same look.
 * Pulls accent color from `categoryStyles` so future BA/YR builders inherit
 * their own category accent automatically.
 */
interface Props {
  nodeId: string;          // e.g. "BP-03"
  title: string;           // human title
  subtitle?: string;       // 1-line description
  icon: LucideIcon;
  /** @deprecated Back navigation is handled by the page wrapper (NodeBuilder). Prop kept for API compat. */
  onBack?: () => void;
  /** @deprecated see onBack */
  backLabel?: string;
}

export default function BuilderHeader({
  nodeId,
  title,
  subtitle,
  icon: Icon,
}: Props) {
  const styles = categoryStyles[getBuilderCategory(nodeId)];

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden",
      styles.border,
      styles.glowShadow,
    )}>
      <div className={cn("bg-gradient-to-br p-5 flex items-center gap-4", styles.headerGradient)}>
        <div className={cn(
          "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ring-1",
          styles.iconBg,
          styles.ring,
        )}>
          <Icon className={cn("h-6 w-6", styles.iconText)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ring-1",
              styles.iconBg,
              styles.iconText,
              styles.ring,
            )}>
              {nodeId}
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground leading-tight">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
