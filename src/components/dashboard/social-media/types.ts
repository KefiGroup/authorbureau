export interface SocialPost {
  id: string;
  platform: string;
  caption: string;
  hashtags: string[];
  category: "tips" | "quotes" | "stories" | "promotions" | "engagement";
  suggested_time: string;
  day_number: number;
  scheduled_date: string;
  status: "draft" | "approved" | "scheduled";
  ai_generated: boolean;
  edited: boolean;
}

export interface CalendarConfig {
  bookId: string;
  bookTitle: string;
  bookCoverUrl: string | null;
  platforms: string[];
  frequency: string;
  contentMix: Record<string, number>;
  tones: string[];
  duration: number;
  topicsEmphasize: string;
  topicsAvoid: string;
}

export const CATEGORY_COLORS: Record<string, string> = {
  tips: "bg-blue-500",
  quotes: "bg-amber-500",
  stories: "bg-purple-500",
  promotions: "bg-green-500",
  engagement: "bg-rose-500",
};

export const PLATFORM_ICONS: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  x: "X",
  facebook: "Facebook",
};

export const WIZARD_STEPS = [
  { label: "Configure", description: "Set preferences" },
  { label: "Generating", description: "AI creates content" },
  { label: "Calendar Review", description: "Review & edit" },
  { label: "Bulk Edit", description: "Fine-tune posts" },
  { label: "Approve & Publish", description: "Go live" },
];
