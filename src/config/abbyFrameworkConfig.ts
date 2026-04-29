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
      // Branding & Marketing (5)
      { id: "microsite", label: "Website", icon: BookOpen, section: "microsite-manager", navigateTo: "microsite-manager", description: "Your digital home base. Every other product points back here. Without a website, your book sales, lead magnets, and email list have nowhere to live. Build this first.", status: "available", subCategory: "Branding & Marketing", sequence: 1 },
      { id: "lead-magnet", label: "Lead Magnets", icon: FileText, navigateTo: "lead-magnet", description: "Free resources (checklists, guides, sample chapters) that turn casual readers into subscribers. You need these before you can build an email list or run webinars.", status: "coming-soon", subCategory: "Branding & Marketing", sequence: 2 },
      { id: "email-marketing", label: "Email Marketing", icon: Megaphone, section: "email-marketing", navigateTo: "email-marketing", description: "Your most valuable asset. Social media gets attention; email keeps it. Once people opt in through your lead magnets, nurture them with automated sequences that build trust and drive sales.", status: "available", subCategory: "Branding & Marketing", sequence: 3 },
      { id: "social-media", label: "Social Media", icon: Share2, section: "social-media", navigateTo: "social-media", description: "Consistent content that drives traffic to your website and lead magnets. Now that you have something to offer visitors, it's time to attract them.", status: "available", subCategory: "Branding & Marketing", sequence: 4 },
      { id: "webinars", label: "Webinars", icon: Video, section: "webinars", navigateTo: "webinars", description: "Live or recorded presentations that showcase your expertise. By this point, you have a website, a book, lead magnets feeding your email list, and social media driving traffic. Webinars convert that warm audience into buyers.", status: "coming-soon", subCategory: "Branding & Marketing", sequence: 5 },
      { id: "book-sales-events", label: "Book Sales", icon: BookOpen, section: "book-sales", navigateTo: "book-sales", description: "Your live-audience conversion toolkit: pricing strategy, Amazon listing, distribution channels, event sales scripts, and QR code order pages. The closing machinery that pairs with your webinars and in-person talks to turn warm audiences into buyers.", status: "available", subCategory: "Branding & Marketing", sequence: 6 },
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
      { id: "courses", label: "Online Course", icon: GraduationCap, section: "courses", navigateTo: "courses", description: "Your book content restructured into a teachable format with modules, lessons, and assignments. This is the natural first step because your manuscript already contains the material. Typically priced at $297–$997.", status: "available", subCategory: "Scale Your Content", sequence: 1, tierRequired: "Build" },
      { id: "audiobook", label: "Audiobook", icon: Headphones, section: "audiobook-studio", navigateTo: "audiobook-studio", description: "Your manuscript converted to professional audio. Opens your content to commuters, gym-goers, and audiobook listeners who won't buy the print version.", status: "coming-soon", subCategory: "Scale Your Content", sequence: 2, tierRequired: "Build" },
      { id: "memberships", label: "Memberships", icon: CreditCard, section: "memberships", navigateTo: "memberships", description: "Recurring monthly or annual access to your content library (courses, audiobooks, exclusive resources, community). Once you have courses and audiobooks, bundle them into a membership that generates predictable recurring revenue.", status: "coming-soon", subCategory: "Scale Your Content", sequence: 3, tierRequired: "Build" },
      // Group 2: Grow Your Reach (3)
      { id: "group-coaching", label: "Group Coaching", icon: Users, section: "group-coaching", navigateTo: "group-coaching", description: "Small group coaching programs (8–20 people) teaching your methodology live. This builds on your course material but adds personal interaction, accountability, and higher price points ($1,500–$5,000 per person).", status: "coming-soon", subCategory: "Grow Your Reach", sequence: 4, tierRequired: "Build" },
      { id: "podcast-guest", label: "Podcast Tour", icon: Podcast, section: "podcast", navigateTo: "podcast", description: "Get interviewed on podcasts in your niche. You provide the expertise; podcast hosts provide the audience. Low effort, high visibility.", status: "coming-soon", subCategory: "Grow Your Reach", sequence: 5, tierRequired: "Build" },
      { id: "in-house-speaker", label: "Media Outreach", icon: Presentation, description: "Press kit, media pitches, speaker profile, and outreach to TV, magazines, podcasts, and major publications. You're positioning yourself as the go-to expert for journalists and producers.", status: "planned", subCategory: "Grow Your Reach", sequence: 6, tierRequired: "Build" },
      // Group 3: Monetize Your Network (3)
      { id: "affiliates", label: "Affiliates", icon: Link2, description: "Recommend products and services aligned with your audience's needs and earn commissions. Once you have an established audience from Groups 1–2, you can monetize through partnerships without creating new products.", status: "planned", subCategory: "Monetize Your Network", sequence: 7, tierRequired: "Build" },
      { id: "upsells", label: "Upsells / Downsells", icon: TrendingUp, description: "Conversion sequences and funnel optimization. Maximize revenue from your existing audience by offering the right product at the right price point at the right time.", status: "planned", subCategory: "Monetize Your Network", sequence: 8, tierRequired: "Build" },
      { id: "revenue-sharing", label: "Revenue Sharing", icon: Handshake, description: "Partnership matching and revenue-sharing contracts with complementary businesses. The most advanced monetization, requiring proven audience reach and authority to attract partners willing to share revenue.", status: "planned", subCategory: "Monetize Your Network", sequence: 9, tierRequired: "Build" },
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
      { id: "coaching-1on1", label: "Coaching", icon: UserCheck, section: "coaching", navigateTo: "coaching", description: "One-on-one coaching for high-net-worth clients. Typically $500–$2,000 per session or $5,000–$25,000 per engagement. Requires direct client access and proven results.", status: "coming-soon", subCategory: "High-Ticket Services", sequence: 1, tierRequired: "Yield" },
      { id: "big-ticket", label: "Consulting", icon: Trophy, navigateTo: "big-ticket", description: "Strategic advisory for businesses, organizations, or individuals. Similar to coaching but often focused on solving specific business problems. $10,000–$50,000+ per project.", status: "planned", subCategory: "High-Ticket Services", sequence: 2, tierRequired: "Yield" },
      { id: "keynotes", label: "Keynotes", icon: Mic, section: "speaking", navigateTo: "speaking", description: "Speaking fees for conferences, corporate events, and summits. $2,500–$25,000+ per appearance depending on your fame and the event size. Requires a strong speaker reel and media presence.", status: "coming-soon", subCategory: "High-Ticket Services", sequence: 3, tierRequired: "Yield" },
      { id: "training", label: "Training Programs", icon: Building2, description: "Corporate or organizational training programs. Teach your methodology to teams, departments, or entire companies. $5,000–$50,000+ per program depending on scope and audience size.", status: "planned", subCategory: "High-Ticket Services", sequence: 4, tierRequired: "Yield" },
      { id: "masterminds", label: "Masterminds", icon: BarChart3, description: "Exclusive peer-to-peer groups where members pay $5,000–$25,000/year to mastermind with you and other high-achievers. Requires a strong network and proven results.", status: "planned", subCategory: "High-Ticket Services", sequence: 5, tierRequired: "Yield" },
      { id: "retreats", label: "Retreats & Bootcamps", icon: Bookmark, description: "Multi-day immersive experiences (in-person or virtual). $2,500–$15,000+ per person depending on location, duration, and exclusivity. Combines teaching, networking, and transformation.", status: "planned", subCategory: "High-Ticket Services", sequence: 6, tierRequired: "Yield" },
      { id: "certification", label: "Certification", icon: ShieldCheck, description: "Certify others to teach or implement your methodology. Create a certification program and earn revenue from certification fees, ongoing licensing, or partner revenue sharing. $5,000–$50,000+ per certification depending on rigor.", status: "planned", subCategory: "High-Ticket Services", sequence: 7, tierRequired: "Yield" },
      { id: "conventions", label: "Conventions / Conferences", icon: Calendar, description: "Host or co-host industry conferences, summits, or conventions. Monetize through speaker fees, vendor booths, sponsorships, and ticket sales. $50,000–$500,000+ depending on scale.", status: "planned", subCategory: "High-Ticket Services", sequence: 8, tierRequired: "Yield" },
      { id: "fundraising", label: "Fund Raising", icon: HandCoins, description: "Help organizations, nonprofits, or causes raise capital. Charge a percentage of funds raised or a flat advisory fee. $10,000–$100,000+ depending on the fundraising goal.", status: "planned", subCategory: "High-Ticket Services", sequence: 9, tierRequired: "Yield" },
      { id: "exhibitors", label: "Exhibitors / JV", icon: Megaphone, description: "Create a marketplace or platform where vendors pay to exhibit or sell to your audience. Monetize through booth fees, commission on sales, or sponsorships. $5,000–$100,000+ depending on audience size and vendor demand.", status: "planned", subCategory: "High-Ticket Services", sequence: 10, tierRequired: "Yield" },
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
    intro: "Based on the ABBY Framework, here's your recommended build sequence. Start with your branding & marketing foundations first, then create your digital products:",
    recommendations: [
      { label: "Author Website & Microsite", reason: "Your branding foundation. Every product you create lives here — it's the hub for your entire author business. Start here.", difficulty: "Easy", nodeId: "microsite" },
      { label: "Lead Magnet & Email Opt-in", reason: "Capture reader emails with a free PDF download. This feeds your email list and unlocks every other revenue stream.", difficulty: "Easy", nodeId: "lead-magnet" },
      { label: "Email Marketing Flows", reason: "Automated nurture sequences that turn subscribers into buyers. Set it once and it sells for you 24/7.", difficulty: "Easy", nodeId: "email-marketing" },
      { label: "Social Media (90-day Calendar)", reason: "AI generates a full content calendar from your book. Build your audience while you create digital products.", difficulty: "Easy", nodeId: "social-media" },
      { label: "Webinars", reason: "Live or recorded presentations that fill the room with warm leads ready to be converted.", priceRange: "$47 – $197", difficulty: "Medium", nodeId: "webinars" },
      { label: "Book Sales (Live Audience Toolkit)", reason: "The conversion machinery for your webinars and in-person talks: pricing, Amazon listing, event scripts, QR order pages.", priceRange: "$15 – $30/book", difficulty: "Easy", nodeId: "book-sales-events" },
      { label: "Workbook", reason: "Your first digital product. AI generates exercises, reflection prompts, and action plans directly from your manuscript.", priceRange: "$4.99 – $9.99", difficulty: "Easy", nodeId: "workbooks" },
      { label: "Home Study Course", reason: "A structured self-paced program with daily schedules. Great entry-level product once you have an audience to sell to.", priceRange: "$27 – $47", difficulty: "Medium", nodeId: "home-study" },
    ],
    closingNote: "Build your Website + Lead Magnet + Email first to establish your marketing foundation. Then layer Webinars + Book Sales Toolkit to convert audiences into buyers.",
  },
  "marketing-channels": {
    heading: "How do you scale your authority?",
    intro: "Build Authority products scale your audience and create recurring revenue. Start with your flagship course, then expand your reach:",
    recommendations: [
      { label: "Online Course", reason: "Your flagship digital product. 8–12 modules generated from your book's frameworks. Best for building recurring revenue.", priceRange: "$47 – $97", difficulty: "Medium", nodeId: "courses" },
      { label: "Audiobook", reason: "AI-narrated from your manuscript. No recording studio needed. Expands your reach to listeners who prefer audio.", priceRange: "$9.99 – $14.99", difficulty: "Easy", nodeId: "audiobook" },
      { label: "Podcast Scripts", reason: "AI generates episode scripts, talking points, and show notes. Build authority through consistent content.", difficulty: "Easy", nodeId: "podcast-guest" },
      { label: "Webinars", reason: "AI generates scripts, slide decks, and registration pages. Great for selling coaching and courses.", priceRange: "$47 – $197", difficulty: "Medium", nodeId: "webinars" },
      { label: "Monthly Memberships", reason: "3-tier membership system for predictable recurring revenue from your most engaged readers.", priceRange: "$27 – $97/mo", difficulty: "Medium", nodeId: "memberships" },
      { label: "Group Coaching", reason: "Scale your coaching with 8-week group programs. Higher revenue per hour than 1-on-1.", priceRange: "$97 – $297/person", difficulty: "Medium", nodeId: "group-coaching" },
    ],
    closingNote: "Start with Online Course + Audiobook to establish authority, then add Webinars and Memberships for recurring revenue.",
  },
  "authority-builders": {
    heading: "When should you pursue premium revenue?",
    intro: "These are your highest-value plays — premium services that monetize your authority. Pursue these once your Brand and Build foundations are in place:",
    recommendations: [
      { label: "1-on-1 Coaching", reason: "Premium service with the highest margins. Use your book's frameworks as session outlines.", priceRange: "$150 – $500/session", difficulty: "Easy", nodeId: "coaching-1on1" },
      { label: "Keynotes & Speaking", reason: "Apply as a speaker to build credibility. AI generates your submission materials and speaker profile.", priceRange: "$2,500 – $10,000", difficulty: "Medium", nodeId: "keynotes" },
      { label: "Big Ticket Consulting", reason: "Package your expertise into premium consulting offers. AI creates proposals and session frameworks.", priceRange: "$5,000 – $25,000", difficulty: "Advanced", nodeId: "big-ticket" },
      { label: "Training Programs", reason: "Half-day and full-day corporate training programs built from your frameworks. High-ticket B2B revenue.", priceRange: "$3,000 – $15,000/day", difficulty: "Advanced", nodeId: "training" },
      { label: "Masterminds", reason: "Quarterly mastermind groups for your most committed audience. High retention and recurring revenue.", priceRange: "$500 – $2,000/quarter", difficulty: "Advanced", nodeId: "masterminds" },
      { label: "Retreats & Bootcamps", reason: "2-3 day immersive experiences. Premium pricing with high transformation value.", priceRange: "$1,500 – $5,000", difficulty: "Advanced", nodeId: "retreats" },
      { label: "Certification", reason: "License your methodology. Others pay to teach your frameworks — the ultimate scalable revenue.", priceRange: "$2,000 – $10,000", difficulty: "Advanced", nodeId: "certification" },
    ],
    closingNote: "Start with 1-on-1 Coaching for immediate premium revenue. Add Keynotes as your audience grows. Pursue Masterminds, Retreats, and Certification once you have 1,000+ engaged followers.",
  },
};

