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

// Builders use diverse title keys (course_title, programme_title, mastermind_title…).
// Any one of these counts as a node title.
const ANY_TITLE_KEYS = [
  "title",
  "workbook_title",
  "course_title",
  "programme_title",
  "program_title",
  "mastermind_title",
  "retreat_title",
  "membership_title",
  "edition_title",
  "kit_title",
  "media_kit_title",
  "product_ladder_title",
  "jv_strategy_title",
  "practice_title",
  "conference_title",
  "show_title",
  "podcast_title",
  "webinar_title",
  "hero_headline",
  "funnel_name",
  "speaker_headline",
];

function hasAnyTitle(c: any): boolean {
  return anyNonEmptyString(c, ANY_TITLE_KEYS);
}

// Substantive built-content arrays produced by the various builders.
const SUBSTANCE_ARRAYS = [
  "sections", "modules", "items", "packages", "tiers", "sessions",
  "weeks", "study_weeks", "bundles", "editions", "offers",
  "episodes", "chapters", "lead_magnets", "webinar_topics",
  "training_formats", "programme_outline", "curriculum_pillars",
  "membership_tiers", "retreat_options", "sample_itinerary",
  "event_formats", "sponsorship_packages", "ideal_partners",
  "target_media_outlets", "media_list", "outlets",
  "affiliate_resources", "upsell_sequences", "welcome_emails",
  "follow_up_emails", "sequence_steps", "steps", "posts",
];

