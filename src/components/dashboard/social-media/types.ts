export type ContentFormat = 
  | "carousel" 
  | "reel_script" 
  | "video_script" 
  | "image_caption" 
  | "text_post" 
  | "poll" 
  | "thread" 
  | "story_script";

export interface SocialPost {
  id: string;
  platform: string;
  caption: string;
  hashtags: string[];
  category: "tips" | "quotes" | "stories" | "promotions" | "engagement";
  format: ContentFormat;
  format_notes: string;
  hook: string;
  cta: string;
  image_prompt: string;
  video_shot_list: string;
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

export const FORMAT_LABELS: Record<ContentFormat, string> = {
  carousel: "📑 Carousel",
  reel_script: "🎬 Reel Script",
  video_script: "🎥 Video Script",
  image_caption: "📸 Image + Caption",
  text_post: "✍️ Text Post",
  poll: "📊 Poll",
  thread: "🧵 Thread",
  story_script: "📱 Story",
};

export const FORMAT_COLORS: Record<ContentFormat, string> = {
  carousel: "bg-indigo-500/10 text-indigo-700",
  reel_script: "bg-pink-500/10 text-pink-700",
  video_script: "bg-red-500/10 text-red-700",
  image_caption: "bg-teal-500/10 text-teal-700",
  text_post: "bg-slate-500/10 text-slate-700",
  poll: "bg-orange-500/10 text-orange-700",
  thread: "bg-cyan-500/10 text-cyan-700",
  story_script: "bg-violet-500/10 text-violet-700",
};

export const PLATFORM_ICONS: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  x: "X",
  facebook: "Facebook",
};

export const WIZARD_STEPS = [
  { label: "Setup Guide", description: "Create & optimize accounts" },
  { label: "Configure", description: "Set preferences" },
  { label: "Generating", description: "AI creates content" },
  { label: "Calendar Review", description: "Review & edit" },
  { label: "Bulk Edit", description: "Fine-tune posts" },
  { label: "Export & Publish", description: "Schedule & go live" },
];
