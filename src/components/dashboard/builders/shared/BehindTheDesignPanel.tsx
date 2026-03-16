import { useState } from "react";
import { ChevronDown, ChevronUp, FlaskConical, BarChart3, DollarSign, Megaphone, Link2 } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getBehindTheDesignContent } from "./BehindTheDesignContent";

interface Props {
  builderId: string;
  productLabel: string;
}

const TABS = [
  { id: "methodology", label: "Methodology", icon: FlaskConical, emoji: "🧪" },
  { id: "market", label: "Market Research", icon: BarChart3, emoji: "📊" },
  { id: "pricing", label: "Pricing", icon: DollarSign, emoji: "💰" },
  { id: "marketing", label: "Marketing", icon: Megaphone, emoji: "📣" },
  { id: "connected", label: "Revenue Map", icon: Link2, emoji: "🗺️" },
] as const;

function renderMarkdownLite(text: string) {
  // Very simple markdown: **bold** and line breaks
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function BehindTheDesignPanel({ builderId, productLabel }: Props) {
  const [open, setOpen] = useState(false);
  const content = getBehindTheDesignContent(builderId);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/40 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">📐</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Behind the Design</p>
                <p className="text-xs text-muted-foreground truncate">
                  Learn why Abby designed your {productLabel} this way
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium shrink-0 ml-3">
              {open ? (
                <>Collapse <ChevronUp className="h-3.5 w-3.5" /></>
              ) : (
                <>Expand <ChevronDown className="h-3.5 w-3.5" /></>
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4">
            <Tabs defaultValue="methodology">
              <TabsList className="w-full bg-amber-100/60 dark:bg-amber-900/30 h-auto flex-wrap gap-0.5 p-1">
                {TABS.map(tab => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="text-xs gap-1 px-2.5 py-1.5 data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:shadow-sm text-muted-foreground hover:text-amber-600 dark:data-[state=active]:bg-amber-950/50 dark:data-[state=active]:text-amber-300"
                  >
                    <span>{tab.emoji}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {TABS.map(tab => (
                <TabsContent key={tab.id} value={tab.id} className="mt-3">
                  <div className="rounded-md border border-amber-200/60 dark:border-amber-800/30 bg-white/80 dark:bg-card/50 p-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {renderMarkdownLite(content[tab.id])}
                    </p>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
