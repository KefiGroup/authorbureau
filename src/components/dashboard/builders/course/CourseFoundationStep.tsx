import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import AbbyRecommendationCard from "../shared/AbbyRecommendationCard";
import ProductDistinctionCard from "../shared/ProductDistinctionCard";
import type { CourseStepProps } from "./types";

export default function CourseFoundationStep({ onStartGeneration, builderAct }: CourseStepProps) {
  const canGenerate = builderAct === "idle" || !builderAct;

  return (
    <div className="space-y-6">
      <AbbyRecommendationCard>
        <p className="text-sm text-foreground leading-relaxed">
          Online courses are <strong>self-paced learning experiences</strong> — students enroll and learn on their own schedule with recorded video lessons, exercises, and quizzes. Ideal price range: <strong>$97–$297</strong>. For live facilitated workshops at $497+, use the <strong>Training Program</strong> builder instead.
        </p>
      </AbbyRecommendationCard>

      <ProductDistinctionCard highlight="online-course" />

      {canGenerate && onStartGeneration && (
        <Card className="p-5 border-secondary/30 bg-secondary/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">Let Abby design your course</p>
              <p className="text-xs text-muted-foreground">
                Abby will analyze your manuscript and structure a self-paced online course with modules, lessons, exercises, and quizzes.
              </p>
            </div>
            <Button
              onClick={onStartGeneration}
              className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0"
            >
              <Sparkles className="h-4 w-4 mr-2" /> Analyze with Abby
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
