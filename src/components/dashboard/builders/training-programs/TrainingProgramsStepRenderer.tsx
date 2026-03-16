/**
 * Training Program Step Renderer
 * 
 * Reuses the pedagogical course components (CurriculumBuilderStep, WorkshopScheduleStep, etc.)
 * but targets the training_programs table for premium facilitated workshops ($497-$2,997).
 */

import CourseFoundationStep from "../course/TrainingFoundationStep";
import CurriculumBuilderStep from "../course/CurriculumBuilderStep";
import LessonContentStep from "../course/LessonContentStep";
import CourseMaterialsStep from "../course/CourseMaterialsStep";
import WorkshopScheduleStep from "../course/WorkshopScheduleStep";
import SalesPageStep from "../course/SalesPageStep";
import EmailSequenceStep from "../course/EmailSequenceStep";
import CoursePreviewStep from "../course/CoursePreviewStep";
import type { CourseStepProps } from "../course/types";

interface Props extends CourseStepProps {
  stepId: string;
}

export default function TrainingProgramsStepRenderer({ stepId, ...props }: Props) {
  switch (stepId) {
    case "foundation":
      return <CourseFoundationStep {...props} />;
    case "curriculum":
      return <CurriculumBuilderStep {...props} />;
    case "content":
      return <LessonContentStep {...props} />;
    case "materials":
      return <CourseMaterialsStep {...props} />;
    case "schedule":
      return <WorkshopScheduleStep {...props} />;
    case "sales-page":
      return <SalesPageStep {...props} />;
    case "email-sequence":
      return <EmailSequenceStep {...props} />;
    case "preview":
      return <CoursePreviewStep {...props} />;
    default:
      return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
