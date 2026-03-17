/**
 * Single source of truth for ABBY Framework product categorization.
 * All dashboard components (PortfolioStepView, BusinessFramework,
 * StepDetailView, AbbyBuildAdvisor) MUST import from here.
 */
import {
  BookOpen, Mic, Podcast, GraduationCap, FileText, Video,
  Share2, CreditCard, Users, Trophy, Building2,
  Bookmark, Calendar, Link2, TrendingUp, Megaphone,
  Headphones, BookMarked, Presentation, UserCheck,
  HandCoins, Handshake, BarChart3, ShieldCheck,
  Sparkles, DollarSign, Radio, Award,
} from "lucide-react";
import type { DashboardSection } from "@/pages/AuthorDashboard";

/* ─── Types ─── */
export type AbbyCategory = "revenue-streams" | "marketing-channels" | "authority-builders";

export interface AbbyNode {
  id: string;
  label: string;
  icon: typeof BookOpen;
  section?: DashboardSection | string;
  navigateTo?: string;
  description: string;
  status: "available" | "coming-soon" | "planned";
  subCategory?: string;
  sequence?: number;
  tierRequired?: string;
}

export interface AbbyCategoryConfig {
  id: AbbyCategory;
  label: string;
  subtitle: string;
  color: string;
  bgColor: string;
  ringColor: string;
  gradientFrom: string;
  gradientTo: string;
  headerIcon: typeof DollarSign;
  nodes: AbbyNode[];
}

/* ─── Canonical Category Definitions ─── */

