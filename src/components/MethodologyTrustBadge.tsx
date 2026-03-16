import { Link } from "react-router-dom";
import { FlaskConical } from "lucide-react";

/**
 * Compact trust badge showing the methodology behind Abby.
 * Used on the pricing section and other trust-building placements.
 */
export default function MethodologyTrustBadge() {
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 px-6 py-5 text-center max-w-3xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-2">
        <FlaskConical className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <p className="text-sm font-semibold text-foreground">
          Powered by 34 proven frameworks from business consulting, learning design, pricing psychology, and marketing strategy
        </p>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        McKinsey SCQ · Bloom's Taxonomy · Russell Brunson's Value Ladder · GROW Model (ICF) · ADDIE Model · and 29 more
      </p>
      <Link to="/methodology" className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors">
        See how Abby works →
      </Link>
    </div>
  );
}
