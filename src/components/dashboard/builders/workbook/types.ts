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
  chapterRef?: string;
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

export const CONTENT_TYPE_DESCRIPTIONS: Record<ContentType, string> = {
  reflection: "Thought-provoking questions that help readers connect chapter concepts to their own experiences.",
  exercise: "Hands-on activities where readers practice applying what they've learned through guided tasks.",
  checklist: "Step-by-step lists readers can tick off to ensure they've covered all key actions from the chapter.",
  "action-plan": "Structured planning prompts that help readers map out concrete next steps and timelines.",
  template: "Ready-to-use frameworks or fill-in-the-blank worksheets readers can adapt to their situation.",
  "self-assessment": "Rating scales or diagnostic questions to help readers evaluate where they stand on key topics.",
  "goal-setting": "Guided prompts for defining specific, measurable goals based on the chapter's teachings.",
};

export const DESIGN_TEMPLATES = [
  { id: "clean", label: "Clean", desc: "Modern, airy layout with plenty of white space" },
  { id: "bold", label: "Bold", desc: "Strong typography and vibrant accent colors" },
  { id: "elegant", label: "Elegant", desc: "Serif fonts with refined gold accents" },
  { id: "playful", label: "Playful", desc: "Rounded corners, colorful icons, friendly feel" },
  { id: "professional", label: "Professional", desc: "Corporate-ready with structured grids" },
  { id: "minimal", label: "Minimal", desc: "Ultra-simple, text-first design" },
];
