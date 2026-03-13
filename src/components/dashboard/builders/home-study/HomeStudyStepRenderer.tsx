import type { HomeStudyStepProps } from "./types";
import ProgramSetupStep from "./ProgramSetupStep";
import HomeStudyEditPublishStep from "./HomeStudyEditPublishStep";

interface Props extends HomeStudyStepProps {
  stepId: string;
}

export default function HomeStudyStepRenderer({ stepId, ...props }: Props) {
  switch (stepId) {
    case "setup":
      return <ProgramSetupStep {...props} />;
    case "edit":
      return <HomeStudyEditPublishStep {...props} />;
    default:
      return <HomeStudyEditPublishStep {...props} />;
  }
}
