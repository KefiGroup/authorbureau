import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Wand2, Check, BookOpen, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { HomeStudyStepProps } from "./types";

export default function ProgramSetupStep({ stepData, setStepData, onMarkEdited, plan, onStartGeneration, builderAct, bookId, onNavigate }: HomeStudyStepProps) {
  const data = stepData.setup || {};
  const isIdle = !builderAct || builderAct === "idle";
  const isComplete = builderAct === "act3_complete";

  // Check if workbook exists for this book
  const [workbookExists, setWorkbookExists] = useState<boolean | null>(null);
  useEffect(() => {
    if (!bookId) return;
    (async () => {
      const { data: wbs, error } = await supabase
        .from("workbooks" as any)
        .select("id")
        .eq("book_id", bookId)
        .limit(1);
      setWorkbookExists(!error && Array.isArray(wbs) && wbs.length > 0);
    })();
  }, [bookId]);

  // Show summary if generation is complete
  if (isComplete && data.title) {
    return null;
  }

  // Hide CTA when Abby is actively working
  if (!isIdle && !isComplete) {
    return null;
  }

  // Gate: Workbook must exist before building Home Study
  if (workbookExists === false) {
    return (
      <div className="space-y-6">
        <Card className="p-8 border-amber-300/40 bg-amber-50/50 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
            <BookOpen className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="font-heading text-xl font-bold mb-2">
            Build Your Workbook First
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
            The Home Study Course sales page cross-sells your companion Workbook as a recommended add-on purchase. 
            Build the Workbook first so Abby can reference it in your Home Study marketing copy.
          </p>
          <Button
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              const title = params.get("bookTitle") || "";
              const cover = params.get("bookCoverUrl") || "";
              const qs = new URLSearchParams({ bookId, bookTitle: title, bookCoverUrl: cover }).toString();
              window.location.href = `/dashboard?section=builder&builder=workbook&${qs}`;
            }}
            className="rounded-full bg-amber-600 text-white hover:bg-amber-700 font-semibold h-12 px-8 text-sm"
          >
            <BookOpen className="h-4 w-4 mr-2" /> Build Workbook First <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <p className="text-[10px] text-muted-foreground/60 mt-4">
            Recommended sequence: Workbook → Home Study Course → Online Course
          </p>
        </Card>
      </div>
    );
  }

  // Loading state while checking
  if (workbookExists === null) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Journey overview */}
      <Card className="p-5 border-border/60 bg-muted/30">
        <h4 className="font-heading text-sm font-bold mb-3">🗺️ Your Home Study Builder Journey</h4>
        <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
          <li><span className="font-medium text-foreground">Program Setup</span> — Abby analyzes your manuscript and designs the program structure, title, pricing, and curriculum.</li>
          <li><span className="font-medium text-foreground">Daily Schedule</span> — Review and edit the day-by-day schedule with themes and chapter references.</li>
          <li><span className="font-medium text-foreground">Daily Content</span> — Generate readings, exercises, reflections, and action plans for each day.</li>
          <li><span className="font-medium text-foreground">Materials & Packaging</span> — Finalize downloadable assets and supplementary materials.</li>
          <li><span className="font-medium text-foreground">Preview & Publish</span> — Review everything and publish to your website.</li>
        </ol>
      </Card>

      <Card className="p-8 border-secondary/30 bg-gradient-to-br from-secondary/5 to-secondary/10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary/15 flex items-center justify-center mx-auto mb-5">
          <Sparkles className="h-8 w-8 text-secondary" />
        </div>
        <h3 className="font-heading text-xl font-bold mb-2">
          Let Abby Design Your Home Study Program
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
          Abby will analyze your manuscript, propose a complete program structure with title options, 
          optimal duration, pricing, and a day-by-day curriculum — all tailored to your book's content.
        </p>
        <Button
          onClick={onStartGeneration}
          className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold h-12 px-8 text-sm"
        >
          <Sparkles className="h-4 w-4 mr-2" /> Let Abby Design This Program
        </Button>
        <p className="text-[10px] text-muted-foreground/60 mt-4">
          You'll review and edit everything before publishing
        </p>
      </Card>
    </div>
  );
}
