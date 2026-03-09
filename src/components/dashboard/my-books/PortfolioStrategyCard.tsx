import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortfolioStrategyCardProps {
  analyzedBookCount: number;
  combinedRevenueRange?: string;
  totalStreams?: number;
  onViewStrategy: () => void;
}

export default function PortfolioStrategyCard({
  analyzedBookCount, combinedRevenueRange, totalStreams, onViewStrategy,
}: PortfolioStrategyCardProps) {
  if (analyzedBookCount < 2) return null;

  return (
    <div className="rounded-xl border-l-4 border-l-[#C4973B] border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-[#C4973B]" />
        <h3 className="text-base font-heading font-bold">Your Author Portfolio Strategy</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Abby has analyzed {analyzedBookCount} books with a combined potential of{" "}
        <span className="font-semibold text-foreground">{combinedRevenueRange || "$15,000–$50,000/month"}</span>
        {totalStreams ? ` across ${totalStreams} revenue streams.` : "."}
      </p>
      <div className="text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground text-xs">Cross-book synergies detected:</p>
        <ul className="list-disc list-inside text-xs space-y-0.5 text-muted-foreground">
          <li>Bundle your books into a premium package for higher perceived value</li>
          <li>Cross-promote coaching and course offerings across both audiences</li>
        </ul>
      </div>
      <Button variant="outline" size="sm" onClick={onViewStrategy} className="text-xs">
        View Unified Strategy →
      </Button>
    </div>
  );
}
