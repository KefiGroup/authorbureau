import AudiobookSetupStep from "./AudiobookSetupStep";
import ManuscriptOptimizationStep from "./ManuscriptOptimizationStep";
import VoiceSelectionStep from "./VoiceSelectionStep";
import ChapterProductionStep from "./ChapterProductionStep";
import AudiobookPublishStep from "./AudiobookPublishStep";

interface Props {
  stepId: string;
  stepData: Record<string, any>;
  setStepData: (data: Record<string, any>) => void;
  onMarkEdited: (stepId: string) => void;
  bookId: string;
  bookTitle: string;
  plan: unknown;
  generationState: string;
  setGenerationState: (s: any) => void;
  userId: string;
}

export default function AudiobookStepRenderer(props: Props) {
  const { stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, userId } = props;

  switch (stepId) {
    case "setup":
      return (
        <AudiobookSetupStep
          stepData={stepData}
          setStepData={setStepData}
          onMarkEdited={onMarkEdited}
          bookId={bookId}
          bookTitle={bookTitle}
          userId={userId}
        />
      );
    case "optimize":
      return (
        <ManuscriptOptimizationStep
          stepData={stepData}
          setStepData={setStepData}
          onMarkEdited={onMarkEdited}
          bookId={bookId}
          bookTitle={bookTitle}
        />
      );
    case "voice":
      return (
        <VoiceSelectionStep
          stepData={stepData}
          setStepData={setStepData}
          onMarkEdited={onMarkEdited}
        />
      );
    case "production":
      return (
        <ChapterProductionStep
          stepData={stepData}
          setStepData={setStepData}
          onMarkEdited={onMarkEdited}
          bookId={bookId}
        />
      );
    case "publish":
      return (
        <AudiobookPublishStep
          stepData={stepData}
          setStepData={setStepData}
          onMarkEdited={onMarkEdited}
          bookId={bookId}
          bookTitle={bookTitle}
          userId={userId}
        />
      );
    default:
      return <p className="text-sm text-muted-foreground">Unknown step: {stepId}</p>;
  }
}
