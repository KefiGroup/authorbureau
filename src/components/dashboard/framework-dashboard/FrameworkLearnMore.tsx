import { useState } from "react";
import { ChevronDown, BookOpen } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import frameworkImg from "@/assets/abby_journey_framework_v14_bby.webp";
import { CopyrightCaption } from "@/components/ui/copyright-caption";

export default function FrameworkLearnMore() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3 hover:bg-muted/40 transition-colors">
        <div className="flex items-center gap-3">
          <BookOpen className="h-4 w-4 text-amber-600" />
          <span className="font-medium text-sm text-foreground">
            Learn the ABBY Journey Framework
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            One book. 28 revenue streams. Your empire.
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div
          className="mt-3 rounded-2xl overflow-hidden p-4 md:p-6"
          style={{ background: "linear-gradient(135deg, #FFF8E7 0%, #FFF1CC 100%)" }}
        >
          <img
            src={frameworkImg}
            alt="The ABBY Journey Framework — Brand, Build, Yield"
            className="w-full h-auto rounded-xl"
            loading="lazy"
          />
          <CopyrightCaption />
          <p className="mt-4 text-center font-heading text-base md:text-lg italic text-gray-800">
            "Your book is not the business. Your book is the <span className="text-amber-600 font-bold">HOOK</span>."
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
