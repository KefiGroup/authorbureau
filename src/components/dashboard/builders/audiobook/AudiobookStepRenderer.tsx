import type { AudiobookStepProps } from "./types";
import AudiobookSetupStep from "./AudiobookSetupStep";
import ManuscriptOptimizationStep from "./ManuscriptOptimizationStep";
import VoiceSelectionStep from "./VoiceSelectionStep";
import ChapterProductionStep from "./ChapterProductionStep";
import AudiobookPublishStep from "./AudiobookPublishStep";

interface Props {
  stepId: string;
  stepData: Record<string, any>;
  setStepData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onMarkEdited: (stepId: string) => void;
  bookId: string;
  bookTitle: string;
  plan: Record<string, any> | null;
  generationState: "idle" | "queued" | "analyzing" | "generating" | "complete" | "error";
  setGenerationState: (s: "idle" | "queued" | "analyzing" | "generating" | "complete" | "error") => void;
  userId: string;
}

export default function AudiobookStepRenderer(props: Props) {
  const shared: AudiobookStepProps = {
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
    case "setup": return <AudiobookSetupStep {...shared} />;
    case "optimize": return <ManuscriptOptimizationStep {...shared} />;
    case "voice": return <VoiceSelectionStep {...shared} />;
    case "production": return <ChapterProductionStep {...shared} />;
    case "publish": return <AudiobookPublishStep {...shared} />;
    default: return <AudiobookSetupStep {...shared} />;
  }
}
