import { useState } from "react";
import { Sparkles, BarChart3, TrendingUp, Loader2, Wand2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MarketResearchData, PricingAnalysis, TitleKeyword } from "@/hooks/useMarketResearch";

interface Props {
  fieldType: "title" | "price" | "description";
  marketData: MarketResearchData | null;
  loading?: boolean;
  onOptimize?: (optimizedText: string) => void;
  currentValue?: string;
}

export default function AbbyMarketAdvice({ fieldType, marketData, loading, onOptimize, currentValue }: Props) {
  const [open, setOpen] = useState(false);

  if (!marketData && !loading) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Abby's Market-Aware Advice
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent align="start" className="w-80 p-0" sideOffset={8}>
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-secondary" />
          <span className="text-xs font-bold text-foreground">Abby's Market-Aware Advice</span>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin text-secondary" />
              <span className="text-xs text-muted-foreground">Loading market data...</span>
            </div>
          ) : !marketData ? (
            <p className="text-xs text-muted-foreground">No market data available yet.</p>
          ) : (
            <>
              {fieldType === "title" && <TitleAdvice data={marketData} />}
              {fieldType === "price" && <PriceAdvice data={marketData} />}
              {fieldType === "description" && (
                <DescriptionAdvice
                  data={marketData}
                  currentValue={currentValue}
                  onOptimize={onOptimize}
                />
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TitleAdvice({ data }: { data: MarketResearchData }) {
  const keywords = data.amazonBestsellers?.topTitleKeywords || [];
  if (keywords.length === 0) {
    return <p className="text-xs text-muted-foreground">No trending keyword data available for this genre.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-3 w-3 text-secondary" />
        <p className="text-xs font-semibold">Trending Keywords in Your Genre</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {keywords.slice(0, 8).map(kw => (
          <span
            key={kw.word}
            className="text-[11px] font-medium rounded-full px-2.5 py-1 bg-secondary/10 text-secondary border border-secondary/20"
          >
            {kw.word}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Include 1–2 of these keywords in your product title to boost discoverability.
      </p>
    </div>
  );
}

function PriceAdvice({ data }: { data: MarketResearchData }) {
  const pricing = data.amazonBestsellers?.pricingAnalysis;
  const products = data.amazonBestsellers?.products || [];

  if (!pricing) {
    return <p className="text-xs text-muted-foreground">No pricing data available for this genre.</p>;
  }

  const prices = products
    .map(p => parseFloat((p.price || "").replace(/[^0-9.]/g, "")))
    .filter(n => !isNaN(n) && n > 0);

  const ranges = [
    { label: "$0–$9.99", min: 0, max: 9.99 },
    { label: "$10–$19.99", min: 10, max: 19.99 },
    { label: "$20–$29.99", min: 20, max: 29.99 },
    { label: "$30+", min: 30, max: 9999 },
  ];

  const buckets = ranges.map(r => ({
    label: r.label,
    count: prices.filter(p => p >= r.min && p <= r.max).length,
  }));
  const maxCount = Math.max(...buckets.map(b => b.count), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <BarChart3 className="h-3 w-3 text-secondary" />
        <p className="text-xs font-semibold">What similar products are selling for right now</p>
      </div>

      <div className="space-y-1.5">
        {buckets.filter(b => b.count > 0).map(b => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-16 text-right shrink-0">{b.label}</span>
            <div className="flex-1 h-4 bg-muted/50 rounded overflow-hidden">
              <div
                className="h-full bg-secondary/50 rounded"
                style={{ width: `${(b.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-medium w-4">{b.count}</span>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-secondary/10 p-2.5 flex items-center gap-2">
        <Sparkles className="h-3 w-3 text-secondary shrink-0" />
        <p className="text-[10px] text-foreground">
          <strong>Recommended:</strong> {pricing.median} (genre median)
        </p>
      </div>
    </div>
  );
}

function DescriptionAdvice({ data, currentValue, onOptimize }: { data: MarketResearchData; currentValue?: string; onOptimize?: (text: string) => void }) {
  const keywords = data.amazonBestsellers?.topTitleKeywords || [];
  const [optimizing, setOptimizing] = useState(false);

  const handleOptimize = async () => {
    if (!onOptimize || !currentValue) return;
    setOptimizing(true);
    // For now, inject keywords inline — a future version could call an AI endpoint
    const topWords = keywords.slice(0, 3).map(k => k.word);
    const suggestion = `${currentValue}\n\nKey topics: ${topWords.join(", ")}`;
    onOptimize(suggestion);
    setOptimizing(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-3 w-3 text-secondary" />
        <p className="text-xs font-semibold">Market-Relevant Keywords</p>
      </div>

      {keywords.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {keywords.slice(0, 6).map(kw => (
            <span key={kw.word} className="text-[10px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground border border-border">
              {kw.word}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">No keyword data available.</p>
      )}

      {onOptimize && currentValue && (
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs gap-1.5 h-8"
          onClick={handleOptimize}
          disabled={optimizing}
        >
          {optimizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
          Optimise with Abby
        </Button>
      )}
    </div>
  );
}
