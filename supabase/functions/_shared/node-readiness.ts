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

/**
 * Commerce-bearing nodes per the Master Architecture (Engine map).
 *
 * IMPORTANT — INFORMATIONAL ONLY. This set does NOT gate Live status.
 *
 * Authors Bureau is the Merchant of Record: ALL reader payments flow into
 * the platform's Stripe account via `create-checkout-session`, regardless
 * of whether the individual author has connected Stripe Express. The
 * author's Stripe Express connection is a back-office payout-method
 * decision (automated transfer vs. admin-handled manual payout) and must
 * NEVER affect commerce readiness or the X / 28 Live count.
 *
 * Kept exported for documentation, analytics, and tests.
 */
export const COMMERCE_NODES = new Set<string>([
  "BP-06", "BP-07", "BP-09",
  "BA-10", "BA-12", "BA-13", "BA-17",
  "YR-19", "YR-20", "YR-21", "YR-22", "YR-23",
  "YR-24", "YR-25", "YR-26", "YR-27", "YR-28",
]);

/**
 * Session-style YR nodes also need a session-type/booking signal in addition
 * to their commerce signal — these are the nodes that resolve into bookable
 * 1:1 or cohort time blocks (per Sessions Engine in the architecture).
 */
const SESSION_STYLE_YR_NODES = new Set<string>([
  "YR-19", // 1-on-1 Coaching
  "YR-22", // Corporate Training / Certification cohort
  "YR-23", // Mastermind
  "YR-24", // Retreat
]);

