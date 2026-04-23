/**
 * Value Ladder Engine
 * 
 * Calculates portfolio-level pricing intelligence, identifies gaps,
 * and provides ROI projections across all builder products.
 */

import type { SubscriptionTier } from "@/hooks/useAuth";
import { TIERS } from "@/hooks/useAuth";

// ── Value Ladder Tiers ────────────────────────────────────────────
export type ValueLadderPosition = "bait" | "tripwire" | "core" | "premium" | "high_ticket";

export interface ValueLadderTier {
  position: ValueLadderPosition;
  label: string;
  priceRange: string;
  minPrice: number;
  maxPrice: number;
  color: string;       // Tailwind bg class token
  textColor: string;   // Tailwind text class token
  description: string;
}

export const VALUE_LADDER_TIERS: ValueLadderTier[] = [
  {
    position: "bait",
    label: "Free Lead Magnet",
    priceRange: "Free",
    minPrice: 0,
    maxPrice: 0,
    color: "bg-emerald-100",
    textColor: "text-emerald-700",
    description: "Build your email list with free downloads",
  },
  {
    position: "tripwire",
    label: "Tripwire",
    priceRange: "$7 – $47",
    minPrice: 7,
    maxPrice: 47,
    color: "bg-sky-100",
    textColor: "text-sky-700",
    description: "Low-risk first purchase to build buyer trust",
  },
  {
    position: "core",
    label: "Core Offer",
    priceRange: "$97 – $297",
    minPrice: 97,
    maxPrice: 297,
    color: "bg-violet-100",
    textColor: "text-violet-700",
    description: "Your primary transformation product",
  },
  {
    position: "premium",
    label: "Premium",
    priceRange: "$297 – $997",
    minPrice: 297,
    maxPrice: 997,
    color: "bg-amber-100",
    textColor: "text-amber-700",
    description: "High-value group or done-with-you offers",
  },
  {
    position: "high_ticket",
    label: "High Ticket",
    priceRange: "$997+",
    minPrice: 997,
    maxPrice: 25000,
    color: "bg-rose-100",
    textColor: "text-rose-700",
    description: "Premium 1-on-1 or consulting packages",
  },
];

// ── Product Portfolio Item ────────────────────────────────────────
export interface PortfolioProduct {
  builderId: string;
  builderLabel: string;
  category: "build" | "bridge" | "yield";
  status: "planned" | "in_progress" | "published";
  price: number;
  valueLadderPosition: ValueLadderPosition;
  monthlyRevenueEstimate: number;
}

// ── Revenue Benchmarks per Builder ────────────────────────────────
const REVENUE_BENCHMARKS: Record<string, { lowMonthly: number; highMonthly: number; defaultPrice: number; position: ValueLadderPosition }> = {
  "workbook":          { lowMonthly: 100,  highMonthly: 1500,  defaultPrice: 0,    position: "bait" },
  "social-media":      { lowMonthly: 0,    highMonthly: 0,     defaultPrice: 0,    position: "bait" },
  "email-marketing":   { lowMonthly: 0,    highMonthly: 0,     defaultPrice: 0,    position: "bait" },
  "audiobook":         { lowMonthly: 200,  highMonthly: 2000,  defaultPrice: 19,   position: "tripwire" },
  "home-study":        { lowMonthly: 300,  highMonthly: 2000,  defaultPrice: 27,   position: "tripwire" },
  "book-sales":        { lowMonthly: 100,  highMonthly: 1000,  defaultPrice: 15,   position: "tripwire" },
  "special-editions":  { lowMonthly: 50,   highMonthly: 500,   defaultPrice: 29,   position: "tripwire" },
  "online-course":     { lowMonthly: 500,  highMonthly: 5000,  defaultPrice: 197,  position: "core" },
  "upsell":            { lowMonthly: 200,  highMonthly: 2000,  defaultPrice: 97,   position: "core" },
  "membership":        { lowMonthly: 500,  highMonthly: 5000,  defaultPrice: 47,   position: "core" },
  "webinar":           { lowMonthly: 300,  highMonthly: 3000,  defaultPrice: 197,  position: "core" },
  "podcast-scripts":   { lowMonthly: 100,  highMonthly: 1000,  defaultPrice: 0,    position: "bait" },
  "website":           { lowMonthly: 0,    highMonthly: 0,     defaultPrice: 0,    position: "bait" },
  "coaching":          { lowMonthly: 1000, highMonthly: 10000, defaultPrice: 497,  position: "premium" },
  "group-coaching":    { lowMonthly: 1000, highMonthly: 8000,  defaultPrice: 297,  position: "premium" },
  "masterminds":       { lowMonthly: 2000, highMonthly: 15000, defaultPrice: 497,  position: "premium" },
  "big-ticket":        { lowMonthly: 2000, highMonthly: 25000, defaultPrice: 2500, position: "high_ticket" },
  "keynotes":          { lowMonthly: 2000, highMonthly: 15000, defaultPrice: 5000, position: "high_ticket" },
  "in-house-speaker":  { lowMonthly: 1500, highMonthly: 10000, defaultPrice: 3000, position: "high_ticket" },
  "training-programs": { lowMonthly: 2000, highMonthly: 15000, defaultPrice: 5000, position: "high_ticket" },
  "retreats":          { lowMonthly: 3000, highMonthly: 20000, defaultPrice: 2497, position: "high_ticket" },
  "certification":     { lowMonthly: 3000, highMonthly: 25000, defaultPrice: 4997, position: "high_ticket" },
  "affiliates":        { lowMonthly: 200,  highMonthly: 3000,  defaultPrice: 0,    position: "bait" },
  "jv-partnerships":   { lowMonthly: 500,  highMonthly: 5000,  defaultPrice: 0,    position: "core" },
  "conventions":       { lowMonthly: 500,  highMonthly: 5000,  defaultPrice: 0,    position: "core" },
  "fundraising":       { lowMonthly: 1000, highMonthly: 10000, defaultPrice: 0,    position: "premium" },
  "exhibitors":        { lowMonthly: 500,  highMonthly: 3000,  defaultPrice: 0,    position: "core" },
};

