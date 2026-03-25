import WebinarSetupStep from "./WebinarSetupStep";
import ScriptGeneratorStep from "./ScriptGeneratorStep";
import SlideDeckStep from "./SlideDeckStep";
import RegistrationFollowupStep from "./RegistrationFollowupStep";
import WebinarPublishStep from "./WebinarPublishStep";

interface Props {
  stepId: string;
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  plan: Record<string, any> | null;
  generationState: string;
  setGenerationState: (s: "idle" | "queued" | "analyzing" | "generating" | "complete" | "error") => void;
  userId: string;
}

export default function WebinarStepRenderer({
  stepId, stepData, setStepData, onMarkEdited,
  bookId, bookTitle, plan, generationState, setGenerationState, userId,
}: Props) {
  switch (stepId) {
    case "configure":
      return <WebinarSetupStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookTitle={bookTitle} plan={plan} />;
    case "script":
      return <ScriptGeneratorStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookId={bookId} bookTitle={bookTitle} plan={plan} generationState={generationState} setGenerationState={setGenerationState} />;
    case "slides":
      return <SlideDeckStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookTitle={bookTitle} />;
    case "registration":
      return <RegistrationFollowupStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookTitle={bookTitle} />;
    case "preview":
      return <WebinarPublishStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookId={bookId} bookTitle={bookTitle} userId={userId} plan={plan} />;
    default:
      return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
