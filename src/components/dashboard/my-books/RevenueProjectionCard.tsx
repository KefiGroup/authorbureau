import { BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface RevenueProjectionCardProps {
  revenueRange: string;
  /** Per-category build counts for this book (out of 9 / 9 / 10) */
  brand?: number;
  build?: number;
  yield?: number;
  /** Total nodes built for this book (out of 28) */
  total?: number;
}

const TOTAL_NODES = 28;
const BRAND_TOTAL = 9;
const BUILD_TOTAL = 9;
const YIELD_TOTAL = 10;

export default function RevenueProjectionCard({
  revenueRange,
  brand = 0,
  build = 0,
  yield: yld = 0,
  total = 0,
}: RevenueProjectionCardProps) {
  const pct = TOTAL_NODES > 0 ? Math.round((total / TOTAL_NODES) * 100) : 0;
  const remaining = Math.max(0, TOTAL_NODES - total);

  return (
    <div className="rounded-lg border-l-3 border-l-[#0D9488] border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5 text-[#0D9488]" />
        Revenue Potential (from Abby's analysis)
      </div>
      <p className="text-sm font-bold text-foreground">{revenueRange} by Month 12</p>
      <p className="text-[11px] text-muted-foreground">
        {total} of {TOTAL_NODES} built · {remaining} remaining
      </p>
      <p className="text-[11px] text-muted-foreground">
        Brand {brand}/{BRAND_TOTAL} · Build {build}/{BUILD_TOTAL} · Yield {yld}/{YIELD_TOTAL}
      </p>
      <div className="flex items-center gap-2">
        <Progress value={pct} className="h-1.5 flex-1 bg-[#E5E7EB]" />
        <span className="text-[10px] font-semibold text-muted-foreground">{pct}% built</span>
      </div>
    </div>
  );
}
