// Shared helpers for the BP-03 Native Social Media Kit (no Buffer)

export const PLATFORMS = ["linkedin", "instagram", "facebook", "twitter"] as const;
export type Platform = typeof PLATFORMS[number];

export const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "X / Twitter",
  x: "X / Twitter",
};

export const PLATFORM_DOT: Record<string, string> = {
  linkedin: "bg-[#0A66C2]",
  instagram: "bg-pink-500",
  facebook: "bg-[#1877F2]",
  twitter: "bg-foreground",
  x: "bg-foreground",
};

export const PLATFORM_CHAR_LIMIT: Record<string, number> = {
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
  twitter: 280,
  x: 280,
};

/**
 * Build a composer URL for the given platform.
 * Sprint 61 (Copy-Paste Factory): consistent UX across all platforms — we always
 * open the platform's home/compose page WITHOUT pre-filling, because pre-fill
 * works on LinkedIn, only partially on Facebook, and not at all on Instagram.
 * The author copies the caption from our card and pastes into the platform.
 */
export function composerUrl(platform: string, _text?: string): string {
  switch (platform) {
    case "linkedin":
      return "https://www.linkedin.com/feed/";
    case "facebook":
      return "https://www.facebook.com/";
    case "twitter":
    case "x":
      return "https://twitter.com/compose/post";
    case "instagram":
      return "https://www.instagram.com/";
    default:
      return "#";
  }
}

/** Day-of-week + date label for calendar items. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Build deterministic posting schedule from a start date + frequency. */
export type Frequency = "daily" | "every_2_days" | "every_3_days" | "weekly";

export function frequencyDays(f: Frequency): number {
  switch (f) {
    case "daily": return 1;
    case "every_2_days": return 2;
    case "every_3_days": return 3;
    case "weekly": return 7;
  }
}

export function computeScheduleDates(start: Date, count: number, frequency: Frequency): Date[] {
  const step = frequencyDays(frequency);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i * step);
    return d;
  });
}

/** Flatten the BP-03 content_json structure (1 day = 4 platform posts) into one row per platform-post. */
export interface FlatPost {
  index: number;          // 0..N
  day: number;            // 1..N (from generation)
  platform: Platform;
  caption: string;
  hashtags: string[];
  theme: string;
  post_type: string;
  cta_type?: string;
}

export function flattenPosts(content: any): FlatPost[] {
  const days: any[] = Array.isArray(content?.posts) ? content.posts : [];
  const flat: FlatPost[] = [];
  let idx = 0;
  for (const d of days) {
    for (const platform of PLATFORMS) {
      const p = d?.[platform];
      if (!p?.caption) continue;
      flat.push({
        index: idx++,
        day: Number(d.day) || 0,
        platform,
        caption: p.caption,
        hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
        theme: d.theme || "",
        post_type: d.post_type || "insight",
        cta_type: d.cta_type,
      });
    }
  }
  return flat;
}
