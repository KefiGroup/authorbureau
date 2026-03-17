import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Monitor, Smartphone, BookOpen, Clock, Award, Users,
  CheckCircle2, PlayCircle, ChevronRight,
} from "lucide-react";
import type { CourseStepProps, CourseModule } from "./types";

export default function CoursePreviewStep({ stepData }: CourseStepProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const foundation = stepData.foundation || {};
  const modules: CourseModule[] = stepData.curriculum?.modules || [];
  const totalMinutes = modules.reduce((a, m) => a + (m.durationMinutes || 0), 0);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="student" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="student" className="text-xs">Student Experience</TabsTrigger>
            <TabsTrigger value="sales" className="text-xs">Sales Page</TabsTrigger>
          </TabsList>
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

        <TabsContent value="student">
          <div className={`mx-auto border border-border rounded-xl overflow-hidden bg-card shadow-lg ${
            viewMode === "mobile" ? "max-w-sm" : "max-w-3xl"
          }`}>
            {/* Course header */}
            <div className="bg-gradient-to-r from-secondary/10 to-secondary/5 p-6 border-b border-border">
              <Badge variant="secondary" className="text-[10px] mb-3">Preview Mode</Badge>
              <h2 className="font-heading text-xl font-bold mb-1">{foundation.title || "Course Title"}</h2>
              <p className="text-sm text-muted-foreground">{foundation.subtitle || "Course subtitle"}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {modules.length} modules</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.round(totalMinutes / 60)}h {totalMinutes % 60}m</span>
                <span className="flex items-center gap-1"><Award className="h-3 w-3" /> Certificate</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="px-6 py-3 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Course Progress</span>
                <span className="font-medium">0%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-0 bg-accent rounded-full" />
              </div>
            </div>

            {/* Module list */}
            <div className="p-4 space-y-2">
              {modules.map((mod, i) => (
                <div key={mod.id} className="border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="text-sm font-medium">{mod.title}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{mod.durationMinutes || 0}m</span>
                  </div>
                  {mod.contentSummary && (
                    <div className="px-3 py-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">{mod.contentSummary}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sales">
          <div className={`mx-auto border border-border rounded-xl overflow-hidden bg-card shadow-lg ${
            viewMode === "mobile" ? "max-w-sm" : "max-w-3xl"
          }`}>
            {/* Hero */}
            <div className="bg-gradient-to-b from-secondary/10 to-transparent p-8 text-center">
              <h1 className="font-heading text-2xl font-bold mb-2">{stepData.salesPage?.headline || "Course Headline"}</h1>
              <p className="text-sm text-muted-foreground mb-4">{stepData.salesPage?.subheadline || "Compelling subheadline"}</p>
              <Button className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                Enroll Now — ${foundation.exactPrice || foundation.priceTier || "97"}
              </Button>
            </div>

            {/* Pain points */}
            {stepData.salesPage?.painPoints && (
              <div className="p-6 border-t border-border">
                <h3 className="text-sm font-bold mb-3">Sound familiar?</h3>
                <div className="space-y-2">
                  {stepData.salesPage.painPoints.map((p: string, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="text-destructive">✗</span> {p}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Transformation */}
            {stepData.salesPage?.transformationText && (
              <div className="p-6 border-t border-border bg-secondary/5">
                <h3 className="text-sm font-bold text-secondary mb-2">The Transformation</h3>
                <p className="text-xs text-muted-foreground">{stepData.salesPage.transformationText}</p>
              </div>
            )}

            {/* Stats */}
            <div className="p-6 border-t border-border">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-secondary">{modules.length}</p>
                  <p className="text-[10px] text-muted-foreground">Modules</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-secondary">{totalLessons}</p>
                  <p className="text-[10px] text-muted-foreground">Lessons</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-secondary">{Math.round(totalMinutes / 60)}h+</p>
                  <p className="text-[10px] text-muted-foreground">Content</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="p-6 border-t border-border text-center">
              <Button className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 px-8">
                Enroll Now — ${foundation.exactPrice || foundation.priceTier || "97"}
              </Button>
              <p className="text-[10px] text-muted-foreground mt-2">30-day money-back guarantee</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Abby's final review */}
      <Card className="p-4 border-secondary/20 bg-secondary/5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs font-bold text-secondary mb-1">Abby's Final Review</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your course covers <strong>{modules.length} modules</strong> with <strong>{totalLessons} lessons</strong>.
              Estimated completion time: <strong>{Math.round(totalMinutes / 60)} hours</strong>.
              {foundation.exactPrice && ` At $${foundation.exactPrice}, with even 10 students per month, that's $${parseInt(foundation.exactPrice) * 10}/month in revenue.`}
              {" "}Everything looks solid — ready to publish!
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
