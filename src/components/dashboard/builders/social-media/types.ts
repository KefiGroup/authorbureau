export interface SocialMediaConfig {
  platforms: string[];
  frequency: Record<string, string>; // platform -> frequency
  contentPillars: string[];
  tone: string;
  duration: number; // 30, 60, or 90
}

export interface SocialMediaPost {
  id: string;
  platform: string;
  date: string;
  caption: string;
  contentType: "quote" | "tip" | "story" | "cta" | "bts";
  hashtags: string[];
  ctaLink: string;
  ctaLabel: string;
  imagePrompt: string;
  imageUrl: string | null;
  status: "draft" | "approved" | "scheduled";
  edited: boolean;
}

export const CONTENT_TYPE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  quote: { label: "Quote", emoji: "💬", color: "bg-amber-500/10 text-amber-700" },
  tip: { label: "Tip", emoji: "💡", color: "bg-blue-500/10 text-blue-700" },
  story: { label: "Story", emoji: "📖", color: "bg-purple-500/10 text-purple-700" },
  cta: { label: "CTA", emoji: "🔗", color: "bg-green-500/10 text-green-700" },
  bts: { label: "Behind-the-scenes", emoji: "🎬", color: "bg-rose-500/10 text-rose-700" },
};

export const PLATFORM_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  linkedin: { label: "LinkedIn", icon: "Linkedin", color: "bg-blue-600" },
  instagram: { label: "Instagram", icon: "Instagram", color: "bg-gradient-to-br from-purple-500 to-pink-500" },
  facebook: { label: "Facebook", icon: "Facebook", color: "bg-blue-500" },
  x: { label: "X / Twitter", icon: "Twitter", color: "bg-foreground" },
  tiktok: { label: "TikTok", icon: "Video", color: "bg-black" },
};

export const TONE_OPTIONS = [
  "Professional",
  "Conversational",
  "Inspirational",
  "Educational",
  "Mix",
];

export const SUGGESTED_PILLARS = [
  "Key Insights",
  "Personal Stories",
  "Reader Questions",
  "Behind the Book",
  "Actionable Tips",
  "Motivational Quotes",
  "Industry Trends",
  "Book Excerpts",
];
