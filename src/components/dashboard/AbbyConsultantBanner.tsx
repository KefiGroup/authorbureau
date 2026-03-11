import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

interface Props {
  onAnalyze: () => void;
  compact?: boolean;
}

export default function AbbyConsultantBanner({ onAnalyze, compact }: Props) {
  if (compact) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-secondary/20 bg-secondary/5 px-4 py-2.5 cursor-pointer hover:bg-secondary/10 transition-colors"
        onClick={onAnalyze}
      >
        <div className="w-8 h-8 rounded-full bg-secondary/15 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Need help? Ask Abby</p>
          <p className="text-xs text-muted-foreground truncate">Your AI business consultant — strategy, content & growth</p>
        </div>
        <ArrowRight className="h-4 w-4 text-secondary shrink-0" />
      </div>
    );
  }

  return (
    <Card className="p-4 border-secondary/20 bg-gradient-to-r from-secondary/5 to-secondary/10">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-sm">Abby — Your AI Business Consultant</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Abby can analyze your books, build your business plan, and guide you through every product.
          </p>
        </div>
        <Button
          size="sm"
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0"
          onClick={onAnalyze}
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Talk to Abby
        </Button>
      </div>
    </Card>
  );
}
