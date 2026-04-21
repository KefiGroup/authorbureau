import { BookOpen } from "lucide-react";
import type { AuthorTheme } from "@/lib/author-themes";

export interface AuthorData {
  id: string;
  user_id: string;
  pen_name: string | null;
  bio_short: string | null;
  bio_long: string | null;
  tagline: string | null;
  photo_url: string | null;
  cover_photo_url: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  amazon_author_profile_url: string | null;
  author_slug: string | null;
  genres: string[] | null;
  is_speaker: boolean | null;
  credentials: unknown[] | null;
  site_theme: string | null;
  location_city: string | null;
  location_country: string | null;
  stripe_connected_account_id?: string | null;
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: boolean | null;
}

export interface BookWithProducts {
  id: string;
  title: string;
  subtitle: string | null;
  cover_image_url: string | null;
  description: string | null;
  amazon_url: string | null;
  price: string | null;
  kindle_price: string | null;
  paperback_price: string | null;
  genre: string | null;
  slug: string;
  badges: string[] | null;
  rating: number | null;
  products: ProductLink[];
}

export interface ProductLink {
  id: string;
  title: string;
  type: "home_study" | "course" | "coaching" | "audiobook" | "podcast";
  price: number | null;
  currency: string | null;
  description?: string | null;
  bookSlug?: string;
}

export interface RelatedAuthor {
  author_slug: string;
  pen_name: string;
  photo_url: string | null;
  genres: string[] | null;
}

export interface CoachingService {
  id: string;
  title: string;
  price: number | null;
  currency: string | null;
  description: string | null;
  duration_minutes: number | null;
  sessions_count: number | null;
}

export interface ThemeVars {
  primary: string;
  primaryText: string;
  accent: string;
  accentText: string;
  cardBg: string;
  cardBorder: string;
  secondaryBg: string;
  headingText: string;
  bodyText: string;
  mutedText: string;
  [key: string]: string;
}

export const PRODUCT_ICONS: Record<string, typeof BookOpen> = {
  home_study: BookOpen,
};

export const PRODUCT_LABELS: Record<string, string> = {
  home_study: "Home Study Course",
  course: "Online Course",
  coaching: "Coaching",
  audiobook: "Audiobook",
  podcast: "Podcast",
};

export const PRODUCT_ROUTES: Record<string, string> = {
  home_study: "homestudy",
  course: "onlinecourse",
  coaching: "coaching",
  audiobook: "audiobook",
  podcast: "podcast",
};

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

export function getLowestPrice(book: BookWithProducts): string | null {
  const prices = [book.kindle_price, book.paperback_price, book.price].filter(Boolean) as string[];
  if (prices.length === 0) return null;
  const nums = prices.map(p => parseFloat(p.replace(/[^0-9.]/g, ""))).filter(n => !isNaN(n));
  if (nums.length === 0) return prices[0];
  const min = Math.min(...nums);
  return `$${min.toFixed(2)}`;
}
