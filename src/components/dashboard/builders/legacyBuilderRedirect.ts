/**
 * Maps legacy UniversalBuilderStudio IDs (and dashboard section names) to
 * the dedicated `/node-builder/<NODE_ID>` route they should redirect to.
 *
 * The legacy 5-step "Configure → Let Abby Build → Edit Content → Design →
 * Preview & Publish" flow has been retired. Every node now uses the unified
 * "Introduction → Generating → Review → Publish → Live" flow rendered by
 * the dedicated BPxx / BAxx / YRxx builders mounted via /node-builder/:nodeId.
 *
 * Old links like `/dashboard?builder=lead-magnet` or `/dashboard?section=
 * lead-magnet` keep working: the dashboard reads this map and issues a
 * <Navigate replace> to the canonical builder route.
 */

export const LEGACY_BUILDER_REDIRECT: Record<string, string> = {
  // Brand Products (BP)
  "email-flows": "BP-01",
  "email-marketing": "BP-01",
  "lead-magnet": "BP-02",
  "social-media": "BP-03",
  "website": "BP-04",
  "book-sales": "BP-05",
  "workbook": "BP-06",
  "audiobook": "BP-07",
  "special-editions": "BP-08",
  "podcast": "BP-09",

  // Build Authority (BA)
  "online-course": "BA-10",
  "home-study-course": "BA-11",
  "home-study": "BA-11",
  "audiobook-build": "BA-11",
  "membership": "BA-12",
  "memberships": "BA-12",
  "group-coaching": "BA-13",
  "podcast-tour": "BA-14",
  "media-pr": "BA-15",
  "affiliate": "BA-16",
  "affiliates": "BA-16",
  "upsell": "BA-17",
  "upsells": "BA-17",
  "jv-partnership": "BA-18",
  "partnership": "BA-18",

  // Yield Revenue (YR)
  "coaching-1on1": "YR-19",
  "coaching": "YR-19",
  "big-ticket": "YR-20",
  "speaking": "YR-21",
  "keynotes": "YR-21",
  "corporate-training": "YR-22",
  "training-programs": "YR-22",
  "mastermind": "YR-23",
  "masterminds": "YR-23",
  "retreat": "YR-24",
  "retreats": "YR-24",
  "certification": "YR-25",
  "convention": "YR-26",
  "conventions": "YR-26",
  "conference": "YR-26",
  "fundraising": "YR-27",
  "exhibitors": "YR-28",
  "sponsors": "YR-28",
};

export function resolveLegacyBuilderRoute(legacyId: string | null | undefined): string | null {
  if (!legacyId) return null;
  const nodeId = LEGACY_BUILDER_REDIRECT[legacyId];
  return nodeId ? `/node-builder/${nodeId}` : null;
}
