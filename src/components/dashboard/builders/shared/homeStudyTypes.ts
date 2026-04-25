import type { BaseBuilderStepProps } from "./builder-types";

export interface HomeStudyStepProps extends BaseBuilderStepProps {
  onStartGeneration?: () => void;
  builderAct?: string;
  onNavigate?: (section: string) => void;
}

export interface StudyDay {
  id: string;
  dayNumber: number;
  weekNumber: number;
  theme: string;
  chapterRef: string;
  reading: string;
  concept: string;
  fieldAssignment?: string;
  accountabilityCheck?: string;
  microHabit?: string;
  exercise?: string;
  reflection?: string;
  actionPlan?: string;
  audioScript?: string;
  isCatchUp?: boolean;
}
