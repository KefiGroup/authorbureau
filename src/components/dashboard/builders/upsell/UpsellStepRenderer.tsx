import type { UpsellStepProps } from "./types";
import FunnelSetupStep from "./FunnelSetupStep";
import OfferBuilderStep from "./OfferBuilderStep";
import PageDesignStep from "./PageDesignStep";
import UpsellPublishStep from "./UpsellPublishStep";

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
