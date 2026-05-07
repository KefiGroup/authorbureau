# 02 · AB Node Readiness Gates — Full Specification

_Version: 2026-05-01 · Sprint 54 (uniform `library_asset` contract)_

**Source(s) of truth:**
- `supabase/functions/_shared/node-readiness.ts` (verbatim source below)
- `mem://business/uniform-readiness-contract`

---

## Sprint 54 — Uniform `library_asset` contract (PRIMARY GATE)

A node is **100% Live** when `content_json.library_asset.url` is set AND `library_asset.kind === REQUIRED_KIND[nodeId]`. The legacy per-node switch documented below remains as a transitional fallback for rows published before Sprint 54.

```json
content_json.library_asset = {
  "kind": "docx" | "pptx" | "audio_mp3" | "audio_zip" |
          "email_sequence" | "podcast_pack" | "external_url",
  "url": "https://…",
  "pdf_url": "https://…" | null,
  "txt_url": "https://…" | null,
  "title": "…",
  "saved_at": "ISO-8601"
}
```

### REQUIRED_KIND — 28 nodes

| Node | Name | `kind` |
|------|------|--------|
| BP-01 | Email Marketing | `email_sequence` |
| BP-02 | Lead Magnet | `docx` |
| BP-03 | Social Media | `docx` |
| BP-04 | Author Microsite | `external_url` |
| BP-05 | Webinar / Event | `pptx` |
| BP-06 | Workbook | `docx` |
| BP-07 | Home Study Course | `docx` |
| BP-08 | Special Editions | `docx` |
| BP-09 | Book Sales | `external_url` |
| BA-10 | Online Course | `docx` |
| BA-11 | Audiobook | `audio_zip` |
| BA-12 | Membership | `docx` |
| BA-13 | Group Coaching | `docx` |
| BA-14 | Podcast | `podcast_pack` |
| BA-15 | Media & PR | `docx` |
| BA-16 | Affiliates | `docx` |
| BA-17 | Bundles | `docx` |
| BA-18 | JV Partnerships | `docx` |
| YR-19 | 1-on-1 Coaching | `docx` |
| YR-20 | Speaking | `docx` |
| YR-21 | Workshops | `pptx` |
| YR-22 | Corporate Training | `pptx` |
| YR-23 | Mastermind | `docx` |
| YR-24 | Retreat | `docx` |
| YR-25 | Certification | `docx` |
| YR-26 | Licensing | `docx` |
| YR-27 | Fundraising | `docx` |
| YR-28 | Sponsors | `docx` |

**Three-format output policy**: any `docx` kind emits DOCX + PDF + TXT. PPTX kinds emit PPTX + PDF + TXT (script). Audio emits native + TXT (script). No "TXT not needed" exceptions.

**Storage**: paid deliverables (BP-06, BP-07, BA-10, BA-12, BA-13, BA-17, YR-19, YR-21, YR-22, YR-23, YR-25) → private bucket `library-assets` with signed URLs. Free deliverables → public bucket `library-assets-public`.

**Stripe still excluded**: payout setup is admin-side; Authors Bureau is Merchant of Record on every transaction.

---

## Legacy per-node fallback (transitional)

For each of the 28 nodes, this document states the **exact** rule that `legacyHasRequiredAssets()` applies as a fallback when `library_asset` is absent. **BP-06 update (Sprint 54)**: now also accepts `workbook_title` (builder-native field) and `activated=true + sections[]`.

## Plain-English summary

| Node | Required content |
|---|---|
| BP-01 Email Marketing | A sequence exists with ≥ 1 step (`email_sequence_id` + `steps[]`) OR legacy `sequence_steps[]`. |
| BP-02 Lead Magnet | Generic gate (any non-empty content_json). Lead-magnet builder writes substantial content. |
| BP-03 Social Media | A 30-day calendar generated (`posts_generated > 0` OR `content_calendar_id` OR `posts[]`). |
| BP-04 Author Website | Primary anchor (`hero_headline` OR `sections[]`) AND ≥ 1 supporting field (about, subheadline, lead magnet). |
| BP-05 Webinars | Generic gate. |
| BP-06 Workbook | Title present AND (`pdf_url` OR commerce signal). |
| BP-07 Home Study | Title present AND (`course_id` OR commerce signal). |
| BP-08 Special Editions | Generic gate. |
| BP-09 Book Sales | Title present AND (`amazon_url` OR `sales_page_url` OR commerce signal). |
| BA-10 Online Course | Title present AND (`course_id` OR ≥ 1 module OR commerce signal). |
| BA-11 Audiobook | `narration_script_url` OR `acx_guide_generated === true` OR `chapters[]`. |
| BA-12 Membership | Title present AND `stripe_price_id`. |
| BA-13 Group Coaching | `sessions[]` OR `schedule` string. **Note:** Code comment says "BA-13 is a paid offer" but the rule does NOT enforce a commerce signal — known divergence. |
| BA-14 Podcast | RSS ready AND ≥ 1 episode, OR activated + ≥ 2 episodes + show title. |
| BA-15 Media & PR | Press release (string OR object with headline + body) AND outlets list. |
| BA-16 Affiliates | Generic gate. |
| BA-17 Bundles | Title present AND ≥ 2 items AND commerce signal. |
| BA-18 JV Partnerships | Generic gate. |
| YR-19 to YR-28 | Title + commerce signal. **Session-style** (YR-19, YR-22, YR-23, YR-24) additionally need `session_type` OR `booking_url`. |

**Commerce signal** = any of: `stripe_price_id` set, `price_usd > 0`, `suggested_price_usd > 0`, OR a `sales_tiers[]` entry with `price_usd > 0`.

> There is **intentionally no Stripe-connection gate** in any rule. Authors Bureau is Merchant of Record — the platform's Stripe account always processes reader payments. Author payout setup is admin-side. See `04-stripe-connection-rules.md`.

## Verbatim source — the switch statement

```typescript
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
      // Podcast — two paths:
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
```

## Generic fallback (default branch)

```typescript
default:
  // Any object with at least one key passes. Used for BP-02, BP-05,
  // BP-08, BA-16, BA-18 where rich builders save substantial content_json
  // and per-shape gates would create more false negatives than benefits.
  return Object.keys(content).length > 0;
```

## Diagnostic

```typescript
warnIfStuckLive(nodeId, status, content, ctx?)
```

Logs a one-line warning when a node has `status === 'live'` but fails the readiness gate. Pure side-effect, never throws.
