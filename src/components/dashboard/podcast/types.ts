export type EpisodeFormat = "solo_teaching" | "simulated_interview" | "deep_dive" | "quick_tips" | "book_launch";

export interface PodcastEpisode {
  id: string;
  episode_number: number;
  title: string;
  description: string;
  format: EpisodeFormat;
  script_markdown: string;
  show_notes: string;
  intro_script: string;
  outro_script: string;
  pull_quotes: string[];
  guest_questions: string[];
  ad_markers: { timestamp: string; type: "pre_roll" | "mid_roll" | "post_roll"; suggested_copy: string }[];
  duration_minutes: number;
  audio_url?: string;
  tts_voice_id?: string;
  tts_status: "pending" | "generating" | "complete" | "error";
  status: "draft" | "approved" | "published";
}

export interface PodcastConfig {
  bookId: string;
  bookTitle: string;
  bookCoverUrl: string | null;
  podcastTitle: string;
  episodeCount: number;
  formatPreference: "mix" | EpisodeFormat;
  tone: string;
  targetAudience: string;
  monetizationGoals: string[];
}

export const FORMAT_LABELS: Record<EpisodeFormat, string> = {
  solo_teaching: "🎤 Solo Teaching",
  simulated_interview: "🗣️ Interview Q&A",
  deep_dive: "📖 Deep Dive",
  quick_tips: "🔥 Quick Tips",
  book_launch: "📢 Launch Series",
};

export const FORMAT_COLORS: Record<EpisodeFormat, string> = {
  solo_teaching: "bg-blue-500/10 text-blue-700",
  simulated_interview: "bg-amber-500/10 text-amber-700",
  deep_dive: "bg-purple-500/10 text-purple-700",
  quick_tips: "bg-green-500/10 text-green-700",
  book_launch: "bg-rose-500/10 text-rose-700",
};

export const MONETIZATION_OPTIONS = [
  { id: "book_sales", label: "📚 Book Sales", desc: "Drive purchases via episode CTAs" },
  { id: "sponsorship", label: "💰 Sponsorship", desc: "Generate media kit & rate card" },
  { id: "lead_capture", label: "📧 Lead Capture", desc: "Grow email list via show notes" },
  { id: "course_upsell", label: "🎓 Course Upsell", desc: "Tease course content in episodes" },
  { id: "coaching", label: "🤝 Coaching Pipeline", desc: "Funnel listeners to coaching" },
  { id: "premium_content", label: "🔒 Premium Episodes", desc: "Bonus content behind paywall" },
  { id: "cross_promo", label: "🤝 Cross-Author Promo", desc: "JV episode swaps" },
];

export const WIZARD_STEPS = [
  { label: "Setup Guide", description: "Platform accounts" },
  { label: "Configure", description: "Set preferences" },
  { label: "Generating", description: "AI creates episodes" },
  { label: "Episode Editor", description: "Review & edit scripts" },
  { label: "Monetization Kit", description: "Sponsorship & revenue" },
  { label: "Export & Distribute", description: "Publish & schedule" },
];
