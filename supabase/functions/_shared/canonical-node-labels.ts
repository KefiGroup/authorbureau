/**
 * Canonical node labels — single source of truth for edge functions.
 *
 * Mirrors `src/components/dashboard/builders/builderNodeConfig.ts` `META[].label`.
 * Edge functions run in Deno and can't import from `src/`, so this map is
 * duplicated by design. If the canonical label changes in `builderNodeConfig.ts`,
 * update it here too — the `upsertAuthorNode` guard rail will warn on drift but
 * the canonical UI label is the source of truth.
 *
 * DO NOT hardcode `NODE_NAME` strings inside individual generators —
 * always call `getCanonicalNodeLabel(NODE_ID)`.
 *
 * 28 nodes (BP-01..BP-09, BA-10..BA-18, YR-19..YR-28).
 * BP-00 is an internal book-analysis pre-step, NOT a node — intentionally absent.
 */

export const CANONICAL_NODE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  // Brand Products
  "BP-01": "Email Marketing",
  "BP-02": "Lead Magnet",
  "BP-03": "Social Media",
  "BP-04": "Author Website",
  "BP-05": "Webinars",
  "BP-06": "Workbook",
  "BP-07": "Home Study Course",
  "BP-08": "Special Editions",
  "BP-09": "Book Sales",

  // Build Authority
  "BA-10": "Online Course",
  "BA-11": "Audiobook",
  "BA-12": "Membership",
  "BA-13": "Group Coaching",
  "BA-14": "Podcast",
  "BA-15": "Media & PR",
  "BA-16": "Affiliates",
  "BA-17": "Bundles",
  "BA-18": "JV Partnerships",

  // Yield Revenue
  "YR-19": "1-on-1 Coaching",
  "YR-20": "Big Ticket Consulting",
  "YR-21": "Speaking",
  "YR-22": "Corporate Training",
  "YR-23": "Mastermind",
  "YR-24": "Retreats",
  "YR-25": "Certification",
  "YR-26": "Conference",
  "YR-27": "Fundraising",
  "YR-28": "Sponsors",
});

/**
 * Returns the canonical UI label for a node_id, or the id itself
 * if the id is unknown (defensive — never throws).
 */
export function getCanonicalNodeLabel(nodeId: string): string {
  return CANONICAL_NODE_LABELS[nodeId] ?? nodeId;
}

/**
 * True when the provided label exactly matches the canonical label for the id.
 * Used by the upsertAuthorNode guard rail to detect generator drift.
 */
export function isCanonicalNodeLabel(nodeId: string, label: string): boolean {
  const canonical = CANONICAL_NODE_LABELS[nodeId];
  return canonical === undefined || canonical === label;
}
