// Curated ElevenLabs voice catalogue for the Audiobook Studio.
// Voice IDs are the canonical, publicly-documented IDs from ElevenLabs.
export interface AudiobookVoice {
  id: string;
  name: string;
  gender: "male" | "female";
  style: string;
  bestFor: string;
}

export const AUDIOBOOK_VOICES: AudiobookVoice[] = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George",   gender: "male",   style: "Warm, authoritative",  bestFor: "Business, leadership, memoir" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger",    gender: "male",   style: "Conversational",        bestFor: "Self-help, podcasts" },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris",    gender: "male",   style: "Friendly, energetic",   bestFor: "How-to, motivational" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel",   gender: "male",   style: "Deep, narrative",       bestFor: "Fiction, thriller, history" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam",     gender: "male",   style: "Confident storyteller", bestFor: "Fiction, narrative non-fiction" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah",    gender: "female", style: "Calm, professional",    bestFor: "Wellness, business, instructional" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura",    gender: "female", style: "Bright, expressive",    bestFor: "YA, lifestyle, memoir" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda",  gender: "female", style: "Warm storyteller",      bestFor: "Fiction, romance, memoir" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice",    gender: "female", style: "Clear, articulate",     bestFor: "Non-fiction, education" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica",  gender: "female", style: "Conversational",        bestFor: "Self-help, lifestyle" },
];