/**
 * Optional readiness context that callers can pass in. All fields are
 * optional. Reserved for future shared context — DO NOT add a
 * `stripeConnected` flag back here: payout setup is a back-office concern
 * and never gates commerce readiness (Authors Bureau is Merchant of
 * Record on every transaction).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ReadinessContext {}

// ---------------------------------------------------------------------------
// Helpers (pure)
// ---------------------------------------------------------------------------

function nonEmptyString(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function nonEmptyArray(v: any): boolean {
  return Array.isArray(v) && v.length > 0;
}

function anyNonEmptyString(obj: any, keys: string[]): boolean {
  if (!obj || typeof obj !== "object") return false;
  return keys.some((k) => nonEmptyString(obj[k]));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasCommerceSignal(content: any): boolean {
  if (!content || typeof content !== "object") return false;
  if (nonEmptyString(content.stripe_price_id)) return true;
  const price = Number(content.price_usd ?? content.suggested_price_usd ?? 0);
  if (price > 0) return true;
  // Sales tier with a paid item also counts as commerce wired.
  const tiers = Array.isArray(content.sales_tiers) ? content.sales_tiers : null;
  if (tiers && tiers.some((t: any) => Number(t?.price_usd ?? 0) > 0)) return true;
  return false;
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
export function hasRequiredAssets(
  nodeId: string,
  content: any,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx: ReadinessContext = {},
): boolean {
  if (!content || typeof content !== "object") return false;

  // NOTE: There is intentionally no Stripe-connection gate here.
  // Authors Bureau is Merchant of Record — reader payments always flow to
  // the platform Stripe account. Author payout setup is admin-side and
  // must not affect Live status. See COMMERCE_NODES doc above.

  switch (nodeId) {
    // ---- BRAND PRODUCTS ----------------------------------------------------
    case "BP-01": {
      // Email Marketing — Email Engine wired: a sequence exists with at
      // least one step. Either the new model (sequence_id + steps[]) or
      // the legacy inline shape (sequence_steps[]) counts.
      if (nonEmptyString(content.email_sequence_id) && nonEmptyArray(content.steps)) {
        return true;
      }
      if (nonEmptyArray(content.sequence_steps)) return true;
      // Resend connection alone is not enough — the architecture requires
      // ABBY to have generated something to actually send.
      return false;
    }
    case "BP-03": {
      // Social Media — Buffer is permanently removed. The architecture says
      // ABBY generates a 30-day calendar; the author posts manually. So we
      // gate on calendar presence, NOT on any external connector.
      const generated = Number(content.posts_generated ?? 0);
      if (generated > 0) return true;
      if (nonEmptyString(content.content_calendar_id)) return true;
      if (nonEmptyArray(content.posts)) return true;
      return false;
    }
    case "BP-04": {
      // Author Microsite. Must have a primary anchor (hero_headline OR a
      // populated sections[]) AND at least one supporting field.
      // Rationale: `cta_label` is autofilled to "Get the Book" by the builder,
      // and `hero_subheadline` alone isn't a microsite. We need both a
      // primary anchor and a supporting field to count this as Live.
      const hasHeroHeadline = nonEmptyString(content.hero_headline);
      const hasSections = nonEmptyArray(content.sections);
      const hasPrimary = hasHeroHeadline || hasSections;
      if (!hasPrimary) return false;
      const supportingFields = ["about_long", "about_short", "hero_subheadline", "lead_magnet_id"];
      const hasSupporting = supportingFields.some((k) => {
        const v = content[k];
        return typeof v === "string" ? v.trim().length > 0 : !!v;
      });
      return hasSupporting;
    }
    case "BP-06": {
      // Workbook — Commerce Engine product OR a delivered PDF.
      if (!nonEmptyString(content.title)) return false;
      return nonEmptyString(content.pdf_url) || hasCommerceSignal(content);
    }
    case "BP-07": {
      // Home Study Course — Course Engine wired (course_id) OR commerce.
      if (!nonEmptyString(content.title)) return false;
      return nonEmptyString(content.course_id) || hasCommerceSignal(content);
    }
    case "BP-09": {
      // Book Sales — at least one sales channel wired.
      if (!nonEmptyString(content.title)) return false;
      return (
        nonEmptyString(content.amazon_url) ||
        nonEmptyString(content.sales_page_url) ||
        hasCommerceSignal(content)
      );
    }

    // ---- BUILD AUTHORITY ---------------------------------------------------
    case "BA-10": {
      // Online Course — Course Engine wired OR ≥1 module built OR commerce.
      if (!nonEmptyString(content.title)) return false;
      const modules = Array.isArray(content.modules) ? content.modules : [];
      return (
        nonEmptyString(content.course_id) ||
        modules.length > 0 ||
        hasCommerceSignal(content)
      );
    }
    case "BA-11": {
      // Audiobook — manual ACX submission per architecture. Gate on the
      // narration script existing OR the ACX guide having been generated.
      if (nonEmptyString(content.narration_script_url)) return true;
      if (content.acx_guide_generated === true) return true;
      // Legacy: the existing isLive check upstream still respects activated
      // flow with episodes; keep that path open via the generic acceptance
      // of an `episodes`-style array if the audiobook builder writes one.
      if (nonEmptyArray(content.chapters)) return true;
      return false;
    }
    case "BA-12": {
      // Membership — recurring subscription, must have Stripe price wired.
      if (!nonEmptyString(content.title)) return false;
      return nonEmptyString(content.stripe_price_id);
    }
    case "BA-13": {
      // Group coaching needs at least a session schedule or cohort config,
      // AND (when the caller supplies it) Stripe must be connected because
      // BA-13 is a paid offer per the architecture.
      const hasSchedule = nonEmptyArray(content.sessions) || nonEmptyString(content.schedule);
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
    case "BA-17": {
      // Bundles — Commerce-wired AND must contain ≥ 2 bundled items
      // (a "bundle" of one is just the underlying product).
      if (!nonEmptyString(content.title)) return false;
      const items = Array.isArray(content.items) ? content.items : [];
      return items.length >= 2 && hasCommerceSignal(content);
    }

    // ---- YIELD REVENUE -----------------------------------------------------
    case "YR-19":
    case "YR-20":
    case "YR-21":
    case "YR-22":
    case "YR-23":
    case "YR-24":
    case "YR-25":
    case "YR-26":
    case "YR-27":
    case "YR-28": {
      // All Yield nodes must have a title and be commerce-wired. Session-
      // style nodes additionally need a session_type or booking_url so the
      // Sessions Engine has something to attach to.
      if (!nonEmptyString(content.title)) return false;
      if (!hasCommerceSignal(content)) return false;
      if (SESSION_STYLE_YR_NODES.has(nodeId)) {
        return nonEmptyString(content.session_type) || nonEmptyString(content.booking_url);
      }
      return true;
    }

    default:
      // Generic gate: any object with at least one key passes. Used for the
      // small remainder of nodes (BP-02 lead magnets, BP-05 webinars,
      // BP-08 special editions, BA-16 affiliates, BA-18 JV) where richer
      // builders write substantial content_json on save and per-shape gates
      // would create more false negatives than they prevent.
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
export function warnIfStuckLive(
  nodeId: string,
  status: string | null | undefined,
  content: any,
  ctx?: string | ReadinessContext,
): void {
  try {
    if (status !== "live") return;
    const readinessCtx: ReadinessContext = typeof ctx === "object" && ctx !== null ? ctx : {};
    if (hasRequiredAssets(nodeId, content, readinessCtx)) return;
    const where = typeof ctx === "string" && ctx ? ` (${ctx})` : "";
    // eslint-disable-next-line no-console
    console.warn(`[node-readiness] ${nodeId}${where} marked live but failed readiness gate`);
  } catch {
    /* never throw from a diagnostic */
  }
}
