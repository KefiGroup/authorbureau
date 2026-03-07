export interface WebinarConfig {
  title: string;
  type: "lead_magnet" | "paid_workshop" | "masterclass_preview";
  duration: 45 | 60 | 90;
  format: "live" | "evergreen" | "hybrid";
  primaryCtaProduct: string;
  price: number;
}

export interface ScriptSection {
  id: string;
  label: string;
  timeStart: string;
  timeEnd: string;
  script: string;
  speakerNotes: string;
  slideRef: string;
  engagementPrompt: string;
  wordCount: number;
  estimatedMinutes: number;
}

export interface WebinarSlide {
  id: string;
  type: "title" | "content" | "quote" | "image" | "cta" | "pricing";
  title: string;
  body: string;
  imagePrompt: string;
  sectionRef: string;
}

export interface RegistrationPage {
  headline: string;
  description: string;
  dateTime: string;
  speakerBio: string;
  ctaText: string;
  bullets: string[];
}

export interface FollowUpEmail {
  id: string;
  type: "confirmation" | "reminder_24h" | "reminder_1h" | "starting_now" | "replay" | "offer_reminder" | "last_chance" | "no_show";
  subject: string;
  body: string;
}

export const WEBINAR_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  lead_magnet: { label: "Free Webinar", description: "Build your email list with a free value-packed session" },
  paid_workshop: { label: "Paid Workshop ($27-$97)", description: "Premium workshop with deep-dive content" },
  masterclass_preview: { label: "Masterclass Preview", description: "Teaser for your full course or membership" },
};

export const FORMAT_LABELS: Record<string, { label: string; description: string }> = {
  live: { label: "Live", description: "Present in real-time with audience interaction" },
  evergreen: { label: "Evergreen", description: "Recorded once, plays on a recurring schedule" },
  hybrid: { label: "Hybrid", description: "Live with an evergreen replay funnel" },
};

export const DEFAULT_SCRIPT_SECTIONS: Omit<ScriptSection, "script" | "speakerNotes" | "slideRef" | "engagementPrompt" | "wordCount" | "estimatedMinutes">[] = [
  { id: "hook", label: "Hook & Welcome", timeStart: "0:00", timeEnd: "5:00" },
  { id: "credibility", label: "Story & Credibility", timeStart: "5:00", timeEnd: "10:00" },
  { id: "content1", label: "Content Block 1", timeStart: "10:00", timeEnd: "20:00" },
  { id: "content2", label: "Content Block 2", timeStart: "20:00", timeEnd: "30:00" },
  { id: "content3", label: "Content Block 3", timeStart: "30:00", timeEnd: "40:00" },
  { id: "transition", label: "Transition to Offer", timeStart: "40:00", timeEnd: "45:00" },
  { id: "offer", label: "Offer Presentation", timeStart: "45:00", timeEnd: "55:00" },
  { id: "close", label: "Q&A & Close", timeStart: "55:00", timeEnd: "60:00" },
];

export const SLIDE_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  title: { label: "Title Slide", emoji: "🎯" },
  content: { label: "Content Slide", emoji: "📝" },
  quote: { label: "Quote Slide", emoji: "💬" },
  image: { label: "Image Slide", emoji: "🖼️" },
  cta: { label: "CTA Slide", emoji: "🔗" },
  pricing: { label: "Pricing Slide", emoji: "💰" },
};
