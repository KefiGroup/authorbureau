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
      const hasPressRelease = !!(content.press_release || content.press_release_html || content?.assets?.press_release);
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
