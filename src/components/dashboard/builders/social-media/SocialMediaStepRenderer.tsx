import type { StepRendererProps } from "../shared/builder-types";
import SocialMediaSetupStep from "./SocialMediaSetupStep";
import ContentGenerationStep from "./ContentGenerationStep";
import VisualAssetsStep from "./VisualAssetsStep";
import HashtagCTAStep from "./HashtagCTAStep";
import SocialMediaPublishStep from "./SocialMediaPublishStep";

type Props = StepRendererProps;

export default function SocialMediaStepRenderer({
  stepId, stepData, setStepData, onMarkEdited,
  bookId, bookTitle, plan, generationState, setGenerationState, userId,
}: Props) {
  switch (stepId) {
    case "setup":
      return (
        <SocialMediaSetupStep
          stepData={stepData}
          setStepData={setStepData}
          onMarkEdited={onMarkEdited}
          bookTitle={bookTitle}
          plan={plan}
        />
      );
    case "generate":
      return (
        <ContentGenerationStep
          stepData={stepData}
          setStepData={setStepData}
          onMarkEdited={onMarkEdited}
          bookId={bookId}
          bookTitle={bookTitle}
          plan={plan}
          generationState={generationState}
          setGenerationState={setGenerationState}
          userId={userId}
        />
      );
    case "graphics":
      return (
        <VisualAssetsStep
          stepData={stepData}
          setStepData={setStepData}
          onMarkEdited={onMarkEdited}
          bookTitle={bookTitle}
        />
      );
    case "hashtags":
      return (
        <HashtagCTAStep
          stepData={stepData}
          setStepData={setStepData}
          onMarkEdited={onMarkEdited}
          bookTitle={bookTitle}
        />
      );
    case "publish":
      return (
        <SocialMediaPublishStep
          stepData={stepData}
          setStepData={setStepData}
          onMarkEdited={onMarkEdited}
          bookId={bookId}
          bookTitle={bookTitle}
          userId={userId}
          plan={plan}
        />
      );
    default:
      return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
