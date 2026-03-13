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
    return (
      <div className="space-y-4">
        <Card className="p-6 border-accent/30 bg-accent/5">
          <div className="flex items-center gap-2 mb-4">
            <Check className="h-5 w-5 text-accent" />
            <p className="text-sm font-bold text-accent">Program configured by Abby</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {data.title && (
              <div className="col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Title</p>
                <p className="font-medium">{data.title}</p>
              </div>
            )}
            {data.duration && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Duration</p>
                <p className="font-medium">{data.duration} Days</p>
              </div>
            )}
            {data.commitment && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Daily Commitment</p>
                <p className="font-medium">{data.commitment} min/day</p>
              </div>
            )}
            {data.level && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Level</p>
                <p className="font-medium capitalize">{data.level}</p>
              </div>
            )}
            {data.format && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Format</p>
                <p className="font-medium">{data.format}</p>
              </div>
            )}
            {data.price && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Price</p>
                <p className="font-medium">${data.price}</p>
              </div>
            )}
          </div>
        </Card>
        <p className="text-xs text-muted-foreground text-center">
          You can edit all details in the final Review & Publish step
        </p>
      </div>
    );
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

  // Default: show the "Let Abby Design" CTA
  return (
    <div className="space-y-6">
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