// ── Engine Functions ──────────────────────────────────────────────

/** Get default value ladder position for a builder */
export function getDefaultPosition(builderId: string): ValueLadderPosition {
  return REVENUE_BENCHMARKS[builderId]?.position || "core";
}

/** Get revenue benchmark for a builder */
export function getRevenueBenchmark(builderId: string) {
  return REVENUE_BENCHMARKS[builderId] || { lowMonthly: 0, highMonthly: 0, defaultPrice: 0, position: "core" as const };
}

/** Get the ValueLadderTier config for a position */
export function getTierConfig(position: ValueLadderPosition): ValueLadderTier {
  return VALUE_LADDER_TIERS.find(t => t.position === position) || VALUE_LADDER_TIERS[2];
}

/** Classify a price into a value ladder position */
export function classifyPrice(price: number): ValueLadderPosition {
  if (price <= 0) return "bait";
  if (price <= 47) return "tripwire";
  if (price <= 297) return "core";
  if (price <= 997) return "premium";
  return "high_ticket";
}

// ── Portfolio Analysis ────────────────────────────────────────────

export interface PortfolioAnalysis {
  products: PortfolioProduct[];
  totalMonthlyRevenueLow: number;
  totalMonthlyRevenueHigh: number;
  /** Avg of low and high */
  projectedMonthlyRevenue: number;
  /** Annual projection */
  projectedAnnualRevenue: number;
  /** Positions that are filled */
  filledPositions: ValueLadderPosition[];
  /** Positions that are missing */
  gaps: ValueLadderPosition[];
  /** Subscription cost */
  subscriptionCost: number;
  /** ROI multiplier (projected revenue / subscription cost) */
  roiMultiplier: number;
  /** Platform fee total (5%) */
  platformFees: number;
  /** Net after fees */
  netMonthlyRevenue: number;
}

/**
 * Analyze a portfolio of products and return intelligence.
 */
export function analyzePortfolio(
  products: PortfolioProduct[],
  subscriptionTier: SubscriptionTier,
): PortfolioAnalysis {
  let totalLow = 0;
  let totalHigh = 0;

  for (const product of products) {
    const benchmark = REVENUE_BENCHMARKS[product.builderId];
    if (benchmark) {
      totalLow += benchmark.lowMonthly;
      totalHigh += benchmark.highMonthly;
    } else {
      totalLow += product.monthlyRevenueEstimate * 0.5;
      totalHigh += product.monthlyRevenueEstimate * 1.5;
    }
  }

  const projected = Math.round((totalLow + totalHigh) / 2);
  const platformFees = Math.round(projected * 0.08);
  const netMonthly = projected - platformFees;

  const filledPositions = [...new Set(products.map(p => p.valueLadderPosition))];
  const allPositions: ValueLadderPosition[] = ["bait", "tripwire", "core", "premium", "high_ticket"];
  const gaps = allPositions.filter(pos => !filledPositions.includes(pos));

  const subCost = subscriptionTier === "free" ? 0 :
    TIERS[subscriptionTier as keyof typeof TIERS]?.monthlyPrice || 0;

  const roi = subCost > 0 ? Math.round((netMonthly / subCost) * 10) / 10 : 0;

  return {
    products,
    totalMonthlyRevenueLow: totalLow,
    totalMonthlyRevenueHigh: totalHigh,
    projectedMonthlyRevenue: projected,
    projectedAnnualRevenue: projected * 12,
    filledPositions,
    gaps,
    subscriptionCost: subCost,
    roiMultiplier: roi,
    platformFees,
    netMonthlyRevenue: netMonthly,
  };
}

/**
 * Build portfolio products from generated_assets data.
 * Returns PortfolioProduct[] from builder content records.
 */
