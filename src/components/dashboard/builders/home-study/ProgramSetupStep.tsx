import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Wand2, Check, BookOpen, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProductDistinctionCard from "../shared/ProductDistinctionCard";
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

  // Loading state while checking
  if (workbookExists === null) {
    return null;
  }

  return (
    <div className="space-y-6">
      {workbookExists === false && (
        <Card className="p-5 border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/20">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-heading text-sm font-bold mb-1 text-amber-900 dark:text-amber-200">
                We recommend building your Workbook first
              </h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-200/80 leading-relaxed mb-3">
                Your Home Study sales page will cross-sell a companion Workbook. Without one, Abby will skip the
                cross-sell section. You can build the Workbook anytime and re-generate.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  const title = params.get("bookTitle") || "";
                  const cover = params.get("bookCoverUrl") || "";
                  const qs = new URLSearchParams({ bookId, bookTitle: title, bookCoverUrl: cover }).toString();
                  window.location.href = `/dashboard?section=builder&builder=workbook&${qs}`;
                }}
                className="rounded-full border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40 h-8 text-xs"
              >
                <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Build Workbook First <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      <ProductDistinctionCard highlight="home-study" />

      {/* Journey overview */}
      <Card className="p-5 border-border/60 bg-muted/30">
        <h4 className="font-heading text-sm font-bold mb-3">🗺️ How It Works</h4>
        <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
          <li><span className="font-medium text-foreground">Program Setup</span> — Abby analyzes your manuscript and generates the full program: title, pricing, and all daily content.</li>
          <li><span className="font-medium text-foreground">Edit & Publish</span> — Review every day's reading, exercise, reflection, and action plan. Edit anything, then publish.</li>
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
