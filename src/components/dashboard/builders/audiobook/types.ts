export interface AudiobookStepProps {
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

export type NarrationType = "author" | "ai-voice" | "professional";

export interface AudioChapter {
  id: string;
  title: string;
  originalText: string;
  optimizedText: string;
  suggestions: AudioSuggestion[];
  status: "not-started" | "script-ready" | "audio-generated" | "reviewed";
  audioUrl?: string;
  estimatedMinutes?: number;
  narratorNotes?: string;
}

export interface AudioSuggestion {
  id: string;
  original: string;
  replacement: string;
  reason: string;
  accepted: boolean | null; // null = pending
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: "male" | "female";
  accent: string;
  tone: string;
  elevenLabsId: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "v1", name: "Sarah", gender: "female", accent: "American", tone: "Warm", elevenLabsId: "EXAVITQu4vr4xnSDxMaL" },
  { id: "v2", name: "George", gender: "male", accent: "British", tone: "Authoritative", elevenLabsId: "JBFqnCBsd6RMkjVDRZzb" },
  { id: "v3", name: "Laura", gender: "female", accent: "American", tone: "Conversational", elevenLabsId: "FGY2WhTYpPnrIDTdsKH5" },
  { id: "v4", name: "Brian", gender: "male", accent: "American", tone: "Energetic", elevenLabsId: "nPczCjzI2devNBz1zQrb" },
  { id: "v5", name: "Lily", gender: "female", accent: "British", tone: "Elegant", elevenLabsId: "pFZP5JQG7iQjIQuC4Bku" },
  { id: "v6", name: "Daniel", gender: "male", accent: "British", tone: "Conversational", elevenLabsId: "onwK4e9ZLuTAKqWW03F9" },
  { id: "v7", name: "Alice", gender: "female", accent: "British", tone: "Warm", elevenLabsId: "Xb7hH8MSUJpSbSDYk0k2" },
  { id: "v8", name: "Liam", gender: "male", accent: "American", tone: "Warm", elevenLabsId: "TX3LPaxmHKxFdv7VOQHJ" },
  { id: "v9", name: "Matilda", gender: "female", accent: "American", tone: "Authoritative", elevenLabsId: "XrExE9yKIg1WjnnlVkGX" },
  { id: "v10", name: "Chris", gender: "male", accent: "American", tone: "Conversational", elevenLabsId: "iP95p4xoKVk53GoZ742B" },
];
