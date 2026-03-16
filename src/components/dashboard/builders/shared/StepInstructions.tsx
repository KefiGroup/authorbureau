import { CheckCircle2 } from "lucide-react";

export interface InstructionItem {
  label: string;
  description: string;
}

export type BuilderCategory = "build" | "bridge" | "yield";

interface Props {
  title?: string;
  summary?: string;
  items: InstructionItem[];
  defaultOpen?: boolean;
  category?: BuilderCategory;
}

const categoryStyles: Record<BuilderCategory, { bg: string; border: string; numberBg: string; numberText: string; dot: string }> = {
  build: {
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
    numberBg: "bg-emerald-500",
    numberText: "text-white",
    dot: "bg-emerald-500",
  },
  bridge: {
    bg: "bg-violet-50 dark:bg-violet-950/20",
    border: "border-violet-200/60 dark:border-violet-800/40",
    numberBg: "bg-violet-500",
    numberText: "text-white",
    dot: "bg-violet-500",
  },
  yield: {
    bg: "bg-sky-50 dark:bg-sky-950/20",
    border: "border-sky-200/60 dark:border-sky-800/40",
    numberBg: "bg-sky-500",
    numberText: "text-white",
    dot: "bg-sky-500",
  },
};

export default function StepInstructions({ items, category = "build" }: Props) {
  const styles = categoryStyles[category];

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} p-4`}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 rounded-lg bg-white/70 dark:bg-white/5 p-3 border border-white/80 dark:border-white/10"
          >
            <span
              className={`flex items-center justify-center w-6 h-6 rounded-full ${styles.numberBg} ${styles.numberText} text-xs font-bold shrink-0 mt-0.5`}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground leading-tight">{item.label}</p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
