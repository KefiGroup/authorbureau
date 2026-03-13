import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Wand2, Check } from "lucide-react";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import type { HomeStudyStepProps } from "./types";

export default function ProgramSetupStep({ stepData, setStepData, onMarkEdited, plan, onStartGeneration, builderAct }: HomeStudyStepProps) {
  const data = stepData.setup || {};
  const isIdle = !builderAct || builderAct === "idle";
  const isComplete = builderAct === "act3_complete";

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
