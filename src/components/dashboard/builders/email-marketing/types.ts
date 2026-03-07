export type EmailGoal = "build_list" | "nurture_sale" | "launch_product" | "ongoing_engagement";
export type EmailTone = "professional" | "conversational" | "inspirational" | "educational";
export type EmailFrequency = "daily" | "3x_week" | "weekly" | "bi_weekly";
export type SequenceType = "welcome" | "nurture" | "launch" | "re_engagement";

export interface EmailMarketingConfig {
  listName: string;
  leadMagnet: string;
  frequency: EmailFrequency;
  tone: EmailTone;
  primaryGoal: EmailGoal;
}

export interface EmailItem {
  id: string;
  sequenceType: SequenceType;
  position: number;
  subjectOptions: string[];
  selectedSubject: number;
  previewText: string;
  bodyMarkdown: string;
  ctaText: string;
  ctaLink: string;
  psLine: string;
  sendDay: number;
  sendTime: string;
  abTesting: boolean;
}

export interface EmailSequence {
  type: SequenceType;
  label: string;
  description: string;
  emails: EmailItem[];
}

export interface AutomationRule {
  id: string;
  trigger: string;
  condition?: string;
  action: string;
  delay?: number;
  isActive: boolean;
}

export const GOAL_LABELS: Record<EmailGoal, string> = {
  build_list: "📧 Build List",
  nurture_sale: "💰 Nurture to Sale",
  launch_product: "🚀 Launch Product",
  ongoing_engagement: "🔄 Ongoing Engagement",
};

export const TONE_LABELS: Record<EmailTone, string> = {
  professional: "Professional",
  conversational: "Conversational",
  inspirational: "Inspirational",
  educational: "Educational",
};

export const FREQUENCY_LABELS: Record<EmailFrequency, string> = {
  daily: "Daily (Launch)",
  "3x_week": "3× per week",
  weekly: "Weekly",
  bi_weekly: "Bi-weekly",
};

export const SEQUENCE_META: Record<SequenceType, { label: string; description: string; emailCount: number; spanDays: number; color: string }> = {
  welcome: { label: "Welcome Sequence", description: "7 emails over 14 days to onboard new subscribers", emailCount: 7, spanDays: 14, color: "bg-emerald-500/10 text-emerald-700" },
  nurture: { label: "Nurture Sequence", description: "12 emails over 6 weeks to build trust and authority", emailCount: 12, spanDays: 42, color: "bg-blue-500/10 text-blue-700" },
  launch: { label: "Product Launch", description: "7 emails over 7 days for a high-conversion launch", emailCount: 7, spanDays: 7, color: "bg-amber-500/10 text-amber-700" },
  re_engagement: { label: "Re-engagement", description: "3 emails to win back inactive subscribers", emailCount: 3, spanDays: 10, color: "bg-rose-500/10 text-rose-700" },
};

export const TRIGGER_OPTIONS = [
  "Subscribes to list",
  "Opens email",
  "Clicks link",
  "Purchases product",
  "Abandons cart",
  "Completes sequence",
  "Tag added",
];

export const ACTION_OPTIONS = [
  "Send email",
  "Wait X days",
  "Add tag",
  "Move to sequence",
  "Notify author",
  "Remove from sequence",
];
