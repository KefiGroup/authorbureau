import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Award, CheckSquare, Volume2, ArrowUpRight, Sparkles } from "lucide-react";
import type { HomeStudyStepProps, StudyDay } from "./types";

export default function MaterialsStep({ stepData, onMarkEdited }: HomeStudyStepProps) {
  const setup = stepData.setup || {};
  const days: StudyDay[] = stepData.schedule?.days || [];
  const hasAudio = setup.format === "pdf-audio";
  const duration = setup.duration || 30;

  return (
    <div className="space-y-6">
      {/* PDF Preview */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Downloadable PDF Guide</p>
            <p className="text-[10px] text-muted-foreground">Clean, printable {duration}-day study guide</p>
          </div>
          <Badge variant="outline" className="text-[10px]">{days.length} pages</Badge>
        </div>
        <div className="border border-dashed border-border rounded-lg p-8 bg-muted/10 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">{setup.title || "Study Guide"}</p>
          <p className="text-[10px] text-muted-foreground mb-3">
            {duration} days · {setup.commitment || 30} min/day · {setup.level || "Beginner"}
          </p>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => window.print()}>
            Preview PDF Layout
          </Button>
        </div>
      </Card>

      {/* Progress Tracker */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <CheckSquare className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-bold">Progress Tracker Template</p>
            <p className="text-[10px] text-muted-foreground">Printable checklist for students to track daily completion</p>
          </div>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <p className="text-xs font-bold mb-2 text-center">{setup.title || "Study Guide"} — Progress Tracker</p>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: Math.min(duration, 35) }, (_, i) => (
              <div
                key={i}
                className={`h-8 rounded border flex items-center justify-center text-[9px] font-medium ${
                  i < duration
                    ? "border-border hover:bg-muted/30 cursor-pointer"
                    : "border-transparent"
                }`}
              >
                {i < duration && (
                  <>
                    <span className="text-muted-foreground">{i + 1}</span>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 border border-border rounded" /> Not started</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-accent/20 border border-accent rounded" /> Completed</span>
          </div>
        </div>
      </Card>

      {/* Audio Scripts */}
      {hasAudio && (
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Volume2 className="h-5 w-5 text-violet-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Companion Audio Scripts</p>
              <p className="text-[10px] text-muted-foreground">
                {days.filter(d => d.audioScript).length} of {days.length} days have audio scripts
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {days.filter(d => d.audioScript).length}/{days.length}
            </Badge>
          </div>
        </Card>
      )}

      {/* Certificate */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Award className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-bold">Certificate of Completion</p>
            <p className="text-[10px] text-muted-foreground">Awarded after completing all {duration} days</p>
          </div>
        </div>
        <div className="border border-dashed border-border rounded-lg p-6 text-center bg-muted/10">
          <Award className="h-8 w-8 text-secondary mx-auto mb-2" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-1">Certificate of Completion</p>
          <p className="text-sm font-medium">{setup.title || "Home Study Course"}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {duration}-Day Program · Completed on [Date]
          </p>
        </div>
      </Card>

      {/* Upsell suggestion */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-bold text-secondary mb-1">💡 Abby's Upsell Suggestion</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Students who complete this {duration}-day program are the perfect candidates for your <strong>Online Course</strong>.
              Include a compelling CTA on the final day and the certificate page that leads to your course enrollment.
            </p>
            <Button variant="link" size="sm" className="text-xs text-secondary p-0 h-auto mt-1">
              Open Online Course Builder <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
