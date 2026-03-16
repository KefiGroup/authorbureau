import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

interface AbbyRecommendationCardProps {
  children: ReactNode;
}

export default function AbbyRecommendationCard({ children }: AbbyRecommendationCardProps) {
  return (
    <Card className="relative overflow-hidden border-secondary/30 bg-gradient-to-br from-secondary/8 via-secondary/4 to-transparent shadow-[0_0_20px_-4px_hsl(38_55%_50%_/_0.25),0_0_40px_-8px_hsl(38_55%_50%_/_0.15)] animate-[abby-glow_3s_ease-in-out_infinite]">
      {/* Decorative orb */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-secondary/8 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-lg" />

      <div className="relative p-5 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-amber-500 flex items-center justify-center shrink-0 shadow-md">
          <Sparkles className="h-5 w-5 text-white animate-[spin_8s_linear_infinite]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-extrabold text-secondary uppercase tracking-[0.15em] mb-1.5">Abby's Recommendation</p>
          {children}
        </div>
      </div>
    </Card>
  );
}
