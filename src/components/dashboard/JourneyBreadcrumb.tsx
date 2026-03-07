import { CheckCircle2, Circle, CreditCard } from "lucide-react";

export type JourneyStep = "done" | "current" | "upcoming";

interface BreadcrumbStep {
  label: string;
  state: JourneyStep;
  onClick?: () => void;
}

interface Props {
  steps: BreadcrumbStep[];
}

export default function JourneyBreadcrumb({ steps }: Props) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-1 text-xs">
      <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px] shrink-0 mr-1">
        Your Journey:
      </span>
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1.5 shrink-0">
          {i > 0 && <span className="text-muted-foreground/40">→</span>}
          {step.state === "done" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
          ) : step.state === "current" ? (
            <span className="relative flex h-3.5 w-3.5 items-center justify-center shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-secondary/30 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-secondary" />
            </span>
          ) : (
            <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
          )}
          <button
            onClick={step.onClick}
            disabled={!step.onClick}
            className={`whitespace-nowrap ${
              step.state === "done" ? "text-foreground font-medium hover:underline" :
              step.state === "current" ? "text-secondary font-semibold hover:underline" :
              "text-muted-foreground/50 cursor-default"
            }`}
          >
            {step.label}
          </button>
        </div>
      ))}
    </div>
  );
}
