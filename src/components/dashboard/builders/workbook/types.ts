export interface WorkbookStepProps {
  stepData: Record<string, any>;
  setStepData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onMarkEdited: (stepId: string) => void;
  bookId: string;
  bookTitle: string;
  plan: any;
  generationState: "idle" | "queued" | "analyzing" | "generating" | "complete" | "error";
  setGenerationState: (s: "idle" | "queued" | "analyzing" | "generating" | "complete" | "error") => void;
  userId: string;
  manuscriptSummary?: string;
  frameworks?: string;
}

export interface WorkbookSection {
  id: string;
  chapterRef: string;
  title: string;
  position: number;
  contentTypes: ContentType[];
  intro: string;
  elements: WorkbookElement[];
  takeaway: string;
}

export type ContentType =
  | "reflection"
  | "exercise"
  | "checklist"
  | "action-plan"
  | "template"
  | "self-assessment"
  | "goal-setting";

export interface WorkbookElement {
  id: string;
  type: ContentType;
  title: string;
  content: string;
  edited?: boolean;
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  reflection: "Reflection",
  exercise: "Exercise",
  checklist: "Checklist",
  "action-plan": "Action Plan",
  template: "Template",
  "self-assessment": "Self-Assessment",
  "goal-setting": "Goal Setting",
};

export const DESIGN_TEMPLATES = [
  { id: "clean", label: "Clean", desc: "Modern, airy layout with plenty of white space" },
  { id: "bold", label: "Bold", desc: "Strong typography and vibrant accent colors" },
  { id: "elegant", label: "Elegant", desc: "Serif fonts with refined gold accents" },
  { id: "playful", label: "Playful", desc: "Rounded corners, colorful icons, friendly feel" },
  { id: "professional", label: "Professional", desc: "Corporate-ready with structured grids" },
  { id: "minimal", label: "Minimal", desc: "Ultra-simple, text-first design" },
];
