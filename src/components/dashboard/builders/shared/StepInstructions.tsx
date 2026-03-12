import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

export interface InstructionItem {
  label: string;
  description: string;
}

interface Props {
  title?: string;
  summary: string;
  items: InstructionItem[];
  defaultOpen?: boolean;
}

export default function StepInstructions({ title = "How this works", summary, items, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="font-medium text-foreground text-sm flex-1">{title}</p>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-3 pb-3 text-xs text-muted-foreground space-y-1.5 border-t border-border pt-2">
          <p>{summary}</p>
          <ul className="list-disc list-inside space-y-0.5 ml-1">
            {items.map((item, i) => (
              <li key={i}>
                <strong>{item.label}</strong> — {item.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
