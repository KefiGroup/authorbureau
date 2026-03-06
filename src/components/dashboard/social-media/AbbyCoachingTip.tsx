import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface Props {
  title: string;
  tips?: string[];
  customContent?: React.ReactNode;
  expandedByDefault?: boolean;
}

export default function AbbyCoachingTip({ title, tips, customContent, expandedByDefault = false }: Props) {
  const [expanded, setExpanded] = useState(expandedByDefault);

  return (
    <div className="rounded-xl border border-secondary/30 bg-secondary/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/10 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Abby's Strategy Guide</p>
          <p className="text-sm font-medium text-foreground">{title}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-secondary/20 pt-3">
          {customContent ? customContent : tips?.map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-secondary font-bold text-xs mt-0.5">→</span>
              <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
