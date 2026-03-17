import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Monitor, Smartphone, BookOpen, Clock, Award,
  CheckCircle2, AlertTriangle,
} from "lucide-react";
import SharedSalesCopyPreview from "../shared/SharedSalesCopyPreview";
import SalesCurriculumValidator from "../shared/SalesCurriculumValidator";
import { DEFAULT_SALES_COPY } from "../shared/salesCopyTypes";
import type { CourseStepProps, CourseModule } from "./types";

export default function CoursePreviewStep({ stepData, goToStep }: CourseStepProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const foundation = stepData.foundation || {};
  const modules: CourseModule[] = stepData.curriculum?.modules || [];
  const totalMinutes = modules.reduce((a, m) => a + (m.durationMinutes || 0), 0);
  const hasModules = modules.length > 0;
  const salesCopy = stepData.salesCopyData || DEFAULT_SALES_COPY;
  const hasSalesCopy = salesCopy.hero?.title && salesCopy.hero.title !== "";

  // Build curriculum facts for the validator
  const curriculumFacts = {
    moduleCount: modules.length,
    moduleTitles: modules.map((m) => m.title),
    totalHours: Math.round(totalMinutes / 60),
    hasLessons: modules.some((m) => (m.lessons?.length || 0) > 0),
    hasExercises: modules.some((m) =>
      m.lessons?.some((l) => l.exercise && l.exercise.trim().length > 0)
    ),
    hasQuizzes: modules.some((m) =>
      m.lessons?.some((l) => (l.quiz?.length || 0) > 0)
    ),
    hasResources: modules.some((m) =>
      m.lessons?.some((l) => (l.resources?.length || 0) > 0)
    ),
    lessonCount: modules.reduce((a, m) => a + (m.lessons?.length || 0), 0),
  };

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
              {hasModules ? modules.map((mod, i) => (
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
              )) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 text-destructive/50 mx-auto mb-2" />
                  <p className="text-sm font-medium mb-1">No modules found</p>
                  <p className="text-xs text-muted-foreground">Go back to the Modules & Lessons step to generate your curriculum first.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sales">
          <div className={`mx-auto border border-border rounded-xl overflow-hidden bg-card shadow-lg ${
            viewMode === "mobile" ? "max-w-sm" : "max-w-3xl"
          }`}>
            <SharedSalesCopyPreview
              data={salesCopy}
              productMeta={{
                badge: hasModules ? `${modules.length} Modules` : "Course",
                duration: hasModules ? `${Math.round(totalMinutes / 60)}h+ of content` : "",
              }}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Sales ↔ Curriculum mismatch validator */}
      {hasModules && hasSalesCopy && (
        <SalesCurriculumValidator
          salesCopy={salesCopy}
          curriculum={curriculumFacts}
          onGoToStep={goToStep}
        />
      )}

      {/* Abby's final review */}
      <Card className={`p-4 ${hasModules ? "border-secondary/20 bg-secondary/5" : "border-destructive/20 bg-destructive/5"}`}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${hasModules ? "bg-secondary/20" : "bg-destructive/10"}`}>
            {hasModules ? (
              <CheckCircle2 className="h-4 w-4 text-secondary" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
          </div>
          <div>
            <p className={`text-xs font-bold mb-1 ${hasModules ? "text-secondary" : "text-destructive"}`}>
              {hasModules ? "Abby's Final Review" : "Abby's Review — Action Needed"}
            </p>
            {hasModules ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your course covers <strong>{modules.length} modules</strong> with{" "}
                <strong>{curriculumFacts.lessonCount} lessons</strong>.
                Estimated completion time: <strong>{Math.round(totalMinutes / 60)} hours{totalMinutes % 60 > 0 ? ` ${totalMinutes % 60} minutes` : ""}</strong>.
                {foundation.exactPrice && ` At $${foundation.exactPrice}, with even 10 students per month, that's $${parseInt(foundation.exactPrice) * 10}/month in revenue.`}
                {" "}Everything looks solid — ready to publish!
              </p>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Your course has no modules yet.</strong> The sales page and student experience can't accurately represent your course without a curriculum.
                Go back to <strong>Step 2: Modules & Lessons</strong> to generate your curriculum first, then return here to preview and publish.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
