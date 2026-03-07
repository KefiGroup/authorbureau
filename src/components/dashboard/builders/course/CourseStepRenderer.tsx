import type { CourseStepProps } from "./types";
import CourseFoundationStep from "./CourseFoundationStep";
import CurriculumBuilderStep from "./CurriculumBuilderStep";
import LessonContentStep from "./LessonContentStep";
import CourseMaterialsStep from "./CourseMaterialsStep";
import SalesPageStep from "./SalesPageStep";
import EmailSequenceStep from "./EmailSequenceStep";
import CoursePreviewStep from "./CoursePreviewStep";

interface Props extends CourseStepProps {
  stepId: string;
}

export default function CourseStepRenderer({ stepId, ...props }: Props) {
  switch (stepId) {
    case "foundation":
      return <CourseFoundationStep {...props} />;
    case "curriculum":
      return <CurriculumBuilderStep {...props} />;
    case "content":
      return <LessonContentStep {...props} />;
    case "materials":
      return <CourseMaterialsStep {...props} />;
    case "sales-page":
      return <SalesPageStep {...props} />;
    case "email-sequence":
      return <EmailSequenceStep {...props} />;
    case "preview":
      return <CoursePreviewStep {...props} />;
    default:
      return null;
  }
}