function hasSubstantiveBuild(c: any): boolean {
  if (!c || typeof c !== "object") return false;
  return SUBSTANCE_ARRAYS.some((k) => nonEmptyArray(c[k]));
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
// Uniform library_asset contract (Sprint 54 — Node Deliverables v2)
// ---------------------------------------------------------------------------

/**
 * The canonical "100% Live" contract: every node, on publish, writes a
 * `library_asset` object onto `content_json` describing the end-state
 * deliverable saved to the author's library. A node is Live when
 *   asset.url is set AND asset.kind === REQUIRED_KIND[nodeId].
 *
 * This is the single source of truth — see
 *   docs/02-business-rules/02-node-readiness-gates-full-spec.md
 *   mem://business/uniform-readiness-contract
 *
 * The legacy per-node switch below remains as a transitional fallback so
 * rows that were marked Live before Sprint 54 don't regress before they
 * are next published.
 */
export type LibraryAssetKind =
  | "docx"
  | "pptx"
  | "audio_mp3"
  | "audio_zip"
  | "email_sequence"
  | "podcast_pack"
  | "external_url";

export const REQUIRED_KIND: Record<string, LibraryAssetKind> = {
  "BP-01": "email_sequence",
  "BP-02": "docx",
  "BP-03": "docx",
  "BP-04": "external_url",
  "BP-05": "pptx",
  "BP-06": "docx",
  "BP-07": "docx",
  "BP-08": "docx",
  "BP-09": "external_url",
  "BA-10": "docx",
  "BA-11": "audio_zip",
  "BA-12": "docx",
  "BA-13": "docx",
  "BA-14": "podcast_pack",
  "BA-15": "docx",
  "BA-16": "docx",
  "BA-17": "docx",
  "BA-18": "docx",
  "YR-19": "docx",
  "YR-20": "docx",
  "YR-21": "pptx",
  "YR-22": "pptx",
  "YR-23": "docx",
  "YR-24": "docx",
  "YR-25": "docx",
  "YR-26": "docx",
  "YR-27": "docx",
  "YR-28": "docx",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasValidLibraryAsset(nodeId: string, content: any): boolean {
  const asset = content?.library_asset;
  if (!asset || typeof asset !== "object") return false;
  if (!nonEmptyString(asset.url)) return false;
  const required = REQUIRED_KIND[nodeId];
  if (!required) return false;
  return asset.kind === required;
}

// ---------------------------------------------------------------------------
// Readiness gate
// ---------------------------------------------------------------------------

/**
 * Returns true when a node's `content_json` carries enough substantive
 * content to count as "truly built" for dashboard counters.
 *
 * Order of precedence:
 *   1. Uniform contract: a valid library_asset whose kind matches REQUIRED_KIND.
 *   2. Legacy per-node fallback (kept until every builder writes library_asset).
 *
 * A node may be marked status='live' in the DB, but if neither check passes
 * the UI must NOT show a Live badge.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hasRequiredAssets(
  nodeId: string,
  content: any,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx: ReadinessContext = {},
): boolean {
  if (!content || typeof content !== "object") return false;

  // 1. Uniform contract (Sprint 54+): library_asset.url + matching kind.
  if (hasValidLibraryAsset(nodeId, content)) return true;

  // 2. Legacy fallback — bridge for rows published before Sprint 54.
  return legacyHasRequiredAssets(nodeId, content);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function legacyHasRequiredAssets(nodeId: string, content: any): boolean {
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
    case "BP-05": {
      // Webinars — title required; live when slides/registration URL,
      // commerce signal, OR a built webinar_topics list exists.
      if (!hasAnyTitle(content)) return false;
      if (nonEmptyString(content.slides_url) || nonEmptyString(content.registration_url)) return true;
      if (hasCommerceSignal(content)) return true;
      return hasSubstantiveBuild(content);
    }
    case "BP-06": {
      const hasTitle = hasAnyTitle(content);
      if (!hasTitle) return false;
      if (nonEmptyString(content.pdf_url)) return true;
      if (hasCommerceSignal(content)) return true;
      if (content.activated === true && hasSubstantiveBuild(content)) return true;
      return false;
    }
    case "BP-07": {
      // Home Study Course — Course Engine wired (course_id), commerce, OR
      // a substantive curriculum (study_weeks/sections) when activated.
      if (!hasAnyTitle(content)) return false;
      if (nonEmptyString(content.course_id) || hasCommerceSignal(content)) return true;
      return content.activated === true && hasSubstantiveBuild(content);
    }
    case "BP-08": {
      // Special Editions — title + (commerce OR built editions/bundle).
      if (!hasAnyTitle(content)) return false;
      if (hasCommerceSignal(content)) return true;
      return content.activated === true && hasSubstantiveBuild(content);
    }
    case "BP-09": {
      if (!hasAnyTitle(content)) return false;
      return (
        nonEmptyString(content.amazon_url) ||
        nonEmptyString(content.sales_page_url) ||
        hasCommerceSignal(content) ||
        (content.activated === true && hasSubstantiveBuild(content))
      );
    }

    // ---- BUILD AUTHORITY ---------------------------------------------------
    case "BA-10": {
      if (!hasAnyTitle(content)) return false;
      const modules = Array.isArray(content.modules) ? content.modules : [];
      return (
        nonEmptyString(content.course_id) ||
        modules.length > 0 ||
        hasCommerceSignal(content) ||
        hasSubstantiveBuild(content)
      );
    }
    case "BA-11": {
      if (nonEmptyString(content.narration_script_url)) return true;
      if (content.acx_guide_generated === true) return true;
      if (nonEmptyArray(content.chapters)) return true;
      return false;
    }
    case "BA-12": {
      // Membership — recurring subscription. Live when Stripe price wired
      // OR (activated + tiered offer built).
      if (!hasAnyTitle(content)) return false;
      if (nonEmptyString(content.stripe_price_id)) return true;
      return content.activated === true && hasSubstantiveBuild(content);
    }
    case "BA-13": {
      const hasSchedule = nonEmptyArray(content.sessions) || nonEmptyString(content.schedule);
      if (hasSchedule) return true;
      // Activated programme with curriculum (weeks[]) also qualifies.
      return hasAnyTitle(content) && content.activated === true && hasSubstantiveBuild(content);
    }
    case "BA-14": {
      const rssReady = !!(content.rss_url || content.rss_feed_url || content?.transistor?.show_id);
      const episodes = Array.isArray(content.episodes) ? content.episodes : [];
      const activatedWithContent =
        !!content.activated &&
        episodes.length >= 2 &&
        !!(content.show_title || content.podcast_title);
      return (rssReady && episodes.length >= 1) || activatedWithContent;
    }
    case "BA-15": {
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
    case "BA-16": {
      // Affiliates — activated + commission structure / resources built.
      if (!hasAnyTitle(content)) return false;
      if (content.activated !== true) return false;
      return (
        anyNonEmptyString(content, ["commission_structure", "payout_schedule", "recruitment_strategy"]) ||
        hasSubstantiveBuild(content)
      );
    }
    case "BA-17": {
      if (!hasAnyTitle(content)) return false;
      const items = Array.isArray(content.items) ? content.items : [];
      const bundles = Array.isArray(content.bundles) ? content.bundles : [];
      if (items.length >= 2 && hasCommerceSignal(content)) return true;
      // Activated bundle with ≥1 built bundle definition also counts.
      return content.activated === true && bundles.length >= 1;
    }
    case "BA-18": {
      // JV Partnerships — activated + ideal partners list + pitch template.
      if (!hasAnyTitle(content)) return false;
      if (content.activated !== true) return false;
      const hasPartners = nonEmptyArray(content.ideal_partners);
      const hasPitch = nonEmptyString(content.pitch_template);
      return hasPartners && hasPitch;
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
      // Title (any of the diverse builder keys) is required. Live when
      // commerce-wired OR activated with substantive built content
      // (packages, offers, programme_outline, retreat_options, etc.).
      if (!hasAnyTitle(content)) return false;
      if (hasCommerceSignal(content)) {
        if (SESSION_STYLE_YR_NODES.has(nodeId)) {
          return nonEmptyString(content.session_type) || nonEmptyString(content.booking_url) || hasSubstantiveBuild(content);
        }
        return true;
      }
      return content.activated === true && hasSubstantiveBuild(content);
    }

    case "BP-02": {
      // Lead Magnets — activated + at least one built lead magnet.
      if (content.activated !== true) return false;
      if (nonEmptyArray(content.lead_magnets)) return true;
      return (
        nonEmptyString(content.recommended_lead_magnet) &&
        (nonEmptyArray(content.quiz_structure?.questions) ||
          nonEmptyArray(content.checklist_structure?.items) ||
          !!content.optin_page ||
          !!content.thankyou_page)
      );
    }

    default: {
      // Strict default (Sprint 56 consistency fix): nodes without an
      // explicit legacy rule MUST satisfy the uniform library_asset
      // contract to count as Live. Any non-empty content_json without a
      // valid library_asset stays in "Building" status, which is what the
      // dashboard cards render as 🔨 Building 60%.
      // Affected fallback nodes: BP-02, BP-08, BA-16, BA-18.
      // (The library_asset check has already run above in hasRequiredAssets.)
      return false;
    }
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
