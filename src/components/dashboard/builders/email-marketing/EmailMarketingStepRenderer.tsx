import EmailStrategySetupStep from "./EmailStrategySetupStep";
import SequenceBuilderStep from "./SequenceBuilderStep";
import EmailContentStep from "./EmailContentStep";
import AutomationRulesStep from "./AutomationRulesStep";
import EmailPublishStep from "./EmailPublishStep";

interface Props {
  stepId: string;
  stepData: Record<string, any>;
  setStepData: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onMarkEdited: (id: string) => void;
  bookId: string;
  bookTitle: string;
  plan: Record<string, any> | null;
  generationState: string;
  setGenerationState: (state: any) => void;
  userId: string;
}

export default function EmailMarketingStepRenderer({
  stepId, stepData, setStepData, onMarkEdited, bookId, bookTitle, plan, userId,
}: Props) {
  switch (stepId) {
    case "setup":
      return <EmailStrategySetupStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookTitle={bookTitle} plan={plan} />;
    case "sequences":
      return <SequenceBuilderStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookId={bookId} bookTitle={bookTitle} userId={userId} />;
    case "content":
      return <EmailContentStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} />;
    case "automation":
      return <AutomationRulesStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} plan={plan} />;
    case "publish":
      return <EmailPublishStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookTitle={bookTitle} />;
    default:
      return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
