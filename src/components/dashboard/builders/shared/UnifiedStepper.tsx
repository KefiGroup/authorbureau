import { Check } from "lucide-react";
import { categoryStyles, getBuilderCategory } from "./BuilderTheme";
import { cn } from "@/lib/utils";

/**
 * Standardised step indicator used by every BP-0x builder.
 * Color identity: teal for Brand, indigo for Build, amber for Yield.
 *
 * Steps that are completed (or the current step) are clickable when an
 * `onStepClick` callback is provided. The "Generating" step (index 1) is
 * never clickable — you can't time-travel back into a generation run.
 */
interface Props {
  nodeId: string;
  steps: string[];
  current: number;     // 0-indexed
  onStepClick?: (index: number) => void;
}

export default function UnifiedStepper({ nodeId, steps, current, onStepClick }: Props) {
  const styles = categoryStyles[getBuilderCategory(nodeId)];

  const isClickable = (i: number) =>
    !!onStepClick && i !== 1 && i <= current && i !== current;

  return (
    <div className="flex items-center w-full">
      {steps.map((label, i) => {
        const isDone = i < current;
        const isActive = i === current;
        const clickable = isClickable(i);
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              disabled={!clickable}
              onClick={clickable ? () => onStepClick!(i) : undefined}
              aria-current={isActive ? "step" : undefined}
              aria-label={`${isDone ? "Go back to " : ""}Step ${i + 1}: ${label}`}
              className={cn(
                "flex flex-col items-center text-center min-w-0 group",
                clickable && "cursor-pointer",
                !clickable && "cursor-default",
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0",
                  isDone && styles.stepDone,
                  isActive && styles.stepActiveRing,
                  !isDone && !isActive && "bg-muted text-muted-foreground",
                  clickable && "group-hover:ring-2 group-hover:ring-offset-2 group-hover:ring-offset-background group-hover:ring-foreground/20",
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 font-medium whitespace-nowrap",
                  isActive ? "text-foreground" : "text-muted-foreground",
                  clickable && "group-hover:text-foreground group-hover:underline",
                )}
              >
                {label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 mx-2 transition-colors",
                  isDone ? styles.leftStrip : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