/**
 * Map from nodeId to the dashboard `section` key that renders its builder.
 * Single source of truth for both /dashboard?section= URLs and the new nested
 * /dashboard/book/:bookId/build/:node routes.
 */
export const NODE_TO_SECTION: Record<string, { section: string; extraParams?: Record<string, string> }> = {
  "social-media": { section: "social-media" },
  workbooks: { section: "workbooks", extraParams: { builder: "workbook" } },
  webinars: { section: "webinars" },
  audiobook: { section: "audiobook-studio" },
  "coaching-1on1": { section: "coaching", extraParams: { builder: "coaching-1on1" } },
  keynotes: { section: "speaking" },
  courses: { section: "courses", extraParams: { builder: "online-course" } },
  "home-study": { section: "home-study" },
  "email-marketing": { section: "email-marketing" },
  "podcast-guest": { section: "podcast" },
  memberships: { section: "memberships" },
  "group-coaching": { section: "group-coaching" },
  "lead-magnet": { section: "lead-magnet" },
  "book-sales-events": { section: "book-sales" },
  "special-editions": { section: "special-editions" },
  microsite: { section: "microsite-manager" },
  website: { section: "microsite-manager" },
  "lead-magnets": { section: "lead-magnet" },
  "big-ticket": { section: "big-ticket" },
  training: { section: "training" },
  masterminds: { section: "masterminds" },
  retreats: { section: "retreats" },
  certification: { section: "certification" },
};

