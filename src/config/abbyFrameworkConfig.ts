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
      // Branding & Marketing (6)
      { id: "microsite", label: "Website", icon: BookOpen, section: "microsite-manager", navigateTo: "microsite-manager", description: "Your digital home base. Every other product points back here. Without a website, your book sales, lead magnets, and email list have nowhere to live. Build this first.", status: "available", subCategory: "Branding & Marketing", sequence: 1 },
      { id: "book-sales-events", label: "Book Sales", icon: BookOpen, section: "book-sales", navigateTo: "book-sales", description: "Your book is already written. Now optimize how it sells: pricing strategy, Amazon listing, distribution channels, and sales page copy. This is your primary revenue engine at the Brand level.", status: "available", subCategory: "Branding & Marketing", sequence: 2 },
      { id: "lead-magnet", label: "Lead Magnets", icon: FileText, navigateTo: "lead-magnet", description: "Free resources (checklists, guides, sample chapters) that turn casual readers into subscribers. You need these before you can build an email list or run webinars.", status: "coming-soon", subCategory: "Branding & Marketing", sequence: 3 },
      { id: "social-media", label: "Social Media", icon: Share2, section: "social-media", navigateTo: "social-media", description: "Consistent content that drives traffic to your website and lead magnets. Now that you have something to offer visitors, it's time to attract them.", status: "available", subCategory: "Branding & Marketing", sequence: 4 },
      { id: "email-marketing", label: "Email Marketing", icon: Megaphone, section: "email-marketing", navigateTo: "email-marketing", description: "Your most valuable asset. Social media gets attention; email keeps it. Once people opt in through your lead magnets, nurture them with automated sequences that build trust and drive sales.", status: "available", subCategory: "Branding & Marketing", sequence: 5 },
      { id: "webinars", label: "Webinars", icon: Video, section: "webinars", navigateTo: "webinars", description: "Live or recorded presentations that showcase your expertise. By this point, you have a website, a book, lead magnets feeding your email list, and social media driving traffic. Webinars convert that warm audience into buyers.", status: "coming-soon", subCategory: "Branding & Marketing", sequence: 6 },
      // Digital Products (3)
      { id: "workbooks", label: "Workbook", icon: FileText, section: "workbooks", navigateTo: "workbooks", description: "Companion guides, exercises, and templates that pair with your book. The easiest digital product to create because the content already exists in your manuscript.", status: "available", subCategory: "Digital Products", sequence: 7 },
      { id: "home-study", label: "Home Study Course", icon: BookMarked, section: "home-study", navigateTo: "home-study", description: "A self-paced program built from your book's core teachings. Typically priced 5–10× higher than your book alone.", status: "available", subCategory: "Digital Products", sequence: 8 },
      { id: "special-editions", label: "Special Editions", icon: Sparkles, section: "special-editions", navigateTo: "special-editions", description: "Premium versions of your book (hardcover, signed, illustrated, bundled editions). Build these last because they require an established audience willing to pay a premium.", status: "available", subCategory: "Digital Products", sequence: 9 },
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
      // Group 1: Scale Your Content (3)
      { id: "courses", label: "Online Course", icon: GraduationCap, section: "courses", navigateTo: "courses", description: "Your book content restructured into a teachable format with modules, lessons, and assignments. This is the natural first step because your manuscript already contains the material. Typically priced at $297–$997.", status: "available", subCategory: "Scale Your Content", sequence: 1, tierRequired: "Pro" },
      { id: "audiobook", label: "Audiobook", icon: Headphones, section: "audiobook-studio", navigateTo: "audiobook-studio", description: "Your manuscript converted to professional audio. Opens your content to commuters, gym-goers, and audiobook listeners who won't buy the print version.", status: "coming-soon", subCategory: "Scale Your Content", sequence: 2, tierRequired: "Pro" },
      { id: "memberships", label: "Memberships", icon: CreditCard, section: "memberships", navigateTo: "memberships", description: "Recurring monthly or annual access to your content library (courses, audiobooks, exclusive resources, community). Once you have courses and audiobooks, bundle them into a membership that generates predictable recurring revenue.", status: "coming-soon", subCategory: "Scale Your Content", sequence: 3, tierRequired: "Pro" },
      // Group 2: Grow Your Reach (3)
      { id: "group-coaching", label: "Group Coaching", icon: Users, section: "group-coaching", navigateTo: "group-coaching", description: "Small group coaching programs (8–20 people) teaching your methodology live. This builds on your course material but adds personal interaction, accountability, and higher price points ($1,500–$5,000 per person).", status: "coming-soon", subCategory: "Grow Your Reach", sequence: 4, tierRequired: "Pro" },
      { id: "podcast-guest", label: "Podcast Tour", icon: Podcast, section: "podcast", navigateTo: "podcast", description: "Get interviewed on podcasts in your niche. You provide the expertise; podcast hosts provide the audience. This is the \"guest expert\" version of authority-building — low effort, high visibility.", status: "coming-soon", subCategory: "Grow Your Reach", sequence: 5, tierRequired: "Pro" },
      { id: "in-house-speaker", label: "Media Outreach", icon: Presentation, description: "Press kit, media pitches, speaker profile, and outreach to TV, magazines, podcasts, and major publications. The \"go bigger\" version of podcast tours. You're positioning yourself as the go-to expert for journalists and producers.", status: "planned", subCategory: "Grow Your Reach", sequence: 6, tierRequired: "Pro" },
      // Group 3: Monetize Your Network (3)
      { id: "affiliates", label: "Affiliates", icon: Link2, description: "Recommend products and services aligned with your audience's needs and earn commissions. Once you have an established audience from Groups 1–2, you can monetize through partnerships without creating new products.", status: "planned", subCategory: "Monetize Your Network", sequence: 7, tierRequired: "Pro" },
      { id: "upsells", label: "Upsells / Downsells", icon: TrendingUp, description: "Conversion sequences and funnel optimization. Maximize revenue from your existing audience by offering the right product at the right price point at the right time.", status: "planned", subCategory: "Monetize Your Network", sequence: 8, tierRequired: "Pro" },
      { id: "revenue-sharing", label: "Revenue Sharing", icon: Handshake, description: "Partnership matching and revenue-sharing contracts with complementary businesses. The most advanced monetization — requires proven audience reach and authority to attract partners willing to share revenue.", status: "planned", subCategory: "Monetize Your Network", sequence: 9, tierRequired: "Pro" },
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
      // High-Ticket Services (10)
      { id: "coaching-1on1", label: "Coaching", icon: UserCheck, section: "coaching", navigateTo: "coaching", description: "One-on-one coaching for high-net-worth clients. Typically $500–$2,000 per session or $5,000–$25,000 per engagement. Requires direct client access and proven results.", status: "coming-soon", subCategory: "High-Ticket Services", sequence: 1, tierRequired: "Enterprise" },
      { id: "big-ticket", label: "Consulting", icon: Trophy, navigateTo: "big-ticket", description: "Strategic advisory for businesses, organizations, or individuals. Similar to coaching but often focused on solving specific business problems. $10,000–$50,000+ per project.", status: "planned", subCategory: "High-Ticket Services", sequence: 2, tierRequired: "Enterprise" },
      { id: "keynotes", label: "Keynotes", icon: Mic, section: "speaking", navigateTo: "speaking", description: "Speaking fees for conferences, corporate events, and summits. $2,500–$25,000+ per appearance depending on your fame and the event size. Requires a strong speaker reel and media presence.", status: "coming-soon", subCategory: "High-Ticket Services", sequence: 3, tierRequired: "Enterprise" },
      { id: "training", label: "Training Programs", icon: Building2, description: "Corporate or organizational training programs. Teach your methodology to teams, departments, or entire companies. $5,000–$50,000+ per program depending on scope and audience size.", status: "planned", subCategory: "High-Ticket Services", sequence: 4, tierRequired: "Enterprise" },
      { id: "masterminds", label: "Masterminds", icon: BarChart3, description: "Exclusive peer-to-peer groups where members pay $5,000–$25,000/year to mastermind with you and other high-achievers. Requires a strong network and proven results.", status: "planned", subCategory: "High-Ticket Services", sequence: 5, tierRequired: "Enterprise" },
      { id: "retreats", label: "Retreats & Bootcamps", icon: Bookmark, description: "Multi-day immersive experiences (in-person or virtual). $2,500–$15,000+ per person depending on location, duration, and exclusivity. Combines teaching, networking, and transformation.", status: "planned", subCategory: "High-Ticket Services", sequence: 6, tierRequired: "Enterprise" },
      { id: "certification", label: "Certification", icon: ShieldCheck, description: "Certify others to teach or implement your methodology. Create a certification program and earn revenue from certification fees, ongoing licensing, or partner revenue sharing. $5,000–$50,000+ per certification depending on rigor.", status: "planned", subCategory: "High-Ticket Services", sequence: 7, tierRequired: "Enterprise" },
      { id: "conventions", label: "Conventions / Conferences", icon: Calendar, description: "Host or co-host industry conferences, summits, or conventions. Monetize through speaker fees, vendor booths, sponsorships, and ticket sales. $50,000–$500,000+ depending on scale.", status: "planned", subCategory: "High-Ticket Services", sequence: 8, tierRequired: "Enterprise" },
      { id: "fundraising", label: "Fund Raising", icon: HandCoins, description: "Help organizations, nonprofits, or causes raise capital. Charge a percentage of funds raised or a flat advisory fee. $10,000–$100,000+ depending on the fundraising goal.", status: "planned", subCategory: "High-Ticket Services", sequence: 9, tierRequired: "Enterprise" },
      { id: "exhibitors", label: "Exhibitors / JV", icon: Megaphone, description: "Create a marketplace or platform where vendors pay to exhibit or sell to your audience. Monetize through booth fees, commission on sales, or sponsorships. $5,000–$100,000+ depending on audience size and vendor demand.", status: "planned", subCategory: "High-Ticket Services", sequence: 10, tierRequired: "Enterprise" },
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
