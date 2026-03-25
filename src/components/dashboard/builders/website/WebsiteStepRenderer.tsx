import type { StepRendererProps } from "../shared/builder-types";
import WebsiteSetupStep from "./WebsiteSetupStep";
import PageBuilderStep from "./PageBuilderStep";
import ProductIntegrationStep from "./ProductIntegrationStep";
import SeoAnalyticsStep from "./SeoAnalyticsStep";
import WebsitePublishStep from "./WebsitePublishStep";

type Props = StepRendererProps;

export default function WebsiteStepRenderer({
  stepId, stepData, setStepData, onMarkEdited,
  bookId, bookTitle, plan, generationState, setGenerationState, userId,
}: Props) {
  switch (stepId) {
    case "setup":
      return <WebsiteSetupStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookTitle={bookTitle} plan={plan} />;
    case "pages":
      return <PageBuilderStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookId={bookId} bookTitle={bookTitle} plan={plan} generationState={generationState} setGenerationState={setGenerationState} />;
    case "products":
      return <ProductIntegrationStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookTitle={bookTitle} plan={plan} />;
    case "seo":
      return <SeoAnalyticsStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookTitle={bookTitle} />;
    case "publish":
      return <WebsitePublishStep stepData={stepData} setStepData={setStepData} onMarkEdited={onMarkEdited} bookId={bookId} bookTitle={bookTitle} userId={userId} plan={plan} />;
    default:
      return <div className="text-sm text-muted-foreground">Unknown step: {stepId}</div>;
  }
}
