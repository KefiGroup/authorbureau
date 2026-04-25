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

/** Node ID prefixes that represent book *formats* (not standalone services).
 *  These render under their parent book card, never in "Work With Me". */
export const BOOK_FORMAT_NODE_PREFIXES = ["BA-11", "BP-06", "BP-08", "BA-17"] as const;

export function isBookFormatNode(nodeId: string): boolean {
  return BOOK_FORMAT_NODE_PREFIXES.some(p => nodeId.startsWith(p));
}

export function isCollectorsEditionNode(nodeId: string): boolean {
  return nodeId.startsWith("BP-08");
}

/** Lightweight node shape used by format/collector helpers (subset of LiveNode). */
export interface BookFormatNode {
  id: string;
  node_id: string;
  node_name: string;
  personalised_name: string | null;
  content_json: Record<string, unknown> | null;
  microsite_url: string | null;
  payment_link: string | null;
  third_party_url: string | null;
  price_usd?: number | null;
  currency?: string | null;
}

/** Returns true if a node belongs to a given book.
 *  Checks (in order):
 *    1. The top-level `book_id` column on author_nodes (canonical)
 *    2. content_json.book_id (legacy / Abby-generated payloads)
 *    3. content_json.book_slug (legacy)
 *  If NONE of these are set, the node is unscoped — it MUST NOT render under
 *  any specific book card (otherwise the same workbook appears under every
 *  book and causes cross-contamination). Author-level sections like Work With
 *  Me handle unscoped nodes separately. */
export function nodeBelongsToBook(
  node: { content_json: Record<string, unknown> | null; book_id?: string | null },
  book: { id: string; slug: string }
): boolean {
  if (node.book_id && node.book_id === book.id) return true;
  const cj = node.content_json || {};
  const bookId = cj.book_id as string | undefined;
  const bookSlug = cj.book_slug as string | undefined;
  if (bookId && book.id === bookId) return true;
  if (bookSlug && book.slug === bookSlug) return true;
  return false;
}

export function getFormatsForBook<T extends BookFormatNode>(
  nodes: T[],
  book: { id: string; slug: string }
): T[] {
  return nodes.filter(
    n =>
      ["BA-11", "BP-06", "BA-17"].some(p => n.node_id.startsWith(p)) &&
      nodeBelongsToBook(n, book)
  );
}

export function getCollectorsEditionsForBook<T extends BookFormatNode>(
  nodes: T[],
  book: { id: string; slug: string }
): T[] {
  return nodes.filter(n => n.node_id.startsWith("BP-08") && nodeBelongsToBook(n, book));
}

/** Occasion templates for BP-08 collectible / special editions.
 *  `peakWindow` is the [start, end] order-by window expressed as MM-DD strings;
 *  `cutoffMonthDay` is the recommended order-by date for delivery. */
export interface OccasionTemplate {
  key: string;
  label: string;
  emoji: string;
  /** Tailwind-safe HSL accent (used as inline style only). */
  accent: string;
  cutoffMonthDay: string; // "MM-DD"
  blurb: string;
}

export const OCCASION_TEMPLATES: Record<string, OccasionTemplate> = {
  valentines: { key: "valentines", label: "Valentine's Day", emoji: "💝", accent: "351 75% 55%", cutoffMonthDay: "02-10", blurb: "A heartfelt gift for the reader you love." },
  mothers_day: { key: "mothers_day", label: "Mother's Day", emoji: "🌷", accent: "330 70% 60%", cutoffMonthDay: "05-05", blurb: "A keepsake edition for the woman who shaped you." },
  fathers_day: { key: "fathers_day", label: "Father's Day", emoji: "🎁", accent: "210 60% 45%", cutoffMonthDay: "06-10", blurb: "A signed edition worthy of his shelf." },
  christmas: { key: "christmas", label: "Christmas", emoji: "🎄", accent: "0 70% 45%", cutoffMonthDay: "12-15", blurb: "A collector's gift, wrapped and ready under the tree." },
  birthday: { key: "birthday", label: "Birthday Edition", emoji: "🎂", accent: "45 90% 55%", cutoffMonthDay: "", blurb: "A personalised, numbered keepsake for someone special." },
  anniversary: { key: "anniversary", label: "Anniversary Edition", emoji: "💍", accent: "280 50% 50%", cutoffMonthDay: "", blurb: "A limited-run edition marking the moment." },
};

/** Compute a friendly "Order by …" line for the next upcoming cutoff, or null. */
export function getOccasionUrgency(template: OccasionTemplate, now: Date = new Date()): string | null {
  if (!template.cutoffMonthDay) return null;
  const [m, d] = template.cutoffMonthDay.split("-").map(Number);
  let cutoff = new Date(now.getFullYear(), m - 1, d);
  if (cutoff.getTime() < now.getTime()) cutoff = new Date(now.getFullYear() + 1, m - 1, d);
  const fmt = cutoff.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `Order by ${fmt} for ${template.label} delivery`;
}

export function getLowestPrice(book: BookWithProducts): string | null {
  const prices = [book.kindle_price, book.paperback_price, book.price].filter(Boolean) as string[];
  if (prices.length === 0) return null;
  const nums = prices.map(p => parseFloat(p.replace(/[^0-9.]/g, ""))).filter(n => !isNaN(n));
  if (nums.length === 0) return prices[0];
  const min = Math.min(...nums);
  return `$${min.toFixed(2)}`;
}
