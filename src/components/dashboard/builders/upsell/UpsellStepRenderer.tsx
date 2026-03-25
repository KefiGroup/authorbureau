import type { StepRendererProps } from "../shared/builder-types";
import type { UpsellStepProps } from "./types";
import FunnelSetupStep from "./FunnelSetupStep";
import OfferBuilderStep from "./OfferBuilderStep";
import PageDesignStep from "./PageDesignStep";
import UpsellPublishStep from "./UpsellPublishStep";

type Props = StepRendererProps;

export default function UpsellStepRenderer(props: Props) {
  const shared: UpsellStepProps = {
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
      return <FunnelSetupStep {...shared} />;
    case "offer":
      return <OfferBuilderStep {...shared} />;
    case "design":
      return <PageDesignStep {...shared} />;
    case "publish":
      return <UpsellPublishStep {...shared} />;
    default:
      return <FunnelSetupStep {...shared} />;
  }
}
