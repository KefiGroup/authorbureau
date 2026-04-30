/**
 * Author-level nodes: their Live status applies across every book in the
 * author's library (one email list, one podcast show, one set of social
 * channels per author). Book-specific products (microsite, workbook,
 * course, audiobook, book-sales, etc.) stay scoped to a single book_id.
 *
 * Single source of truth — imported by both useBookNodeProgress and
 * useNodeLiveStats so dashboards stay consistent.
 */
export const AUTHOR_LEVEL_NODES = new Set<string>([
  "BP-01", // Email Marketing
  "BP-03", // Social Media
  "BA-14", // Podcast (one show, multi-book episodes)
  "BA-15", // Press / Media
  "BA-16", // Affiliates
  "BA-18", // JV Partners
  "YR-19", "YR-20", "YR-21", "YR-22", "YR-23",
  "YR-24", "YR-25", "YR-26", "YR-27", "YR-28",
]);

/**
 * Single source of truth for "is a node truly ready / live?".
 *
 * A node may be marked status='live' in the DB, but if its required content
 * assets are missing the UI must NOT show a Live badge. This helper is the
 * one canonical gate used by:
 *   - useNodeLiveStats   (effectiveStatus on dashboard cards)
 *   - useBookNodeProgress (tile state in Book Hub category tabs)
 *
 * Adding a new gated node? Add a case here only — both hooks pick it up.
 */
export function hasRequiredAssets(nodeId: string, content: any): boolean {
  if (!content || typeof content !== "object") return false;
  switch (nodeId) {
    case "BP-04": {
      // Author Website: must have at least one substantive content field —
      // not just the autofilled microsite_url / book_id stub written by the
      // author_nodes_autofill_delivery_url trigger.
      const fields = [
        "hero_headline", "hero_subheadline", "about_long", "about_short",
        "cta_label", "lead_magnet_id",
      ];
      const hasField = fields.some((k) => {
        const v = content[k];
        return typeof v === "string" ? v.trim().length > 0 : !!v;
      });
      const hasSections = Array.isArray(content.sections) && content.sections.length > 0;
      return hasField || hasSections;
    }
    case "BA-13": {
      // Group coaching needs at least a session schedule or cohort config
      const hasSchedule = Array.isArray(content.sessions) ? content.sessions.length > 0 : !!content.schedule;
      return hasSchedule;
    }
    case "BA-14": {
      // Podcast Tour: pass when distributed (RSS + episodes) OR when the
      // author has activated the show locally with episodes + a title.
      // The current builder marks `activated: true` even before RSS is
      // wired, so we accept that as Live.
      const rssReady = !!(content.rss_url || content.rss_feed_url || content?.transistor?.show_id);
      const episodes = Array.isArray(content.episodes) ? content.episodes : [];
      const activatedWithContent =
        !!content.activated &&
        episodes.length > 0 &&
        !!(content.show_title || content.podcast_title);
      return (rssReady && episodes.length > 0) || activatedWithContent;
    }
    case "BA-15": {
      // Media Outreach: needs a press release plus a populated outlets list.
      // The current builder writes outlets under `target_media_outlets`;
      // older generations used `media_list` / `outlets`. Accept any of the three.
      // Press release may be a string OR an object with body/html/headline.
      const pr = content.press_release ?? content.press_release_html ?? content?.assets?.press_release;
      let hasPressRelease = false;
      if (typeof pr === "string") {
        hasPressRelease = pr.trim().length > 0;
      } else if (pr && typeof pr === "object") {
        const candidates = ["body", "html", "headline", "content", "text"];
        hasPressRelease = candidates.some((k) => typeof (pr as any)[k] === "string" && (pr as any)[k].trim().length > 0);
      }
      const outletArrays = [content.target_media_outlets, content.media_list, content.outlets];
      const hasOutlets = outletArrays.some((a: any) => Array.isArray(a) && a.length > 0);
      return hasPressRelease && hasOutlets;
    }
    default:
      // Generic gate: any object with at least one key passes. Most builders
      // write a rich content_json on save, so this is correct for the
      // remaining 24 nodes.
      return Object.keys(content).length > 0;
  }
}
