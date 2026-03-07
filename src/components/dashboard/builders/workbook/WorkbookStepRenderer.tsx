import type { WorkbookStepProps } from "./types";
import WorkbookSetupStep from "./WorkbookSetupStep";
import ChapterMappingStep from "./ChapterMappingStep";
import ContentGeneratorStep from "./ContentGeneratorStep";
import DesignPreviewStep from "./DesignPreviewStep";
import WorkbookPublishStep from "./WorkbookPublishStep";

interface Props {
  stepId: string;
  stepData: Record<string, any>;
  setStepData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onMarkEdited: (stepId: string) => void;
  bookId: string;
  bookTitle: string;
  plan: any;
  generationState: "idle" | "queued" | "analyzing" | "generating" | "complete" | "error";
  setGenerationState: (s: "idle" | "queued" | "analyzing" | "generating" | "complete" | "error") => void;
  userId: string;
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
  };

  switch (props.stepId) {
    case "setup":
      return <WorkbookSetupStep {...shared} />;
    case "mapping":
      return <ChapterMappingStep {...shared} />;
    case "content":
      return <ContentGeneratorStep {...shared} />;
    case "design":
      return <DesignPreviewStep {...shared} />;
    case "publish":
      return <WorkbookPublishStep {...shared} />;
    default:
      return <WorkbookSetupStep {...shared} />;
  }
}
