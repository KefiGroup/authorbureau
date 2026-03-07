export type EpisodeFormat = "solo" | "interview" | "co-hosted" | "mix";
export type EpisodeLength = "15-20" | "20-30" | "30-45" | "45-60";
export type PublishSchedule = "weekly" | "bi-weekly" | "daily";

export interface PodcastScriptsConfig {
  podcastName: string;
  tagline: string;
  format: EpisodeFormat;
  episodeLength: EpisodeLength;
  episodeCount: number;
  publishSchedule: PublishSchedule;
}

export interface EpisodeCard {
  id: string;
  episodeNumber: number;
  title: string;
  sourceChapters: string[];
  keyTopic: string;
  guestSuggestion?: string;
  type: "regular" | "trailer" | "recap" | "finale";
}

export interface ScriptSection {
  id: string;
  label: string;
  timeMarker: string;
  durationSeconds: number;
  scriptText: string;
  speakerNotes: string;
  actionItem?: string;
  bookQuotes: string[];
  cta?: string;
}

export interface EpisodeScript {
  episodeId: string;
  sections: ScriptSection[];
  showNotes: string;
  wordCount: number;
  estimatedMinutes: number;
}

export interface GuestGuide {
  episodeId: string;
  suggestedGuest: string;
  researchBrief: string;
  questions: string[];
  talkingPoints: string[];
  guestBioTemplate: string;
  outreachEmail: string;
}

export const FORMAT_LABELS: Record<EpisodeFormat, string> = {
  solo: "🎤 Solo",
  interview: "🗣️ Interview",
  "co-hosted": "👥 Co-hosted",
  mix: "🔀 Mix",
};

export const LENGTH_LABELS: Record<EpisodeLength, string> = {
  "15-20": "15-20 min",
  "20-30": "20-30 min",
  "30-45": "30-45 min",
  "45-60": "45-60 min",
};

export const SCHEDULE_LABELS: Record<PublishSchedule, string> = {
  weekly: "Weekly",
  "bi-weekly": "Bi-weekly",
  daily: "Daily (Launch)",
};
