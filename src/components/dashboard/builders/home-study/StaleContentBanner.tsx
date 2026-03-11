import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StaleContentBannerProps {
  currentSetup: Record<string, any>;
  generatedSetup: Record<string, any> | undefined;
  onRegenerate?: () => void;
  isGenerating?: boolean;
}

const TRACKED_FIELDS = ["title", "duration", "price", "commitment", "level"];

export function getSetupDiff(
  current: Record<string, any>,
  generated: Record<string, any> | undefined
): string[] {
  if (!generated) return [];
  const diffs: string[] = [];
  for (const field of TRACKED_FIELDS) {
    const cur = String(current[field] ?? "");
    const gen = String(generated[field] ?? "");
    if (cur && gen && cur !== gen) {
      const label = field === "commitment" ? "daily commitment" : field;
      diffs.push(`${label}: "${gen}" → "${cur}"`);
    }
  }
  return diffs;
}

export default function StaleContentBanner({
  currentSetup,
  generatedSetup,
  onRegenerate,
  isGenerating,
}: StaleContentBannerProps) {
  const diffs = getSetupDiff(currentSetup, generatedSetup);
  if (diffs.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">
          Content out of sync with setup
        </p>
        <p className="text-xs text-muted-foreground mb-2">
          You changed setup fields after this content was generated:
        </p>
        <ul className="text-xs text-muted-foreground space-y-0.5 mb-3">
          {diffs.map((d, i) => (
            <li key={i} className="flex items-center gap-1">
              <span className="text-amber-500">•</span> {d}
            </li>
          ))}
        </ul>
        {onRegenerate && (
          <Button
            onClick={onRegenerate}
            size="sm"
            variant="outline"
            disabled={isGenerating}
            className="text-xs border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Regenerate with updated settings
          </Button>
        )}
      </div>
    </div>
  );
}
