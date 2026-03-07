export type PackageStructure = "single" | "4-pack" | "8-pack" | "12-week";
export type SessionDuration = "30" | "45" | "60" | "90";
export type DeliveryMode = "video" | "phone" | "in-person" | "hybrid";

export interface CoachingConfig {
  packageName: string;
  focusArea: string;
  structure: PackageStructure;
  sessionDuration: SessionDuration;
  price: number;
  deliveryMode: DeliveryMode;
}

export interface SessionPlan {
  id: string;
  sessionNumber: number;
  theme: string;
  chapterRef: string;
  objectives: string[];
  discussionQuestions: string[];
  exercise: string;
  homework: string;
  progressCheckpoint: string;
}

export interface ClientMaterial {
  id: string;
  type: "intake_form" | "welcome_packet" | "session_notes" | "progress_tracker" | "agreement" | "certificate";
  label: string;
  contentMarkdown: string;
  generated: boolean;
}

export interface BookingConfig {
  discoveryCallScript: string;
  salesPageCopy: string;
  applicationForm: string;
  followUpSequence: string;
  availableSlots: string[];
}

export const STRUCTURE_LABELS: Record<PackageStructure, { label: string; sessions: number; priceRange: string }> = {
  single: { label: "Single Session", sessions: 1, priceRange: "$150–$500" },
  "4-pack": { label: "4-Session Package", sessions: 4, priceRange: "$497–$1,497" },
  "8-pack": { label: "8-Session Package", sessions: 8, priceRange: "$997–$2,497" },
  "12-week": { label: "12-Week Program", sessions: 12, priceRange: "$1,997–$4,997" },
};

export const DURATION_LABELS: Record<SessionDuration, string> = {
  "30": "30 minutes",
  "45": "45 minutes",
  "60": "60 minutes",
  "90": "90 minutes",
};

export const DELIVERY_LABELS: Record<DeliveryMode, { label: string; icon: string }> = {
  video: { label: "Video Call", icon: "Video" },
  phone: { label: "Phone", icon: "Phone" },
  "in-person": { label: "In-Person", icon: "MapPin" },
  hybrid: { label: "Hybrid", icon: "Layers" },
};

export const CLIENT_MATERIAL_TYPES: Array<{ type: ClientMaterial["type"]; label: string; description: string }> = [
  { type: "intake_form", label: "Client Intake Form", description: "Goals, challenges, expectations, and background" },
  { type: "welcome_packet", label: "Welcome Packet", description: "What to expect, how to prepare, logistics" },
  { type: "session_notes", label: "Session Notes Template", description: "Structured template for session documentation" },
  { type: "progress_tracker", label: "Progress Tracker", description: "Visual tracker for client milestones and goals" },
  { type: "agreement", label: "Coaching Agreement", description: "Terms of service, cancellation policy, confidentiality" },
  { type: "certificate", label: "Completion Certificate", description: "Certificate of program completion" },
];