export const ABBY_CATEGORIES: Record<AbbyCategory, AbbyCategoryConfig> = {
  /**
   * BRAND PRODUCTS (9 nodes)
   * Digital products & content assets created from the book.
   */
  "revenue-streams": {
    id: "revenue-streams",
    label: "B · Brand Products",
    subtitle: "Create Your Products (9 nodes)",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    ringColor: "ring-emerald-500/30",
    gradientFrom: "from-emerald-500",
    gradientTo: "to-emerald-600",
    headerIcon: DollarSign,
    nodes: [
      { id: "book-sales-events", label: "Book Sales", icon: BookOpen, section: "book-sales", navigateTo: "book-sales", description: "QR code order pages & direct sales.", status: "available", subCategory: "Digital Products", sequence: 1 },
      { id: "workbooks", label: "Workbook", icon: FileText, section: "workbooks", navigateTo: "workbooks", description: "Companion workbook PDFs with exercises and templates.", status: "available", subCategory: "Digital Products", sequence: 2 },
      { id: "home-study", label: "Home Study Course", icon: BookMarked, section: "home-study", navigateTo: "home-study", description: "Self-paced study guide with daily exercises.", status: "available", subCategory: "Digital Products", sequence: 3 },
      { id: "special-editions", label: "Special Editions", icon: Sparkles, section: "special-editions", navigateTo: "special-editions", description: "Premium editions with themed gift packaging. Signed copies, collector's editions & gift sets.", status: "available", subCategory: "Digital Products", sequence: 4 },
      { id: "lead-magnet", label: "Lead Magnets", icon: FileText, navigateTo: "lead-magnet", description: "Free PDF downloads to grow your email list.", status: "coming-soon", subCategory: "Growth", sequence: 5 },
      { id: "webinars", label: "Webinars", icon: Video, section: "webinars", navigateTo: "webinars", description: "Webinar scripts + slide decks + registration pages.", status: "coming-soon", subCategory: "Growth", sequence: 6 },
      { id: "social-media", label: "Social Media", icon: Share2, section: "social-media", navigateTo: "social-media", description: "90-day AI content calendar from your book.", status: "available", subCategory: "In-House", sequence: 7 },
      { id: "email-marketing", label: "Email Marketing", icon: Megaphone, section: "email-marketing", navigateTo: "email-marketing", description: "AI-driven nurture sequences from book content.", status: "available", subCategory: "In-House", sequence: 8 },
      { id: "microsite", label: "Website", icon: BookOpen, section: "microsite-manager", navigateTo: "microsite-manager", description: "Your professional author website.", status: "available", subCategory: "In-House", sequence: 9 },
    ],
  },

  /**
   * BUILD AUTHORITY (9 nodes)
   * Scale audience and recurring revenue.
   */
  "marketing-channels": {
    id: "marketing-channels",
    label: "B · Build Authority",
    subtitle: "Scale Your Audience (9 nodes)",
    color: "text-violet-600",
    bgColor: "bg-violet-500/10",
    ringColor: "ring-violet-500/30",
    gradientFrom: "from-violet-500",
    gradientTo: "to-violet-600",
    headerIcon: Radio,
    nodes: [
      { id: "courses", label: "Online Course", icon: GraduationCap, section: "courses", navigateTo: "courses", description: "8-12 module structured courses from your book content.", status: "available", subCategory: "Products", sequence: 1, tierRequired: "Pro" },
      { id: "audiobook", label: "Audiobook", icon: Headphones, section: "audiobook-studio", navigateTo: "audiobook-studio", description: "AI-narrated audiobook from your manuscript.", status: "coming-soon", subCategory: "Products", sequence: 2, tierRequired: "Pro" },
      { id: "memberships", label: "Memberships", icon: CreditCard, section: "memberships", navigateTo: "memberships", description: "3-tier membership system with recurring revenue.", status: "coming-soon", subCategory: "Recurring", sequence: 3, tierRequired: "Pro" },
      { id: "group-coaching", label: "Group Coaching", icon: Users, section: "group-coaching", navigateTo: "group-coaching", description: "8-week group coaching curriculum.", status: "coming-soon", subCategory: "Recurring", sequence: 4, tierRequired: "Pro" },
      { id: "podcast-guest", label: "Podcast Tour", icon: Podcast, section: "podcast", navigateTo: "podcast", description: "Podcast series & guest pitches from your book content.", status: "coming-soon", subCategory: "Outreach", sequence: 5, tierRequired: "Pro" },
      { id: "in-house-speaker", label: "Media Outreach", icon: Presentation, description: "Press kit, media pitches & speaker profile.", status: "planned", subCategory: "Outreach", sequence: 6, tierRequired: "Pro" },
      { id: "affiliates", label: "Affiliates", icon: Link2, description: "Affiliate tracking links + commission structures.", status: "planned", subCategory: "Growth", sequence: 7, tierRequired: "Pro" },
      { id: "upsells", label: "Upsells / Downsells", icon: TrendingUp, description: "Conversion sequences and funnel optimization.", status: "planned", subCategory: "Growth", sequence: 8, tierRequired: "Pro" },
      { id: "revenue-sharing", label: "Revenue Sharing", icon: Handshake, description: "Partnership matching + contract templates.", status: "planned", subCategory: "Growth", sequence: 9, tierRequired: "Pro" },
    ],
  },

  /**
   * YIELD REVENUE (10 nodes)
   * Premium monetization: coaching, speaking, events.
   */
  "authority-builders": {
    id: "authority-builders",
    label: "Y · Yield Revenue",
    subtitle: "Premium Services (10 nodes)",
    color: "text-sky-600",
    bgColor: "bg-sky-500/10",
    ringColor: "ring-sky-500/30",
    gradientFrom: "from-sky-500",
    gradientTo: "to-sky-600",
    headerIcon: Award,
    nodes: [
      { id: "coaching-1on1", label: "1-on-1 Coaching", icon: UserCheck, section: "coaching", navigateTo: "coaching", description: "6/12-session coaching programs with session outlines.", status: "coming-soon", subCategory: "Coaching", sequence: 1, tierRequired: "Pro" },
      { id: "group-coaching", label: "Group Coaching", icon: Users, section: "group-coaching", navigateTo: "group-coaching", description: "8-week group coaching curriculum.", status: "coming-soon", subCategory: "Coaching", sequence: 2, tierRequired: "Pro" },
      { id: "memberships", label: "Monthly Memberships", icon: CreditCard, section: "memberships", navigateTo: "memberships", description: "3-tier membership system with recurring revenue.", status: "coming-soon", subCategory: "Coaching", sequence: 3, tierRequired: "Pro" },
      { id: "big-ticket", label: "Big Ticket Consulting", icon: Trophy, navigateTo: "big-ticket", description: "Premium consulting packages ($5K–$25K).", status: "planned", subCategory: "Coaching", sequence: 4, tierRequired: "Pro" },
      { id: "keynotes", label: "Keynotes", icon: Mic, section: "speaking", navigateTo: "speaking", description: "3-5 keynote topics with slide decks.", status: "coming-soon", subCategory: "Speaking", sequence: 5 },
      { id: "training", label: "Training Programs", icon: Building2, description: "Half/full-day corporate training programs.", status: "planned", subCategory: "Speaking", sequence: 6, tierRequired: "Enterprise" },
      { id: "masterminds", label: "Masterminds", icon: BarChart3, description: "Quarterly mastermind group programs.", status: "planned", subCategory: "Corporate", sequence: 7, tierRequired: "Enterprise" },
      { id: "retreats", label: "Retreats & Bootcamps", icon: Bookmark, description: "2-3 day retreat programs.", status: "planned", subCategory: "Corporate", sequence: 8, tierRequired: "Enterprise" },
      { id: "certification", label: "Certification", icon: ShieldCheck, description: "Curriculum + exam + digital certificates.", status: "planned", subCategory: "Corporate", sequence: 9, tierRequired: "Enterprise" },
      { id: "conventions", label: "Conventions / Conferences", icon: Calendar, description: "Conference submission generator.", status: "planned", subCategory: "Events", sequence: 10, tierRequired: "Enterprise" },
      { id: "fundraising", label: "Fund Raising", icon: HandCoins, description: "Fundraising event templates.", status: "planned", subCategory: "Events", sequence: 11, tierRequired: "Enterprise" },
      { id: "exhibitors", label: "Exhibitors / JV", icon: Megaphone, description: "Exhibitor prospectus + partnership matching.", status: "planned", subCategory: "Events", sequence: 12, tierRequired: "Enterprise" },
    ],
  },
};

