/**
 * Single source of truth for node readiness rules.
 *
 * IMPORTANT — DO NOT FORK THIS FILE.
 * This module is imported by THREE consumers:
 *   1. Frontend hook `useBookNodeProgress` (Book Hub category tabs)
 *   2. Frontend hook `useNodeLiveStats`     (effectiveStatus on dashboard cards)
 *   3. Edge function `author-stats`         (dashboard book card + MultiBookPicker)
 *
 * Frontend imports go through `src/lib/node-readiness.ts` which re-exports
 * everything from this file (relative path import — no Vite alias needed).
 * The edge function imports it as `../_shared/node-readiness.ts`.
 *
 * If you add or change a readiness rule here, ALL three consumers pick it up
 * automatically. The 22 → 26 → 24 counter-bug class came from drifting these
 * rules across two files; never reintroduce that.
 *
 * The module is pure: no React, no Supabase client, no DOM. Safe in Deno + Vite.
 */

/**
 * Author-level nodes: their Live status applies across every book in the
 * author's library (one email list, one podcast show, one set of social
 * channels per author). Book-specific products (microsite, workbook,
 * course, audiobook, book-sales, etc.) stay scoped to a single book_id.
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

// ---------------------------------------------------------------------------
// Helpers (pure)
// ---------------------------------------------------------------------------

function nonEmptyString(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function anyNonEmptyString(obj: any, keys: string[]): boolean {
  if (!obj || typeof obj !== "object") return false;
  return keys.some((k) => nonEmptyString(obj[k]));
}

// ---------------------------------------------------------------------------
// Readiness gate
// ---------------------------------------------------------------------------

/**
 * Returns true when a node's `content_json` carries enough substantive
 * content to count as "truly built" for dashboard counters.
 *
 * A node may be marked status='live' in the DB, but if its required content
 * assets are missing the UI must NOT show a Live badge.
 *
 * Adding a new gated node? Add a case here only.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hasRequiredAssets(nodeId: string, content: any): boolean {
  if (!content || typeof content !== "object") return false;
  switch (nodeId) {
    case "BP-04": {
      // Author Microsite. Must have a primary anchor (hero_headline OR a
      // populated sections[]) AND at least one supporting field.
      // Rationale: `cta_label` is autofilled to "Get the Book" by the builder,
      // and `hero_subheadline` alone isn't a microsite. We need both a
      // primary anchor and a supporting field to count this as Live.
      const hasHeroHeadline = nonEmptyString(content.hero_headline);
      const hasSections = Array.isArray(content.sections) && content.sections.length > 0;
      const hasPrimary = hasHeroHeadline || hasSections;
      if (!hasPrimary) return false;
      const supportingFields = ["about_long", "about_short", "hero_subheadline", "lead_magnet_id"];
      const hasSupporting = supportingFields.some((k) => {
        const v = content[k];
        return typeof v === "string" ? v.trim().length > 0 : !!v;
      });
      return hasSupporting;
    }
    case "BA-13": {
      // Group coaching needs at least a session schedule or cohort config.
      const hasSchedule = Array.isArray(content.sessions) ? content.sessions.length > 0 : !!content.schedule;
      return hasSchedule;
    }
    case "BA-14": {
      // Podcast Tour — two paths:
      //  - RSS path: publicly distributed (Spotify/Apple). One episode is enough
      //    because distribution itself is the achievement.
      //  - Activated path: built locally, RSS not yet wired. Requires ≥ 2 episodes
      //    + a show title to filter out "I clicked the activate button to see
      //    what it does" cases.
      const rssReady = !!(content.rss_url || content.rss_feed_url || content?.transistor?.show_id);
      const episodes = Array.isArray(content.episodes) ? content.episodes : [];
      const activatedWithContent =
        !!content.activated &&
        episodes.length >= 2 &&
        !!(content.show_title || content.podcast_title);
      return (rssReady && episodes.length >= 1) || activatedWithContent;
    }
    case "BA-15": {
      // Media Outreach: needs a press release plus a populated outlets list.
      // Press release may be a string OR an object. For object form, require
      // BOTH a headline AND a body-equivalent field — a headline alone is a
      // working title, not a release.
      const pr = content.press_release ?? content.press_release_html ?? content?.assets?.press_release;
      let hasPressRelease = false;
      if (typeof pr === "string") {
        hasPressRelease = pr.trim().length > 0;
      } else if (pr && typeof pr === "object") {
        const hasHeadline = nonEmptyString((pr as any).headline);
        const hasBody = anyNonEmptyString(pr, ["body", "html", "content", "text"]);
        hasPressRelease = hasHeadline && hasBody;
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

// ---------------------------------------------------------------------------
// Dev-only "stuck node" diagnostic
// ---------------------------------------------------------------------------

/**
 * Logs a one-line warning when a node is marked live in the DB but fails
 * the readiness gate. Pure side-effect, never throws, safe to call in any
 * runtime. Callers gate on env (import.meta.env.DEV in Vite, or always-on
 * in edge functions where logs are admin-only).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function warnIfStuckLive(nodeId: string, status: string | null | undefined, content: any, ctx?: string): void {
  try {
    if (status !== "live") return;
    if (hasRequiredAssets(nodeId, content)) return;
    const where = ctx ? ` (${ctx})` : "";
    // eslint-disable-next-line no-console
    console.warn(`[node-readiness] ${nodeId}${where} marked live but failed readiness gate`);
  } catch {
    /* never throw from a diagnostic */
  }
}
