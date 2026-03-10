import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface Props {
  text: string;
  className?: string;
}

export default function HelpTooltip({ text, className = "" }: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className={`inline-flex items-center justify-center rounded-full text-muted-foreground/50 hover:text-muted-foreground transition-colors ${className}`}>
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
