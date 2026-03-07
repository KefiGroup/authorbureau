import CoachingSetupStep from "./CoachingSetupStep";
import SessionFrameworkStep from "./SessionFrameworkStep";
import ClientMaterialsStep from "./ClientMaterialsStep";
import BookingSalesStep from "./BookingSalesStep";
import CoachingPublishStep from "./CoachingPublishStep";

interface Props {
  stepId: string;
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  plan: any;
  generationState: string;
  setGenerationState: (state: any) => void;
  userId: string;
}

export default function CoachingStepRenderer({
  stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId,
}: Props) {
  switch (stepId) {
    case "packages":
      return <CoachingSetupStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookTitle={bookTitle} plan={plan} />;
    case "intake":
      return <SessionFrameworkStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookId={bookId} bookTitle={bookTitle} userId={userId} />;
    case "curriculum":
      return <ClientMaterialsStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookId={bookId} bookTitle={bookTitle} userId={userId} />;
    case "sales-page":
      return <BookingSalesStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookId={bookId} bookTitle={bookTitle} userId={userId} />;
    case "preview":
      return <CoachingPublishStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookTitle={bookTitle} />;
    default:
      return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
