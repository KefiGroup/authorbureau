import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface Props {
  reasoning: string;
  className?: string;
}

export default function AbbyExplainsTooltip({ reasoning, className = "" }: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className={`inline-flex items-center justify-center text-amber-500 hover:text-amber-600 transition-colors cursor-pointer ${className}`}>
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-sm bg-white dark:bg-card shadow-lg rounded-lg p-4 border border-border"
        >
          <p className="text-amber-700 dark:text-amber-400 font-semibold text-xs mb-1.5">💡 Abby's Reasoning</p>
          <p className="text-muted-foreground text-sm leading-relaxed">{reasoning}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
