import MarkdownRenderer from "@/components/dashboard/MarkdownRenderer";
import { motion } from "framer-motion";
import { TrendingUp, Sparkles, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import type { MarketResearchData } from "@/hooks/useMarketResearch";

interface Props {
  data: MarketResearchData;
  loading?: boolean;
  onRefresh?: () => void | Promise<void>;
}

export default function MarketSnapshot({ data, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-secondary" />
        <span className="text-sm text-muted-foreground">Abby is scanning the market...</span>
      </div>
    );
  }

  const hasKeywords = data.amazonBestsellers?.topTitleKeywords && data.amazonBestsellers.topTitleKeywords.length > 0;
  const hasMarketIntel = Boolean(data.marketIntelligence);

  if (!hasKeywords && !hasMarketIntel) return null;

  return (
    <motion.div
      className="rounded-xl border border-border bg-card overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center shrink-0">
          <TrendingUp className="h-4 w-4 text-secondary" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Abby's Market Trends</p>
          <p className="text-xs text-muted-foreground">Live insights for "{data.amazonCategory}"</p>
        </div>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={() => onRefresh()} className="h-7 gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* How Abby uses this intelligence */}
        <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">How Abby uses these market trends</p>
              <ul className="text-[11px] text-foreground/80 leading-relaxed space-y-1 list-disc pl-4">
                <li><strong>Content angles:</strong> trending sub-topics shape your lead magnet hooks, course modules, and social posts so you ride what readers are actively searching for.</li>
                <li><strong>Pricing:</strong> competitor benchmarks calibrate your workbook, course, coaching, and membership prices — keeping you competitive without underselling.</li>
                <li><strong>Positioning keywords:</strong> high-frequency words from bestsellers are woven into your titles, sales copy, and SEO to boost discoverability.</li>
                <li><strong>Audience targeting:</strong> demographic and pain-point signals tune Abby's email sequences, funnels, and ad copy.</li>
              </ul>
            </div>
          </div>
        </div>

        {hasKeywords && <TrendingKeywords keywords={data.amazonBestsellers!.topTitleKeywords} marketIntel={data.marketIntelligence} />}

        {hasMarketIntel && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground">Full Market Intelligence Report</p>
            <div className="rounded-lg bg-muted/30 p-4 text-sm leading-relaxed">
              <MarkdownRenderer content={data.marketIntelligence || ""} />
            </div>
            {data.marketCitations && data.marketCitations.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider self-center">Sources:</span>
                {data.marketCitations.slice(0, 6).map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
                  >
                    {new URL(url).hostname.replace("www.", "")}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TrendingKeywords({ keywords, marketIntel }: { keywords: { word: string; count: number }[]; marketIntel: string }) {
  // Parse market intel into keyword-specific tooltips
  const getTooltip = (word: string): string => {
    const lower = word.toLowerCase();
    // Try to find a sentence mentioning this keyword
    const sentences = marketIntel.split(/[.!]\s+/);
    const match = sentences.find(s => s.toLowerCase().includes(lower));
    if (match) return `Abby found: "${match.trim()}."`;
    return `"${word}" appears frequently in top-selling titles in your genre.`;
  };

  const maxCount = Math.max(...keywords.map(k => k.count), 1);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <p className="text-xs font-semibold text-foreground">Trending Keywords in Your Genre</p>
        <p className="text-[11px] text-muted-foreground">Hover over any keyword to see why it matters.</p>

        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => {
            const intensity = Math.min(kw.count / maxCount, 1);
            const size = intensity > 0.6 ? "text-sm" : intensity > 0.3 ? "text-xs" : "text-[11px]";
            return (
              <Tooltip key={kw.word}>
                <TooltipTrigger asChild>
                  <motion.button
                    className={`${size} font-medium rounded-full px-3 py-1.5 border transition-colors cursor-default
                      ${intensity > 0.6
                        ? "bg-secondary/15 border-secondary/40 text-secondary"
                        : intensity > 0.3
                          ? "bg-secondary/8 border-secondary/20 text-secondary/80"
                          : "bg-muted border-border text-muted-foreground"
                      }`}
                    whileHover={{ scale: 1.05 }}
                  >
                    {kw.word}
                    <span className="ml-1 text-[9px] opacity-60">×{kw.count}</span>
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  <p>{getTooltip(kw.word)}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-secondary/10 p-3">
          <TrendingUp className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
          <p className="text-[11px] text-foreground/80 leading-relaxed">
            Use these keywords in your product titles and descriptions to improve discoverability.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