/** Flat list of all categories for iteration */
export const ABBY_CATEGORY_LIST: AbbyCategoryConfig[] = Object.values(ABBY_CATEGORIES);

/** Look up which category a node belongs to */
export function getCategoryForNode(nodeId: string): AbbyCategory | null {
  for (const [catId, cat] of Object.entries(ABBY_CATEGORIES)) {
    if (cat.nodes.some(n => n.id === nodeId)) return catId as AbbyCategory;
  }
  return null;
}

/** Get total node count across all categories */
export function getTotalNodeCount(): number {
  return ABBY_CATEGORY_LIST.reduce((sum, c) => sum + c.nodes.length, 0);
}

/* ─── Abby Advisor Recommendations (per category) ─── */

export interface AdvisorRecommendation {
  label: string;
  reason: string;
  priceRange?: string;
  difficulty: "Easy" | "Medium" | "Advanced";
  nodeId?: string;
}

export interface AdvisorContent {
  heading: string;
  intro: string;
  recommendations: AdvisorRecommendation[];
  closingNote: string;
}

export const ADVISOR_CONTENT: Record<AbbyCategory, AdvisorContent> = {
  "revenue-streams": {
    heading: "Where should you start building?",
    intro: "Based on the ABBY Framework, here's my recommended build order — start with the lowest-effort, highest-impact products first:",
    recommendations: [
      { label: "Workbook", reason: "Your fastest win. AI generates it directly from your manuscript — exercises, reflection prompts, and action plans. Most authors finish in under 30 minutes.", priceRange: "$4.99 – $9.99", difficulty: "Easy", nodeId: "workbooks" },
      { label: "Home Study Course", reason: "A structured self-paced program with daily schedules. Great lead magnet or entry-level product.", priceRange: "$27 – $47", difficulty: "Medium", nodeId: "home-study" },
      { label: "Book Sales", reason: "QR code order pages and direct sales funnels. Quick to set up, immediate revenue from your existing book.", priceRange: "$15 – $30/book", difficulty: "Easy", nodeId: "book-sales-events" },
      { label: "Social Media (90-day Calendar)", reason: "AI generates a full content calendar from your book. Start building your audience while creating digital products.", difficulty: "Easy", nodeId: "social-media" },
      { label: "Online Course", reason: "Your flagship digital product. 8–12 modules generated from your book's frameworks. Best for building recurring revenue.", priceRange: "$47 – $97", difficulty: "Medium", nodeId: "courses" },
    ],
    closingNote: "Start with Workbook + Book Sales for quick wins, then add Online Course to build momentum.",
  },
  "marketing-channels": {
    heading: "Which channels should you activate first?",
    intro: "Build Authority products scale your audience and recurring revenue. Here's the priority order:",
    recommendations: [
      { label: "Audiobook", reason: "AI-narrated from your manuscript. No recording studio needed. Expands your reach to listeners who prefer audio.", priceRange: "$9.99 – $14.99", difficulty: "Easy", nodeId: "audiobook" },
      { label: "Podcast Tour", reason: "AI generates guest pitches, talking points, and media one-sheets. The fastest way to reach new audiences.", difficulty: "Easy", nodeId: "podcast-guest" },
      { label: "Webinars", reason: "AI generates scripts, slide decks, and registration pages. Great for selling coaching and courses.", priceRange: "$47 – $197", difficulty: "Medium", nodeId: "webinars" },
      { label: "Lead Magnet Funnel", reason: "Free PDF downloads that capture emails and feed your nurture sequences. Essential for list building.", difficulty: "Easy", nodeId: "lead-magnet" },
    ],
    closingNote: "Start with Audiobook + Podcast Tour to grow your audience, then add Webinars to convert them.",
  },
  "authority-builders": {
    heading: "When should you pursue premium revenue?",
    intro: "These are your highest-value plays — coaching, speaking, and premium offers that monetize your authority:",
    recommendations: [
      { label: "1-on-1 Coaching", reason: "Premium service with the highest margins. Use your book's frameworks as session outlines.", priceRange: "$150 – $500/session", difficulty: "Easy", nodeId: "coaching-1on1" },
      { label: "Group Coaching", reason: "Scale your coaching with 8-week group programs. Higher revenue per hour than 1-on-1.", priceRange: "$97 – $297/person", difficulty: "Medium", nodeId: "group-coaching" },
      { label: "Monthly Memberships", reason: "3-tier membership system for predictable recurring revenue from your most engaged readers.", priceRange: "$27 – $97/mo", difficulty: "Medium", nodeId: "memberships" },
      { label: "Keynotes", reason: "Apply as a speaker to build credibility. AI generates your submission materials and speaker profile.", priceRange: "$2,500 – $10,000", difficulty: "Medium", nodeId: "keynotes" },
      { label: "Big Ticket Consulting", reason: "Package your expertise into premium consulting offers. AI creates proposals and session frameworks.", priceRange: "$5,000 – $25,000", difficulty: "Advanced", nodeId: "big-ticket" },
      { label: "Training Programs", reason: "Half-day and full-day corporate training programs built from your frameworks. High-ticket B2B revenue.", priceRange: "$3,000 – $15,000/day", difficulty: "Advanced", nodeId: "training" },
      { label: "Masterminds", reason: "Quarterly mastermind groups for your most committed audience. High retention and recurring revenue.", priceRange: "$500 – $2,000/quarter", difficulty: "Advanced", nodeId: "masterminds" },
      { label: "Retreats & Bootcamps", reason: "2-3 day immersive experiences. Premium pricing with high transformation value.", priceRange: "$1,500 – $5,000", difficulty: "Advanced", nodeId: "retreats" },
      { label: "Certification", reason: "License your methodology. Others pay to teach your frameworks — the ultimate scalable revenue.", priceRange: "$2,000 – $10,000", difficulty: "Advanced", nodeId: "certification" },
      { label: "Conventions & Conferences", reason: "Apply to speak at industry events. AI generates submission materials and speaker profile.", difficulty: "Medium", nodeId: "conventions" },
      { label: "Fund Raising Events", reason: "Leverage your book for cause-driven events. Works especially well for non-fiction authors with a mission.", difficulty: "Advanced", nodeId: "fundraising" },
      { label: "Exhibitors / JV", reason: "Partner with complementary brands. AI creates exhibitor prospectus and partnership proposals.", difficulty: "Advanced", nodeId: "exhibitors" },
    ],
    closingNote: "Start with 1-on-1 Coaching + Memberships for recurring revenue. Add Keynotes and Group Coaching as your audience grows. Pursue Masterminds, Retreats, and Certification once you have 1,000+ engaged followers.",
  },
};

