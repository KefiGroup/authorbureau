import type { StepRendererProps } from "../shared/builder-types";
import type { WorkbookStepProps } from "./types";
import WorkbookSetupStep from "./WorkbookSetupStep";
import WorkbookUploadStep from "./WorkbookUploadStep";

interface Props extends StepRendererProps {
  manuscriptSummary?: string;
  frameworks?: string;
}

export default function WorkbookStepRenderer(props: Props) {
  const shared: WorkbookStepProps = {
    stepData: props.stepData,
    setStepData: props.setStepData,
    onMarkEdited: props.onMarkEdited,
    bookId: props.bookId,
    bookTitle: props.bookTitle,
    plan: props.plan,
    generationState: props.generationState,
    setGenerationState: props.setGenerationState,
    userId: props.userId,
    manuscriptSummary: props.manuscriptSummary,
    frameworks: props.frameworks,
  };

  switch (props.stepId) {
    case "setup":
      return <WorkbookSetupStep {...shared} />;
    case "upload":
      return <WorkbookUploadStep {...shared} />;
    default:
      return <WorkbookSetupStep {...shared} />;
  }
}
