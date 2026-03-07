import type { HomeStudyStepProps } from "./types";
import ProgramSetupStep from "./ProgramSetupStep";
import DailyScheduleStep from "./DailyScheduleStep";
import DailyContentStep from "./DailyContentStep";
import MaterialsStep from "./MaterialsStep";
import HomeStudyPreviewStep from "./HomeStudyPreviewStep";

interface Props extends HomeStudyStepProps {
  stepId: string;
}

export default function HomeStudyStepRenderer({ stepId, ...props }: Props) {
  switch (stepId) {
    case "setup":
      return <ProgramSetupStep {...props} />;
    case "schedule":
      return <DailyScheduleStep {...props} />;
    case "content":
      return <DailyContentStep {...props} />;
    case "materials":
      return <MaterialsStep {...props} />;
    case "preview":
      return <HomeStudyPreviewStep {...props} />;
    default:
      return null;
  }
}
