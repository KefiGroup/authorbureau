import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Monitor, Smartphone, ChevronLeft, ChevronRight, CheckCircle2,
  BookOpen, Clock, CalendarDays, Award,
} from "lucide-react";
import type { HomeStudyStepProps, StudyDay } from "./types";

export default function HomeStudyPreviewStep({ stepData }: HomeStudyStepProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewPage, setPreviewPage] = useState(0); // 0=cover, 1+=days
  const setup = stepData.setup || {};
  const days: StudyDay[] = stepData.schedule?.days || [];
  const duration = setup.duration || 30;
  const totalPages = days.length + 2; // cover + days + certificate

  const currentDay = previewPage > 0 && previewPage <= days.length ? days[previewPage - 1] : null;
  const isCertPage = previewPage === totalPages - 1;

  return (
    <div className="space-y-6">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewPage(Math.max(0, previewPage - 1))}
            disabled={previewPage === 0}
            className="text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {previewPage + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewPage(Math.min(totalPages - 1, previewPage + 1))}
            disabled={previewPage === totalPages - 1}
            className="text-xs"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("desktop")}
            className={`p-1.5 ${viewMode === "desktop" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("mobile")}
            className={`p-1.5 ${viewMode === "mobile" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className={`mx-auto border border-border rounded-xl overflow-hidden bg-card shadow-lg ${
        viewMode === "mobile" ? "max-w-sm" : "max-w-2xl"
      }`}>
        {previewPage === 0 ? (
          /* Cover page */
          <div className="bg-gradient-to-b from-secondary/10 to-transparent p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
            <Badge variant="secondary" className="text-[10px] mb-4">
              {duration}-Day Program
            </Badge>
            <h1 className="font-heading text-2xl font-bold mb-2">{setup.title || "Home Study Course"}</h1>
            <p className="text-sm text-muted-foreground mb-4">{setup.description || "A guided self-paced learning experience"}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {duration} days</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {setup.commitment || 30} min/day</span>
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {setup.level || "Beginner"}</span>
            </div>
            <div className="mt-6 p-4 bg-muted/30 rounded-lg max-w-sm">
              <p className="text-xs text-muted-foreground">
                <strong>How to use this guide:</strong> Spend {setup.commitment || 30} minutes each day completing the reading,
                exercise, and reflection. Check off each day on your progress tracker.
              </p>
            </div>
          </div>
        ) : isCertPage ? (
          /* Certificate page */
          <div className="p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
            <Award className="h-12 w-12 text-secondary mb-4" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">Certificate of Completion</p>
            <h2 className="font-heading text-xl font-bold mb-1">{setup.title || "Home Study Course"}</h2>
            <p className="text-sm text-muted-foreground mb-4">{duration}-Day Program</p>
            <div className="border-t border-b border-border py-3 my-4 w-48">
              <p className="text-xs text-muted-foreground">[Student Name]</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Completed on [Date]</p>
          </div>
        ) : currentDay ? (
          /* Day page */
          <div className="p-6 min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <Badge variant={currentDay.isCatchUp ? "outline" : "secondary"} className="text-[10px]">
                {currentDay.isCatchUp ? "☕ Catch-Up Day" : `Day ${currentDay.dayNumber}`}
              </Badge>
              <span className="text-[10px] text-muted-foreground">Week {currentDay.weekNumber}</span>
            </div>
            <h3 className="font-heading text-lg font-bold mb-4">{currentDay.theme}</h3>

            <div className="space-y-4">
              <div className="p-3 bg-muted/20 rounded-lg">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">📖 Today's Reading</p>
                <p className="text-xs">{currentDay.reading || currentDay.chapterRef}</p>
              </div>

              {currentDay.concept && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">💡 Key Concept</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-6">{currentDay.concept}</p>
                </div>
              )}

              <div className="p-3 bg-accent/5 rounded-lg border border-accent/10">
                <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">🏋️ Exercise</p>
                <p className="text-xs text-muted-foreground">{currentDay.exercise}</p>
              </div>

              <div className="p-3 bg-violet-500/5 rounded-lg border border-violet-500/10">
                <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1">🪞 Reflection</p>
                <p className="text-xs text-muted-foreground">{currentDay.reflection}</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <div className="w-5 h-5 rounded border-2 border-muted-foreground/20" />
                <span className="text-xs text-muted-foreground">I completed Day {currentDay.dayNumber}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Abby's final review */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-bold text-secondary mb-1">Abby's Final Review</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your <strong>{duration}-day</strong> study program covers <strong>{days.length} days</strong> of structured learning
              at <strong>{setup.commitment || 30} minutes/day</strong>.
              {setup.price && ` At $${setup.price}, with 20 students per month, that's $${parseInt(setup.price) * 20}/month in passive income.`}
              {" "}The weekly themes create a natural progression — this is ready to publish!
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
