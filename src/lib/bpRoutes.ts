/**
 * Canonical routing for BP-01 to BP-05 (Branding & Marketing nodes).
 * Single source of truth — all hubs and builders import from here.
 */

export interface BpRouteParams {
  bookId?: string;
  bookTitle?: string;
  bookCoverUrl?: string;
}

const BP_SECTIONS: Record<string, { section: string; builder?: string }> = {
  "BP-01": { section: "email-marketing", builder: "email-flows" },
  "BP-02": { section: "lead-magnet", builder: "lead-magnet" },
  "BP-03": { section: "social-media", builder: "social-media" },
  "BP-04": { section: "microsite-manager" },
  "BP-05": { section: "webinars", builder: "webinar" },
};

/**
 * Build a canonical dashboard route for a BP node.
 * Includes bookId/bookTitle when provided so UniversalBuilderStudio
 * has the context it needs and doesn't redirect to My Books Hub.
 */
export function getBpBuildRoute(nodeId: string, params?: BpRouteParams): string {
  const cfg = BP_SECTIONS[nodeId];
  if (!cfg) return `/node-builder/${nodeId}`;

  const sp = new URLSearchParams();
  sp.set("section", cfg.section);
  if (cfg.builder) sp.set("builder", cfg.builder);
  if (params?.bookId) sp.set("bookId", params.bookId);
  if (params?.bookTitle) sp.set("bookTitle", params.bookTitle);
  if (params?.bookCoverUrl) sp.set("bookCoverUrl", params.bookCoverUrl);

  return `/dashboard?${sp.toString()}`;
}

/** Check whether a node ID is a legacy BP that should be redirected */
export function isLegacyBpNode(nodeId: string): boolean {
  return nodeId in BP_SECTIONS;
}
