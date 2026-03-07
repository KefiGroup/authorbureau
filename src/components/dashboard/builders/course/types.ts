export interface CourseStepProps {
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

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  position: number;
  lessons: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  title: string;
  description: string;
  keyTakeaway: string;
  estimatedMinutes: number;
  position: number;
  script?: string;
  summary?: string[];
  exercise?: string;
  quiz?: CourseQuiz[];
  resources?: string[];
}

export interface CourseQuiz {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface EmailStep {
  id: string;
  dayNumber: number;
  subject: string;
  previewText: string;
  body: string;
  purpose: string;
}
