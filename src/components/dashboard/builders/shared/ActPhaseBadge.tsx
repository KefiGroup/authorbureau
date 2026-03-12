import { Badge } from "@/components/ui/badge";

interface Props {
  act: 1 | 2 | 3;
  subtitle?: string;
}

const ACT_CONFIG = {
  1: { label: "ACT 1 — ANALYSE", subtitle: "Strategic setup & positioning", border: "border-amber-400", text: "text-amber-600", bg: "bg-amber-50" },
  2: { label: "ACT 2 — BUILD", subtitle: "Content creation & production", border: "border-blue-400", text: "text-blue-600", bg: "bg-blue-50" },
  3: { label: "ACT 3 — BRIDGE", subtitle: "Preview, export & distribute", border: "border-green-400", text: "text-green-600", bg: "bg-green-50" },
};

export default function ActPhaseBadge({ act, subtitle }: Props) {
  const config = ACT_CONFIG[act];
  return (
    <div className="flex items-center gap-2 mb-4">
      <Badge variant="outline" className={`text-[10px] font-semibold ${config.border} ${config.text} ${config.bg}`}>
        {config.label}
      </Badge>
      <span className="text-xs text-muted-foreground">{subtitle || config.subtitle}</span>
    </div>
  );
}
