import type { GenerationAct } from "@/hooks/useBuilderGeneration";
import type { BaseBuilderStepProps } from "../shared/builder-types";

export interface CourseStepProps extends BaseBuilderStepProps {
  onStartGeneration?: () => void;
  builderAct?: GenerationAct;
  manuscriptSummary?: string;
  frameworks?: string;
  goToStep?: (stepIndex: number) => void;
}

/** A pedagogical module for the facilitated workshop */
export interface CourseModule {
  id: string;
  moduleNumber: number;
  title: string;
  description: string;
  bloomsLevel: string;
  kolbsStage: string;
  learningObjectives: string[];
  contentSummary: string;
  facilitatorActivity: string;
  debriefPoints: string[];
  workbookPageDescription: string;
  durationMinutes: number;
  sourceChapters: string[];
  position: number;
  // Legacy compat
  lessons?: CourseLesson[];
}

export interface CourseResource {
  title: string;
  url: string;
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
  resources?: CourseResource[];
  videoUrl?: string;
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

export interface WorkshopTimeBlock {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
  type: "module" | "break" | "opening" | "closing" | "checkin";
  moduleNumber?: number;
}

export interface WorkshopDay {
  dayNumber: number;
  label: string;
  blocks: WorkshopTimeBlock[];
}