/** Map from nodeId to its dashboard studio path (used by AbbyBuildAdvisor) */
export function getStudioPath(nodeId: string, bookId: string, titleParam: string): string | null {
  const map: Record<string, string> = {
    "social-media": `/dashboard?section=social-media&bookId=${bookId}${titleParam}`,
    workbooks: `/dashboard?section=workbooks&bookId=${bookId}${titleParam}&builder=workbook`,
    webinars: `/dashboard?section=webinars&bookId=${bookId}${titleParam}`,
    audiobook: `/dashboard?section=audiobook-studio&bookId=${bookId}${titleParam}`,
    "coaching-1on1": `/dashboard?section=coaching&bookId=${bookId}${titleParam}&builder=coaching-1on1`,
    keynotes: `/dashboard?section=speaking&bookId=${bookId}${titleParam}`,
    courses: `/dashboard?section=courses&bookId=${bookId}${titleParam}&builder=online-course`,
    "home-study": `/dashboard?section=home-study&bookId=${bookId}${titleParam}`,
    "email-marketing": `/dashboard?section=email-marketing&bookId=${bookId}${titleParam}`,
    "podcast-guest": `/dashboard?section=podcast&bookId=${bookId}${titleParam}`,
    memberships: `/dashboard?section=memberships&bookId=${bookId}${titleParam}`,
    "group-coaching": `/dashboard?section=group-coaching&bookId=${bookId}${titleParam}`,
    "lead-magnet": `/dashboard?section=lead-magnet&bookId=${bookId}${titleParam}`,
    "book-sales-events": `/dashboard?section=book-sales&bookId=${bookId}${titleParam}`,
    "special-editions": `/dashboard?section=special-editions&bookId=${bookId}${titleParam}`,
    microsite: `/dashboard?section=microsite-manager`,
  };
  return map[nodeId] || null;
}

