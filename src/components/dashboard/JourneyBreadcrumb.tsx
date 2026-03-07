import { CheckCircle2, Circle } from "lucide-react";

export type JourneyStep = "done" | "current" | "upcoming";

interface Props {
  micrositeState: JourneyStep;
  booksAnalyzed: number;
  planState: JourneyStep;
  buildState: JourneyStep;
  sellState: JourneyStep;
}

const steps = [
  { key: "microsite", baseLabel: "Microsite Live" },
  { key: "analyzed", baseLabel: "Books Analyzed" },
  { key: "building", baseLabel: "Building Products" },
  { key: "earning", baseLabel: "Earning Revenue" },
] as const;

export default function JourneyBreadcrumb({ micrositeState, booksAnalyzed, planState, buildState, sellState }: Props) {
  const states: JourneyStep[] = [micrositeState, planState, buildState, sellState];
  const labels = [
    "Microsite Live",
    `${booksAnalyzed} Book${booksAnalyzed !== 1 ? "s" : ""} Analyzed`,
    "Building Products",
    "Earning Revenue",
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-1 text-xs">
      <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px] shrink-0 mr-1">
        Your Journey:
      </span>
      {states.map((state, i) => (
        <div key={i} className="flex items-center gap-1.5 shrink-0">
          {i > 0 && <span className="text-muted-foreground/40">→</span>}
          {state === "done" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
          ) : state === "current" ? (
            <span className="relative flex h-3.5 w-3.5 items-center justify-center shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-secondary/30 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-secondary" />
            </span>
          ) : (
            <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
          )}
          <span className={`whitespace-nowrap ${
            state === "done" ? "text-foreground font-medium" :
            state === "current" ? "text-secondary font-semibold" :
            "text-muted-foreground/50"
          }`}>
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}
