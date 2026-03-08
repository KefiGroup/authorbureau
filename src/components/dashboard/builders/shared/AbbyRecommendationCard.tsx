import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

interface AbbyRecommendationCardProps {
  children: ReactNode;
}

export default function AbbyRecommendationCard({ children }: AbbyRecommendationCardProps) {
  return (
    <Card className="p-4 border-secondary/25 bg-secondary/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="relative flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
          <Sparkles className="h-4.5 w-4.5 text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Abby's Recommendation</p>
          {children}
        </div>
      </div>
    </Card>
  );
}
