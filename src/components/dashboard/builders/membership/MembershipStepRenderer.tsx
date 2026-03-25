import type { MembershipStepProps } from "./types";
import MembershipSetupStep from "./MembershipSetupStep";
import TierBuilderStep from "./TierBuilderStep";
import ContentCalendarStep from "./ContentCalendarStep";
import SalesOnboardingStep from "./SalesOnboardingStep";
import MembershipPublishStep from "./MembershipPublishStep";

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

export default function MembershipStepRenderer(props: Props) {
  const shared: MembershipStepProps = {
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
      return <MembershipSetupStep {...shared} />;
    case "tiers":
      return <TierBuilderStep {...shared} />;
    case "content-calendar":
      return <ContentCalendarStep {...shared} />;
    case "sales-onboarding":
      return <SalesOnboardingStep {...shared} />;
    case "publish":
      return <MembershipPublishStep {...shared} />;
    default:
      return <MembershipSetupStep {...shared} />;
  }
}
