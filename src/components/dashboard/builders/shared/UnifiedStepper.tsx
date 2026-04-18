import { Check } from "lucide-react";
import { categoryStyles, getBuilderCategory } from "./BuilderTheme";
import { cn } from "@/lib/utils";

/**
 * Standardised step indicator used by every BP-0x builder.
 * Color identity: teal for Brand, indigo for Build, amber for Yield.
 */
interface Props {
  nodeId: string;
  steps: string[];
  current: number;     // 0-indexed
}

export default function UnifiedStepper({ nodeId, steps, current }: Props) {
  const styles = categoryStyles[getBuilderCategory(nodeId)];

  return (
    <div className="flex items-center w-full">
      {steps.map((label, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center text-center min-w-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0",
                  isDone && styles.stepDone,
                  isActive && styles.stepActiveRing,
                  !isDone && !isActive && "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 font-medium whitespace-nowrap",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
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