/** Lookup the dashboard section + extra params for a node, or null. */
export function getNodeSection(nodeId: string): { section: string; extraParams?: Record<string, string> } | null {
  return NODE_TO_SECTION[nodeId] || null;
}

/**
 * Direct-route map for nodes that have a dedicated /node-builder/<NODE_ID>
 * builder and should bypass the legacy /dashboard?section= gating.
 *
 * Bug fix (Apr 2026): BA-14..BA-18 had no NODE_TO_SECTION entries (or were
 * gated as "Coming Soon" via the section gate), so clicking "Open & Manage"
 * on those cards was a no-op. Each builder file already exists under
 * src/components/dashboard/builders/ba14..ba18, so we route straight there.
 */
const NODE_TO_NODE_BUILDER: Record<string, string> = {
  "group-coaching": "BA-13",
  "podcast-guest": "BA-14",
  "in-house-speaker": "BA-15",
  affiliates: "BA-16",
  upsells: "BA-17",
  "revenue-sharing": "BA-18",
};

/**
 * Map from nodeId to its dashboard studio path.
 * Prefers /node-builder/<NODE_ID> for nodes with dedicated builders,
 * then the nested /dashboard/book/:bookId/build/:node URL when bookId is
 * provided, falling back to the legacy /dashboard?section= URL otherwise.
 */
