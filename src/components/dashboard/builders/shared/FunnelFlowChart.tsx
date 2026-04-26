/**
 * Pure presentational funnel flow chart.
 * Renders a horizontal row of stage cards with chevrons; stacks vertically <md.
 * No data fetching — caller passes already-merged FunnelStage[].
 */
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FunnelStage, StageStatus } from "@/lib/funnel-flow-stages";

interface Props {
  stages: FunnelStage[];
  onStageClick?: (stageId: string) => void;
}

const STATUS_DOT: Record<StageStatus, string> = {
  ready: "bg-emerald-500",
  incomplete: "bg-amber-500",
  missing: "bg-muted-foreground/40",
};

const STATUS_LABEL: Record<StageStatus, string> = {
  ready: "Ready",
  incomplete: "Needs review",
  missing: "Not set",
};

export default function FunnelFlowChart({ stages, onStageClick }: Props) {
  return (
    <div className="w-full overflow-x-auto">
      <ol className="flex flex-col md:flex-row md:items-stretch gap-2 md:gap-1 min-w-full">
        {stages.map((s, i) => (
          <li key={s.id} className="flex flex-col md:flex-row md:items-stretch flex-1 min-w-[180px]">
            <button
              type="button"
              onClick={() => onStageClick?.(s.id)}
              className={cn(
                "group text-left flex-1 rounded-lg border bg-card hover:bg-accent/40 hover:border-primary/40 transition p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                s.status === "ready" && "border-emerald-500/30",
                s.status === "incomplete" && "border-amber-500/30",
                s.status === "missing" && "border-dashed",
              )}
              aria-label={`Edit ${s.label} stage — ${STATUS_LABEL[s.status]}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT[s.status])}
                    title={STATUS_LABEL[s.status]}
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                    Step {i + 1}
                  </span>
                </div>
                {s.isEdited && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    Edited
                  </span>
                )}
              </div>
              <div className="font-semibold text-sm leading-tight mb-0.5">{s.label}</div>
              <div className="text-xs text-muted-foreground leading-snug line-clamp-2">{s.description}</div>
              {s.stat && (
                <div className="mt-2 text-[11px] font-medium text-foreground/70">{s.stat}</div>
              )}
            </button>
            {i < stages.length - 1 && (
              <div className="hidden md:flex items-center justify-center px-1 text-muted-foreground/60">
                <ChevronRight className="h-4 w-4" />
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
