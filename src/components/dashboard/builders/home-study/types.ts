export interface HomeStudyStepProps {
  stepData: Record<string, any>;
  setStepData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onMarkEdited: (stepId: string) => void;
  bookId: string;
  bookTitle: string;
  plan: any;
  generationState: "idle" | "queued" | "analyzing" | "generating" | "complete" | "error";
  setGenerationState: (s: "idle" | "queued" | "analyzing" | "generating" | "complete" | "error") => void;
  userId: string;
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
  exercise: string;
  reflection: string;
  actionPlan?: string;
  audioScript?: string;
  isCatchUp?: boolean;
}