export function getStudioPath(nodeId: string, bookId: string, titleParam: string): string | null {
  // Direct node-builder route (skips dashboard section gating)
  const directCode = NODE_TO_NODE_BUILDER[nodeId];
  if (directCode) {
    const qs = new URLSearchParams();
    if (bookId) qs.set("bookId", bookId);
    // titleParam arrives as e.g. "&bookTitle=foo" — strip the leading "&"
    const cleanedTitle = (titleParam || "").replace(/^&/, "");
    if (cleanedTitle) {
      const [k, v] = cleanedTitle.split("=");
      if (k && v !== undefined) qs.set(k, decodeURIComponent(v));
    }
    const search = qs.toString();
    return `/node-builder/${directCode}${search ? `?${search}` : ""}`;
  }

  const entry = NODE_TO_SECTION[nodeId];
  if (!entry) return null;
  const extra = entry.extraParams
    ? "&" + Object.entries(entry.extraParams).map(([k, v]) => `${k}=${v}`).join("&")
    : "";
  if (bookId) {
    // New nested route — keeps "you're inside this book" in the URL.
    return `/dashboard/book/${bookId}/build/${nodeId}?bookId=${bookId}${titleParam}${extra}`;
  }
  return `/dashboard?section=${entry.section}${extra}`;
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
  // Superadmins bypass ALL gating — everything is available
  if (isSuperAdmin) {
    return "available";
  }

  // If we have DB gating data, use it
  if (openNodeIds) {
    if (openNodeIds.has(node.id)) {
      // DB says open → override any hardcoded "coming-soon" / "planned" to "available"
      return node.status === "coming-soon" || node.status === "planned" ? "available" : node.status;
    }
    return "coming-soon";
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
 */
export function getEffectiveCategory(
  catId: AbbyCategory,
  _isAdmin: boolean,
  isSuperAdmin = false,
  openNodeIds?: Set<string>,
): AbbyCategoryConfig {
  const cat = ABBY_CATEGORIES[catId];
  if (!cat) return cat;

  return {
    ...cat,
    nodes: cat.nodes.map((n) => ({
      ...n,
      status: getEffectiveNodeStatus(n, catId, _isAdmin, isSuperAdmin, openNodeIds),
    })),
  };
}
