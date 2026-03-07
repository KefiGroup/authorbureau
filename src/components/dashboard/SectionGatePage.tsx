import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  sectionTitle: string;
  sectionSubtitle: string;
  gateMessage: string;
  productNames: string[];
  onAnalyze: () => void;
}

export default function SectionGatePage({ sectionTitle, sectionSubtitle, gateMessage, productNames, onAnalyze }: Props) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold">{sectionTitle}</h1>
        <p className="text-sm text-muted-foreground mt-1">{sectionSubtitle}</p>
      </div>

      {/* Gated Card */}
      <Card className="border-2 border-secondary/20">
        <CardContent className="p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8 text-secondary" />
          </div>
          <h2 className="font-heading text-xl font-bold">Analyze a Book First</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {gateMessage} This takes about 5 minutes and is completely free.
          </p>
          <Button
            onClick={onAnalyze}
            size="lg"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Analyze with Abby →
          </Button>
          <p className="text-xs text-muted-foreground">
            Once Abby analyzes your book, she'll recommend which of these products to build first:
          </p>
        </CardContent>
      </Card>

      {/* Dimmed product grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {productNames.map((name) => (
          <div
            key={name}
            className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-center opacity-40"
          >
            <span className="text-xs font-medium text-muted-foreground">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
