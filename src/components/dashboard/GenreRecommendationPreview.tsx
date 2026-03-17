import { useMemo } from "react";
import { CheckCircle2, Star, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Genre-based product recommendation preview.
 * Shows which monetization streams are best-suited for a given genre.
 */

interface Recommendation {
  product: string;
  category: "Brand" | "Build" | "Yield";
  revenue: string;
  fit: "High" | "Medium";
}

const GENRE_RECOMMENDATIONS: Record<string, Recommendation[]> = {
  "self-help": [
    { product: "Online Course", category: "Build", revenue: "$97–$497", fit: "High" },
    { product: "Home Study Course", category: "Build", revenue: "$27–$97", fit: "High" },
    { product: "Workbook", category: "Build", revenue: "$0–$27", fit: "High" },
    { product: "1-on-1 Coaching", category: "Yield", revenue: "$150–$500/session", fit: "High" },
    { product: "Group Coaching", category: "Yield", revenue: "$297–$997/cohort", fit: "High" },
    { product: "Podcast", category: "Build", revenue: "Audience builder", fit: "High" },
    { product: "Email Marketing", category: "Build", revenue: "Marketing asset", fit: "Medium" },
    { product: "Membership", category: "Yield", revenue: "$9–$97/mo", fit: "Medium" },
  ],
  "business": [
    { product: "Online Course", category: "Build", revenue: "$197–$997", fit: "High" },
    { product: "Big Ticket Consulting", category: "Yield", revenue: "$2,500–$10,000+", fit: "High" },
    { product: "Keynote Speaking", category: "Yield", revenue: "$2,500–$25,000", fit: "High" },
    { product: "Mastermind", category: "Yield", revenue: "$5,000–$25,000/yr", fit: "High" },
    { product: "Home Study Course", category: "Build", revenue: "$47–$197", fit: "High" },
    { product: "Podcast", category: "Build", revenue: "Audience builder", fit: "Medium" },
    { product: "Training Programs", category: "Yield", revenue: "$5,000–$25,000", fit: "Medium" },
    { product: "Webinars", category: "Build", revenue: "$0–$97", fit: "Medium" },
  ],
  "finance": [
    { product: "Online Course", category: "Build", revenue: "$197–$997", fit: "High" },
    { product: "Big Ticket Consulting", category: "Yield", revenue: "$2,500–$10,000+", fit: "High" },
    { product: "Home Study Course", category: "Build", revenue: "$47–$197", fit: "High" },
    { product: "Membership", category: "Yield", revenue: "$27–$97/mo", fit: "High" },
    { product: "Webinars", category: "Build", revenue: "$0–$97", fit: "Medium" },
    { product: "1-on-1 Coaching", category: "Yield", revenue: "$200–$500/session", fit: "Medium" },
    { product: "Podcast", category: "Build", revenue: "Audience builder", fit: "Medium" },
    { product: "Email Marketing", category: "Build", revenue: "Marketing asset", fit: "Medium" },
  ],
  "leadership": [
    { product: "Keynote Speaking", category: "Yield", revenue: "$5,000–$25,000", fit: "High" },
    { product: "Big Ticket Consulting", category: "Yield", revenue: "$2,500–$10,000+", fit: "High" },
    { product: "Training Programs", category: "Yield", revenue: "$5,000–$25,000", fit: "High" },
    { product: "Online Course", category: "Build", revenue: "$197–$997", fit: "High" },
    { product: "Mastermind", category: "Yield", revenue: "$5,000–$25,000/yr", fit: "High" },
    { product: "Group Coaching", category: "Yield", revenue: "$497–$2,000/cohort", fit: "Medium" },
    { product: "Podcast", category: "Build", revenue: "Audience builder", fit: "Medium" },
    { product: "Retreats & Bootcamps", category: "Yield", revenue: "$997–$5,000", fit: "Medium" },
  ],
  "health": [
    { product: "Online Course", category: "Build", revenue: "$97–$497", fit: "High" },
    { product: "Group Coaching", category: "Yield", revenue: "$297–$997/cohort", fit: "High" },
    { product: "Home Study Course", category: "Build", revenue: "$27–$97", fit: "High" },
    { product: "Membership", category: "Yield", revenue: "$19–$97/mo", fit: "High" },
    { product: "1-on-1 Coaching", category: "Yield", revenue: "$100–$300/session", fit: "Medium" },
    { product: "Podcast", category: "Build", revenue: "Audience builder", fit: "Medium" },
    { product: "Workbook", category: "Build", revenue: "$0–$27", fit: "Medium" },
    { product: "Email Marketing", category: "Build", revenue: "Marketing asset", fit: "Medium" },
  ],
  "spirituality": [
    { product: "Retreats & Bootcamps", category: "Yield", revenue: "$997–$5,000", fit: "High" },
    { product: "Online Course", category: "Build", revenue: "$97–$297", fit: "High" },
    { product: "Group Coaching", category: "Yield", revenue: "$297–$997/cohort", fit: "High" },
    { product: "Membership", category: "Yield", revenue: "$9–$47/mo", fit: "High" },
    { product: "Home Study Course", category: "Build", revenue: "$27–$97", fit: "Medium" },
    { product: "Podcast", category: "Build", revenue: "Audience builder", fit: "Medium" },
    { product: "Workbook", category: "Build", revenue: "$0–$19", fit: "Medium" },
    { product: "Email Marketing", category: "Build", revenue: "Marketing asset", fit: "Medium" },
  ],
};

// Default for any genre not specifically mapped
const DEFAULT_RECOMMENDATIONS: Recommendation[] = [
  { product: "Online Course", category: "Build", revenue: "$97–$497", fit: "High" },
  { product: "Home Study Course", category: "Build", revenue: "$27–$97", fit: "High" },
  { product: "Workbook", category: "Build", revenue: "$0–$27", fit: "Medium" },
  { product: "Podcast", category: "Build", revenue: "Audience builder", fit: "Medium" },
  { product: "1-on-1 Coaching", category: "Yield", revenue: "$150–$500/session", fit: "High" },
  { product: "Email Marketing", category: "Build", revenue: "Marketing asset", fit: "Medium" },
  { product: "Group Coaching", category: "Yield", revenue: "$297–$997/cohort", fit: "Medium" },
  { product: "Membership", category: "Yield", revenue: "$9–$97/mo", fit: "Medium" },
];

function matchGenre(genre: string): Recommendation[] {
  const g = genre.toLowerCase().trim();
  for (const [key, recs] of Object.entries(GENRE_RECOMMENDATIONS)) {
    if (g.includes(key)) return recs;
  }
  // Check synonyms
  if (g.includes("personal development") || g.includes("motivation")) return GENRE_RECOMMENDATIONS["self-help"];
  if (g.includes("entrepreneur") || g.includes("marketing") || g.includes("sales")) return GENRE_RECOMMENDATIONS["business"];
  if (g.includes("money") || g.includes("invest") || g.includes("wealth")) return GENRE_RECOMMENDATIONS["finance"];
  if (g.includes("management") || g.includes("executive")) return GENRE_RECOMMENDATIONS["leadership"];
  if (g.includes("wellness") || g.includes("fitness") || g.includes("nutrition") || g.includes("diet")) return GENRE_RECOMMENDATIONS["health"];
  if (g.includes("faith") || g.includes("religion") || g.includes("mindfulness") || g.includes("meditation")) return GENRE_RECOMMENDATIONS["spirituality"];
  return DEFAULT_RECOMMENDATIONS;
}

const categoryColors: Record<string, string> = {
  Brand: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
  Build: "text-violet-700 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/40",
  Yield: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40",
};

interface Props {
  genre: string;
}

export default function GenreRecommendationPreview({ genre }: Props) {
  const recommendations = useMemo(() => matchGenre(genre), [genre]);

  if (!genre.trim()) return null;

  const highFit = recommendations.filter(r => r.fit === "High");
  const medFit = recommendations.filter(r => r.fit === "Medium");

  return (
    <Card className="p-4 border-border">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <h3 className="font-heading font-bold text-sm">
          Recommended for <span className="text-secondary">{genre}</span>
        </h3>
      </div>
      <p className="text-[10px] text-muted-foreground mb-3">
        Based on your genre, these products have the highest revenue potential. You'll build them in your Book Hub after saving.
      </p>

      {/* High Fit */}
      <div className="space-y-1.5 mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">⭐ Top Recommendations</p>
        {highFit.map((r) => (
          <div key={r.product} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="text-xs font-medium truncate">{r.product}</span>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${categoryColors[r.category]}`}>
                {r.category}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">{r.revenue}</span>
          </div>
        ))}
      </div>

      {/* Medium Fit */}
      {medFit.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Also Suitable</p>
          {medFit.map((r) => (
            <div key={r.product} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-1.5 opacity-75">
              <div className="flex items-center gap-2 min-w-0">
                <Star className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-[11px] truncate">{r.product}</span>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${categoryColors[r.category]}`}>
                  {r.category}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">{r.revenue}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
