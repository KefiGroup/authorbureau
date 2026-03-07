export interface MembershipStepProps {
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

export interface MembershipTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  isMostPopular: boolean;
  benefits: MembershipBenefit[];
}

export interface MembershipBenefit {
  id: string;
  label: string;
  included: boolean;
}

export interface ContentDrop {
  id: string;
  title: string;
  type: ContentDropType;
  tierIds: string[];
  scheduledDate: string;
  isRecurring: boolean;
  content: string;
  edited?: boolean;
}

export type ContentDropType =
  | "blog-post"
  | "video"
  | "pdf-resource"
  | "live-session"
  | "community-prompt"
  | "exclusive-chapter";

export const CONTENT_DROP_LABELS: Record<ContentDropType, string> = {
  "blog-post": "Blog Post",
  video: "Video",
  "pdf-resource": "PDF Resource",
  "live-session": "Live Session",
  "community-prompt": "Community Prompt",
  "exclusive-chapter": "Exclusive Chapter",
};

export const DEFAULT_BENEFITS: Omit<MembershipBenefit, "id">[] = [
  { label: "Monthly content drops", included: true },
  { label: "Live Q&A sessions", included: false },
  { label: "Community access", included: true },
  { label: "Direct messaging", included: false },
  { label: "Exclusive resources", included: false },
  { label: "Early access to new products", included: false },
  { label: "Monthly coaching call", included: false },
  { label: "Discounts on other products", included: false },
];
