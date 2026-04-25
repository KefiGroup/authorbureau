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

function CompetitiveFallback({
  competitors,
  onRefresh,
}: {
  competitors: { title: string; url: string; snippet: string; platform: string }[];
  onRefresh?: () => void | Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-foreground/80 leading-relaxed">
          Amazon's bestseller scrape was blocked for this niche category.
          {competitors.length > 0
            ? " Showing competitor digital products Abby found across other platforms."
            : " Try refreshing, or check the Live Market Trends tab for genre intelligence."}
        </p>
      </div>

      {competitors.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Competitor Digital Products</p>
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/50">
            {competitors.slice(0, 5).map((c, i) => (
              <a
                key={i}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors group"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-secondary/15 text-secondary shrink-0 mt-0.5">
                  {c.platform}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate group-hover:text-secondary transition-colors">
                    {c.title}
                  </p>
                  {c.snippet && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{c.snippet}</p>
                  )}
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
              </a>
            ))}
          </div>
        </div>
      )}

      {competitors.length === 0 && onRefresh && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={() => onRefresh()} className="gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" /> Try again
          </Button>
        </div>
      )}
    </div>
  );
}

function PriceDistribution({ data }: { data: MarketResearchData }) {
  const products = data.amazonBestsellers!.products;
  const pricing = data.amazonBestsellers!.pricingAnalysis;

  // Build price buckets
  const buckets = useMemo(() => {
    const prices = products
      .map(p => parseFloat((p.price || "").replace(/[^0-9.]/g, "")))
      .filter(n => !isNaN(n) && n > 0);
    if (prices.length === 0) return [];

    const ranges = [
      { label: "$0–$9.99", min: 0, max: 9.99 },
      { label: "$10–$14.99", min: 10, max: 14.99 },
      { label: "$15–$19.99", min: 15, max: 19.99 },
      { label: "$20–$29.99", min: 20, max: 29.99 },
      { label: "$30+", min: 30, max: 9999 },
    ];

    return ranges.map(r => ({
      label: r.label,
      count: prices.filter(p => p >= r.min && p <= r.max).length,
    })).filter(b => b.count > 0);
  }, [products]);

  const maxCount = Math.max(...buckets.map(b => b.count), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">Price Distribution — Top {products.length} Titles</p>
        {pricing && (
          <span className="text-[10px] text-muted-foreground">
            Avg: <strong className="text-foreground">{pricing.average}</strong> · Median: <strong className="text-foreground">{pricing.median}</strong>
          </span>
        )}
      </div>

      <div className="space-y-2">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground w-20 text-right shrink-0">{bucket.label}</span>
            <div className="flex-1 h-6 bg-muted/50 rounded-md overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-secondary/60 to-secondary rounded-md flex items-center px-2"
                initial={{ width: 0 }}
                animate={{ width: `${(bucket.count / maxCount) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <span className="text-[10px] font-bold text-secondary-foreground">{bucket.count}</span>
              </motion.div>
            </div>
          </div>
        ))}
      </div>

      {pricing && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary/10 px-3 py-2">
          <Sparkles className="h-3 w-3 text-secondary shrink-0" />
          <p className="text-[11px] text-foreground">
            <strong>Abby's recommended price:</strong> {pricing.median} (based on median of {pricing.sampleSize} competitors)
          </p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Abby scanned the top-selling titles in your genre.
      </p>
    </div>
  );
}

function TopBestsellers({ products }: { products: { rank: number; title: string; author?: string; price?: string }[] }) {
  if (products.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground">Top 3 Bestselling Titles</p>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Title</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Author</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Price</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i} className="border-t border-border/50">
                <td className="px-3 py-2 font-bold text-secondary">{p.rank || i + 1}</td>
                <td className="px-3 py-2 font-medium text-foreground truncate max-w-[200px]">{p.title}</td>
                <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">{p.author || "—"}</td>
                <td className="px-3 py-2 text-right font-medium">{p.price || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
