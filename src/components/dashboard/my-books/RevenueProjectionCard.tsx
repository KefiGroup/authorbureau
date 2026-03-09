import { BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface RevenueProjectionCardProps {
  revenueRange: string;
  totalStreams: number;
  built: number;
  remaining: number;
}

export default function RevenueProjectionCard({ revenueRange, totalStreams, built, remaining }: RevenueProjectionCardProps) {
  const pct = totalStreams > 0 ? Math.round((built / totalStreams) * 100) : 0;

  return (
    <div className="rounded-lg border-l-3 border-l-[#0D9488] border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5 text-[#0D9488]" />
        Revenue Potential (from Abby's analysis)
      </div>
      <p className="text-sm font-bold text-foreground">{revenueRange} by Month 12</p>
      <p className="text-[11px] text-muted-foreground">
        {totalStreams} revenue streams mapped · {built} built · {remaining} remaining
      </p>
      <div className="flex items-center gap-2">
        <Progress value={pct} className="h-1.5 flex-1 bg-[#E5E7EB]" />
        <span className="text-[10px] font-semibold text-muted-foreground">{pct}% built</span>
      </div>
    </div>
  );
}
