/**
 * Maps node IDs to their public microsite URL slugs.
 * Used by the microsite router and success screens.
 * Nodes without a slug (e.g. BP-01, BP-03) have no public page.
 */

export const NODE_SLUG_MAP: Record<string, string> = {
  "BP-02": "free-gift",
  "BP-04": "author-website",
  "BP-05": "webinar",
  "BP-06": "workbook",
  "BP-07": "home-study",
  "BP-08": "special-edition",
  "BP-09": "book",
  "BA-10": "online-course",
  "BA-11": "audiobook",
  "BA-12": "membership",
  "BA-13": "group-coaching",
  "BA-14": "podcast",
  "BA-15": "press",
  "BA-16": "affiliates",
  "BA-17": "bundles",
  "BA-18": "partners",
  "YR-19": "coaching",
  "YR-20": "vip",
  "YR-21": "speaking",
  "YR-22": "corporate-training",
  "YR-23": "mastermind",
  "YR-24": "retreat",
  "YR-25": "certification",
  "YR-26": "conference",
  "YR-27": "fundraising",
  "YR-28": "sponsors",
};

/**
 * Reverse lookup: slug → nodeId.
 * Includes alias slugs so multiple public URLs resolve to the same node:
 *   - "course"            → BP-07 (alias of "home-study")
 *   - "special-editions"  → BP-08 (plural alias of "special-edition")
 *   - "order"             → BP-09 (alias of "book")
 */
const SLUG_ALIASES: Record<string, string> = {
  "course": "BP-07",
  "special-editions": "BP-08",
  "order": "BP-09",
};

export const SLUG_TO_NODE: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(NODE_SLUG_MAP)
      .filter(([, slug]) => slug !== "")
      .map(([nodeId, slug]) => [slug, nodeId])
  ),
  ...SLUG_ALIASES,
};

/** Nodes that have NO public microsite page */
export const NO_MICROSITE_NODES = new Set(["BP-01", "BP-03"]);

/** Node names for display */
export const NODE_NAMES: Record<string, string> = {
  "BP-01": "Email Marketing",
  "BP-02": "Lead Magnets",
  "BP-03": "Social Media",
  "BP-04": "Website / Microsite",
  "BP-05": "Webinars",
  "BP-06": "Workbook",
  "BP-07": "Home Study Course",
  "BP-08": "Special Editions",
  "BP-09": "Book Sales",
  "BA-10": "Online Course",
  "BA-11": "Audiobook",
  "BA-12": "Membership Site",
  "BA-13": "Group Coaching",
  "BA-14": "Podcast",
  "BA-15": "Press & Media",
  "BA-16": "Affiliate Programme",
  "BA-17": "Upsells & Bundles",
  "BA-18": "JV Partners",
  "YR-19": "1-on-1 Coaching",
  "YR-20": "Big Ticket Offers",
  "YR-21": "Keynote Speaking",
  "YR-22": "Corporate Training",
  "YR-23": "Mastermind",
  "YR-24": "Retreats",
  "YR-25": "Certification Programme",
  "YR-26": "Conferences",
  "YR-27": "Fundraising",
  "YR-28": "Exhibitors & Sponsors",
};

/**
 * Builds the full microsite URL for a given node.
 * Returns null for nodes without public pages.
 */
export function getMicrositeUrl(penNameSlug: string, nodeId: string): string | null {
  if (NO_MICROSITE_NODES.has(nodeId)) return null;
  const slug = NODE_SLUG_MAP[nodeId];
  if (slug === undefined) return null;
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://authorbureau.lovable.app';
  return `${base}/${penNameSlug}/${slug}`;
}