export function buildPortfolioFromAssets(
  assets: Array<{ asset_type: string; content: string }>,
): PortfolioProduct[] {
  const products: PortfolioProduct[] = [];

  for (const asset of assets) {
    // Match builder_content_* or builder_draft_* asset types
    const contentMatch = asset.asset_type.match(/^builder_content_(.+)$/);
    const draftMatch = asset.asset_type.match(/^builder_draft_(.+)$/);
    const builderId = contentMatch?.[1] || draftMatch?.[1];

    if (!builderId || !REVENUE_BENCHMARKS[builderId]) continue;

    // Avoid duplicates (content takes priority over draft)
    if (draftMatch && products.some(p => p.builderId === builderId)) continue;

    const benchmark = REVENUE_BENCHMARKS[builderId];
    let price = benchmark.defaultPrice;
    let status: PortfolioProduct["status"] = contentMatch ? "published" : "in_progress";

    // Try to extract price from content if it's JSON
    try {
      const parsed = JSON.parse(asset.content);
      if (parsed?.stepData?.setup?.price) price = Number(parsed.stepData.setup.price) || price;
      if (parsed?.stepData?.setup?.status === "published") status = "published";
    } catch (error) {
      // Content is markdown, use defaults
    }

    const category = getBuilderCategory(builderId);

    products.push({
      builderId,
      builderLabel: getBuilderLabel(builderId),
      category,
      status,
      price,
      valueLadderPosition: classifyPrice(price) || benchmark.position,
      monthlyRevenueEstimate: Math.round((benchmark.lowMonthly + benchmark.highMonthly) / 2),
    });
  }

  return products;
}

// ── Helper Maps ──────────────────────────────────────────────────

function getBuilderCategory(builderId: string): "build" | "bridge" | "yield" {
  const bridgeBuilders = ["coaching", "group-coaching", "keynotes", "in-house-speaker", "training-programs", "affiliates", "jv-partnerships", "big-ticket"];
  const yieldBuilders = ["retreats", "certification", "conventions", "fundraising", "exhibitors", "masterminds"];
  if (bridgeBuilders.includes(builderId)) return "bridge";
  if (yieldBuilders.includes(builderId)) return "yield";
  return "build";
}

function getBuilderLabel(builderId: string): string {
  const labels: Record<string, string> = {
    "workbook": "Workbook",
    "social-media": "Social Media",
    "email-marketing": "Email Marketing",
    "audiobook": "Audiobook",
    "home-study": "Home Study Course",
    "book-sales": "Book Sales",
    "special-editions": "Special Editions",
    "online-course": "Online Course",
    "upsell": "Upsells/Downsells",
    "membership": "Monthly Membership",
    "webinar": "Webinars",
    "podcast-scripts": "Podcast Scripts",
    "website": "Author Website",
    "coaching": "1-on-1 Coaching",
    "group-coaching": "Group Coaching",
    "masterminds": "Masterminds",
    "big-ticket": "High Ticket Consulting",
    "keynotes": "Keynote Speaking",
    "in-house-speaker": "In-House Speaking",
    "training-programs": "Training Programs",
    "retreats": "Retreats & Bootcamps",
    "certification": "Certification Program",
    "affiliates": "Affiliate Program",
    "jv-partnerships": "JV Partnerships",
    "conventions": "Events & Conventions",
    "fundraising": "Fundraising",
    "exhibitors": "Exhibitor Sponsorships",
  };
  return labels[builderId] || builderId;
}

/**
 * Get gap recommendation: what the author should build next.
 */
export function getGapRecommendation(gaps: ValueLadderPosition[]): {
  position: ValueLadderPosition;
  reason: string;
  suggestedBuilders: string[];
} | null {
  // Priority: bait → core → tripwire → premium → high_ticket
  const priority: ValueLadderPosition[] = ["bait", "core", "tripwire", "premium", "high_ticket"];

  for (const pos of priority) {
    if (gaps.includes(pos)) {
      const suggestions: Record<ValueLadderPosition, { reason: string; builders: string[] }> = {
        bait: {
          reason: "You need a free lead magnet to build your email list. This is the foundation of your value ladder.",
          builders: ["workbook", "podcast-scripts", "social-media"],
        },
        tripwire: {
          reason: "A low-cost product ($7-$47) builds buyer trust and identifies your best prospects.",
          builders: ["audiobook", "home-study", "book-sales"],
        },
        core: {
          reason: "Your core offer ($97-$297) is where most of your revenue comes from.",
          builders: ["online-course", "membership", "webinar"],
        },
        premium: {
          reason: "Premium offers ($297-$997) serve your most committed audience and boost average order value.",
          builders: ["coaching", "group-coaching", "masterminds"],
        },
        high_ticket: {
          reason: "High-ticket offers ($997+) create transformational income from fewer clients.",
          builders: ["big-ticket", "keynotes", "retreats", "certification"],
        },
      };

      const rec = suggestions[pos];
      return { position: pos, reason: rec.reason, suggestedBuilders: rec.builders };
    }
  }

  return null;
}