/** IDs of categories that are gated by default (fallback when DB hasn't loaded) */
const DEFAULT_GATED_CATEGORIES: AbbyCategory[] = ["marketing-channels", "authority-builders"];

/** Check if a category is gated by default (Coming Soon) — fallback only */
export function isCategoryGated(catId: AbbyCategory): boolean {
  return DEFAULT_GATED_CATEGORIES.includes(catId);
}

/**
 * Returns effective node status using DB gating state.
 * Falls back to hardcoded gating when no DB state is provided.
 * Superadmins always see the true status.
 */
export function getEffectiveNodeStatus(
  node: AbbyNode,
  categoryId: AbbyCategory,
  _isAdmin: boolean,
  isSuperAdmin = false,
  openNodeIds?: Set<string>,
): AbbyNode["status"] {
  if (isSuperAdmin) return node.status;
  // If we have DB gating data, use it
  if (openNodeIds) {
    return openNodeIds.has(node.id) ? node.status : "coming-soon";
  }
  // Fallback: hardcoded gating
  if (DEFAULT_GATED_CATEGORIES.includes(categoryId) && (node.status === "coming-soon" || node.status === "available")) {
    return "coming-soon";
  }
  return node.status;
}

/**
 * Returns a copy of the category with effective statuses applied.
 * Uses DB gating when available, otherwise falls back to hardcoded.
 * Superadmins always see true status.
 */
export function getEffectiveCategory(
  catId: AbbyCategory,
  _isAdmin: boolean,
  isSuperAdmin = false,
  openNodeIds?: Set<string>,
): AbbyCategoryConfig {
  const cat = ABBY_CATEGORIES[catId];
  if (!cat) return cat;
  if (isSuperAdmin) return cat;
  return {
    ...cat,
    nodes: cat.nodes.map(n => ({
      ...n,
      status: getEffectiveNodeStatus(n, catId, _isAdmin, false, openNodeIds),
    })),
  };
}
