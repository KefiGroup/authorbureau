import { BookOpen, Globe, Sparkles, Hammer, DollarSign } from "lucide-react";
import { TIERS, type SubscriptionTier } from "@/hooks/useAuth";

interface PortfolioSummaryBarProps {
  bookCount: number;
  liveMicrosites: number;
  analyzedCount: number;
  productsBuilt: number;
  totalRecommended: number;
  revenueThisMonth: number;
  tier: SubscriptionTier;
  onSubscribe?: () => void;
  compact?: boolean;
}

const stats = [
  { key: "books", icon: BookOpen, bg: "#FEF3C7", color: "#D97706" },
  { key: "microsites", icon: Globe, bg: "#DBEAFE", color: "#2563EB" },
  { key: "analyzed", icon: Sparkles, bg: "#D1FAE5", color: "#059669" },
  { key: "products", icon: Hammer, bg: "#E0E7FF", color: "#4F46E5" },
  { key: "revenue", icon: DollarSign, bg: "#FCE7F3", color: "#DB2777" },
];

export default function PortfolioSummaryBar({
  bookCount, liveMicrosites, analyzedCount, productsBuilt, totalRecommended,
  revenueThisMonth, tier, onSubscribe, compact = false,
}: PortfolioSummaryBarProps) {
  const fullValues = [
    { value: String(bookCount), label: "Books Listed" },
    { value: String(liveMicrosites), label: "Live Microsites" },
    { value: String(analyzedCount), label: "Analyzed by Abby" },
    { value: `${productsBuilt} of ${totalRecommended}`, label: "Products Built" },
    { value: `$${revenueThisMonth}`, label: "Revenue This Month" },
  ];

  // Compact variant: drop "Analyzed by Abby" and the plan-pill on the right.
  const values = compact
    ? [fullValues[0], fullValues[1], fullValues[3], fullValues[4]]
    : fullValues;
  const compactStats = compact
    ? [stats[0], stats[1], stats[3], stats[4]]
    : stats;

  const tierLabel = tier !== "free"
    ? `${TIERS[tier as keyof typeof TIERS]?.label} — $${TIERS[tier as keyof typeof TIERS]?.monthlyPrice}/mo`
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-4 lg:gap-6">
        {values.map((v, i) => {
          const s = compactStats[i];
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-center gap-2.5 min-w-[120px]">
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: s.bg }}
              >
                <Icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-lg font-bold font-heading leading-tight">{v.value}</p>
                <p className="text-[11px] text-muted-foreground">{v.label}</p>
              </div>
            </div>
          );
        })}

        {!compact && (
          <div className="ml-auto">
            {tierLabel ? (
              <span className="inline-flex items-center rounded-full bg-[#EEF2FF] px-3 py-1.5 text-xs font-semibold text-[#4F46E5]">
                Your Plan: {tierLabel}
              </span>
            ) : (
              <button
                onClick={onSubscribe}
                className="inline-flex items-center rounded-full bg-[#FDF6E9] px-3 py-1.5 text-xs font-semibold text-[#C4973B] hover:bg-[#FEF3C7] transition-colors cursor-pointer"
              >
                No Plan — Subscribe →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
