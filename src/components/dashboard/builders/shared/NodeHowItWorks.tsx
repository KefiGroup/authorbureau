import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, MapPin, Pencil, Clock, AlertTriangle } from "lucide-react";
import { BP_INTRO_SPECS } from "./BuilderIntroBlock";
import { categoryStyles, getBuilderCategory } from "./BuilderTheme";
import { cn } from "@/lib/utils";

/**
 * Collapsible "How this node works" guide rendered above step content.
 * Reuses BP_INTRO_SPECS so copy lives in one place.
 *
 * Default behaviour: open by default for every node so the roadmap stays
 * visible to new users on every step. Once a user collapses it, that
 * preference is remembered per-node in localStorage so power users don't
 * have to re-collapse on every visit.
 */
interface Props {
  nodeId: string;        // e.g. "BP-03"
  defaultOpen?: boolean;
}

export default function NodeHowItWorks({ nodeId, defaultOpen = true }: Props) {
  const spec = BP_INTRO_SPECS[nodeId];
  const storageKey = `nodeHowItWorks:${nodeId}:open`;

  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return defaultOpen;
    const saved = window.localStorage.getItem(storageKey);
    if (saved === null) return defaultOpen;
    return saved === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, open ? "1" : "0");
  }, [open, storageKey]);

  if (!spec) return null;

  const styles = categoryStyles[getBuilderCategory(nodeId)];

  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", styles.border)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
          styles.bg,
        )}
        aria-expanded={open}
      >
        <span className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center ring-1 shrink-0",
          styles.iconBg, styles.ring,
        )}>
          <Sparkles className={cn("h-3.5 w-3.5", styles.iconText)} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            How this node works
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            What Abby builds, where it lives, and how to edit it later
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Clock className="h-3 w-3" /> {spec.estimate}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-border/60">
          <Section
            icon={<Sparkles className={cn("h-4 w-4", styles.iconText)} />}
            title="Abby will create"
            items={spec.creates}
          />
          <Section
            icon={<MapPin className={cn("h-4 w-4", styles.iconText)} />}
            title="Where it lives after activating"
            text={spec.livesAt}
          />
          <Section
            icon={<Pencil className={cn("h-4 w-4", styles.iconText)} />}
            title="You can edit it later"
            text={spec.editLater}
          />
          {spec.prerequisites && spec.prerequisites.length > 0 && (
            <div className="flex gap-3 pt-3 border-t border-border/60">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Before you continue</p>
                <ul className="mt-1 space-y-0.5">
                  {spec.prerequisites.map((p, i) => (
                    <li key={i} className="text-xs text-muted-foreground leading-snug">• {p}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  text,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  text?: string;
  items?: string[];
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {text && <p className="text-xs text-muted-foreground leading-snug mt-0.5">{text}</p>}
        {items && (
          <ul className="mt-1 space-y-0.5">
            {items.map((it, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-snug">• {it}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
