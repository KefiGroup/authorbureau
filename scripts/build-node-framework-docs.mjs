#!/usr/bin/env node
/**
 * scripts/build-node-framework-docs.mjs
 *
 * Regenerates docs/04-node-frameworks/<ID>.md from the canonical registry
 * defined in docs/01-architecture/01-master-architecture-reference.md.
 *
 * v3.2 (Sprint 53 — Documentation Re-do):
 *   - Sections 1–7 (framework spec) preserved.
 *   - Sections 8–12 added (technical appendix): content_json schema, edge
 *     functions, DB tables, ABBY prompt pointer, UI source files.
 *   - All filename pointers updated post-Sprint 50 renames (BP-06/07/08/09
 *     + BA-17 now point to canonical generator folders).
 *
 * Single source of truth: NODES below. Edit here, run, commit.
 *
 * Run: node scripts/build-node-framework-docs.mjs
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const VERSION = "3.2";
const DATE = "2026-05-01";

/**
 * NODE shape:
 *   [id, label, category(Brand|Build|Yield), scope(Author|Book), edgeFn, content]
 *   content = {
 *     what, abby, author, reader, gate, revenue, deps,           // §1–7
 *     contentJson,    // §8 — TS-ish interface
 *     edgeFns,        // §9 — array of related edge function paths
 *     tables,         // §10 — array of DB tables touched
 *     promptRef,      // §11 — pointer into 03-abby-ai/03-node-activation-prompts.md
 *     ui,             // §12 — array of UI source paths
 *   }
 */
const NODES = [
  ["BP-01", "Email Marketing", "Brand", "Author", "generate-bp01-email-marketing", {
    what: "The author's master email list and the welcome sequence that turns a reader into a subscriber. Single source of truth for everything ABBY sends to the author's audience.",
    abby: "Engine: **Email Engine** (Resend). ABBY drafts a 3–10 step welcome sequence using the book's hook, theme, and call-to-action. Stored in `email_flows` + `email_flow_steps`; sequence ID written to `author_nodes.content_json.email_sequence_id`.",
    author: "1) Open BP-01 builder. 2) Confirm sender name + reply-to address (writes `author_email_settings`). 3) Review the auto-drafted sequence — edit subject lines and bodies. 4) Click Activate. The Email Engine starts enrolling new contacts immediately.",
    reader: "Reader hits a microsite or lead-magnet form → submits email → enters the welcome sequence step 1 within minutes → receives subsequent steps on cadence → can unsubscribe via per-author signed token at any time.",
    gate: "`email_sequence_id` set AND `steps[]` non-empty (new model), OR `sequence_steps[]` non-empty (legacy).",
    revenue: "Indirect — feeds every paid offer downstream. Direct revenue when a sequence step contains a Buy CTA for BP-09 / BP-06 / BA-10.",
    deps: "Resend connector (platform-managed, always on). Recommended: BP-02 (lead magnet) for the entry point.",
    contentJson: `{
  email_sequence_id: string;        // FK → email_flows.id
  steps: Array<{                    // mirrored from email_flow_steps for fast read
    subject: string;
    body_html: string;
    delay_hours: number;
  }>;
  sequence_steps?: Array<...>;      // legacy shape, still accepted by gate
}`,
    edgeFns: ["generate-bp01-email-marketing", "generate-email-sequence", "trigger-sequence", "process-email-flows", "send-transactional-email"],
    tables: ["email_flows", "email_flow_steps", "email_flow_enrollments", "email_send_log", "author_email_settings", "author_nodes"],
    promptRef: "BP-01 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/bp01/", "src/components/marketing-hub/EmailSequenceTab.tsx"],
  }],
  ["BP-02", "Lead Magnet", "Brand", "Book", "generate-bp02-lead-magnets", {
    what: "A 2–3-minute quiz / assessment that captures email in exchange for a personalised result. The book's #1 list-builder.",
    abby: "Engines: **Funnel + Email**. ABBY generates 8 questions, 5 result tiers, 3 headline variants per `mem://ai/lead-magnet-generation-specs`. Companion functions: `generate-bp02-social-pack` (distribution graphics) and `bp02-activate-funnel` (publishes the microsite).",
    author: "1) Open BP-02 builder. 2) Pick a template (6 visual templates available). 3) Approve quiz + results. 4) Pick the headline variant (Identity / Outcome / Curiosity). 5) Activate — public lead-magnet microsite goes live.",
    reader: "Reader sees gate → answers 8 questions → receives result tier (HTML inline + email follow-up) → enters BP-01 sequence (CRM score +10).",
    gate: "Generic gate — any non-empty `content_json` passes. The lead-magnet builder always writes substantial content on save.",
    revenue: "Indirect — top-of-funnel for every downstream offer.",
    deps: "BP-01 (sequence to enrol into). Optional: BP-04 (microsite to embed CTA on).",
    contentJson: `{
  funnel_id: string;                // FK → funnels.id
  template_id: string;              // 1 of 6 visual templates
  headline_variant: "identity" | "outcome" | "curiosity";
  questions: Array<{ id; prompt; options: Array<{label;tier_weight}> }>;  // exactly 8
  result_tiers: Array<{ tier; headline; copy; recommended_offer }>;       // exactly 5
  social_pack_id?: string;          // FK → marketing_assets (when generated)
}`,
    edgeFns: ["generate-bp02-lead-magnets", "generate-bp02-social-pack", "bp02-activate-funnel", "submit-funnel", "submit-quiz-response", "track-funnel-view", "microsite-action"],
    tables: ["funnels", "funnel_submissions", "quiz_responses", "leads", "marketing_assets", "author_nodes", "newsletter_signups"],
    promptRef: "BP-02 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/bp02/", "src/pages/MicrositePage.tsx (lead-magnet stage)"],
  }],
  ["BP-03", "Social Media", "Brand", "Author", "generate-bp03-social-media", {
    what: "A 30-day social calendar plus on-demand graphic composer. Buffer was permanently removed in Sprint 37 — authors post manually.",
    abby: "Engines: **content store** + Social Designer. ABBY generates the calendar with `generate-social-content`. The 2-step `compose-social-post` (background → burn-in) renders graphics across 6 templates × 5 platforms with brand-kit auto-pull.",
    author: "1) Open BP-03 builder. 2) Generate the 30-day calendar. 3) Use Design All to render every post graphic. 4) Activate. 5) Copy + paste posts manually to each platform.",
    reader: "Reader sees the post on a social platform → clicks through to lead magnet OR microsite → enters the funnel.",
    gate: "Calendar generated (`posts_generated > 0` OR `content_calendar_id` set OR `posts[]` non-empty). No external connector check.",
    revenue: "Indirect — top-of-funnel discovery.",
    deps: "None (manual posting). Optional cross-push: BP-02 lead magnet for CTA.",
    contentJson: `{
  content_calendar_id?: string;
  posts_generated: number;
  posts: Array<{
    id; platform: "instagram"|"linkedin"|"twitter"|"facebook"|"tiktok";
    caption; image_url?; scheduled_at?: string; status: "draft"|"designed"|"posted";
  }>;
}`,
    edgeFns: ["generate-bp03-social-media", "generate-social-content", "compose-social-post", "generate-social-graphic", "auto-refill-social-calendar", "social-publish", "social-scheduler", "bp03-node-state"],
    tables: ["social_media_content", "social_posts", "social_connections", "author_nodes", "marketing_assets"],
    promptRef: "BP-03 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/bp03/", "src/components/marketing-hub/SocialCalendarTab.tsx"],
  }],
  ["BP-04", "Author Website", "Brand", "Book", "generate-bp04-website", {
    what: "The book's public microsite — hero, about, lead-magnet form, learn page, and revenue offers — hosted on Authors Bureau.",
    abby: "Engine: **Microsite renderer** + content stores. ABBY generates hero copy, headline, subheadline, about (long + short), and section content. Public URL pattern: `authorsbureau.com/<author-slug>/<book-slug>`.",
    author: "1) Open BP-04 builder. 2) Review hero + about + sections. 3) Add a lead magnet (BP-02 cross-push auto-fills). 4) Activate. Owner-preview lets the logged-in author preview unpublished drafts.",
    reader: "Reader arrives via search / social / referral → reads hero + about → submits email to lead magnet → enters BP-01 sequence → returns to browse Learn / Buy sections.",
    gate: "Primary anchor (`hero_headline` non-empty OR `sections[]` non-empty) AND ≥ 1 supporting field (`about_long`, `about_short`, `hero_subheadline`, OR `lead_magnet_id`).",
    revenue: "Indirect — hub for every other node. Direct revenue when sections render `<BuyNowButton>` for BP-06/07/09 or YR offers.",
    deps: "Recommended: BP-02 (lead magnet), BP-09 (book sales). Microsite copy must respect `mem://content/public-site-logic` (no pricing visible, no em-dashes, hides empty fields).",
    contentJson: `{
  hero_headline: string;            // primary anchor
  hero_subheadline: string;
  cta_label: string;                // autofilled "Get the Book"
  about_long: string;
  about_short: string;
  lead_magnet_id?: string;          // FK → funnels.id (BP-02 cross-push)
  sections: Array<{ id; type; title; body_html; order }>;
}`,
    edgeFns: ["generate-bp04-website", "get-microsite-page", "microsite-action"],
    tables: ["author_nodes", "books", "author_profiles"],
    promptRef: "BP-04 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/bp04/", "src/pages/MicrositePage.tsx", "src/components/microsite/"],
  }],
  ["BP-05", "Webinars", "Brand", "Book", "generate-bp05-webinars", {
    what: "A live or evergreen webinar that delivers core book value and pitches a paid offer.",
    abby: "Engines: **Sessions + Email**. ABBY drafts webinar outline, slide-by-slide narrative, registration page copy, and reminder email sequence.",
    author: "1) Open BP-05 builder. 2) Set date + Zoom link (manual paste). 3) Approve registration page + emails. 4) Activate.",
    reader: "Reader registers → enrolled in reminder sequence → attends → CTA at the close → first purchase.",
    gate: "Generic gate — non-empty `content_json` passes.",
    revenue: "Indirect (list growth) + direct (offer-at-close conversions).",
    deps: "BP-01 (reminder sequence), BP-04 (registration page).",
    contentJson: `{
  webinar_id: string;
  title; date; zoom_link;            // manual paste — Daily.co removed Sprint 30
  outline: Array<{ minute; topic; key_points }>;
  slides: Array<{ id; title; body_html }>;
  registration_page: { headline; body_html; cta_label };
  reminder_sequence_id?: string;     // FK → email_flows.id
  offer_node_id?: string;            // node to pitch at the close
}`,
    edgeFns: ["generate-bp05-webinars", "webinar-register", "process-webinar-emails"],
    tables: ["webinars", "webinar_registrations", "author_nodes", "email_flows"],
    promptRef: "BP-05 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/bp05/"],
  }],
  ["BP-06", "Workbook", "Brand", "Book", "generate-bp06-workbook", {
    what: "A printable / fillable PDF companion to the book — exercises, prompts, and worksheets readers complete to apply the book's framework.",
    abby: "Engines: **Course + Commerce**. ABBY drafts modular workbook content; PDF rendered by client (`workbook-pdf.ts`). Listed via Commerce Engine; `purchases` records each transaction.",
    author: "1) Open BP-06 builder. 2) Review modules. 3) Set price (or free). 4) Activate — sales page + download flow goes live.",
    reader: "Reader buys via `<BuyNowButton>` → checkout via `create-checkout-session` → confirmation email with download link.",
    gate: "`title` set AND (`pdf_url` set OR commerce signal — `stripe_price_id` / `price_usd > 0` / paid sales tier).",
    revenue: "Direct — typically $9–$29 per unit (per `mem://business/node-revenue-architecture-estimates`).",
    deps: "BP-09 cross-push for sales-page placement. Sprint 50 renamed the generator folder from `generate-bp06-online-course` → `generate-bp06-workbook`.",
    contentJson: `{
  title: string;
  modules: Array<{ id; title; exercises: Array<{ prompt; type: "freeform"|"checklist"|"matrix" }> }>;
  pdf_url?: string;                  // Supabase Storage path once rendered
  stripe_price_id?: string;
  price_usd?: number;
  delivery_url?: string;             // autofilled by trigger
}`,
    edgeFns: ["generate-bp06-workbook", "create-checkout-session", "verify-purchase", "process-purchase", "setup-stripe-product"],
    tables: ["workbooks", "author_nodes", "purchases", "platform_config", "course_deliverables"],
    promptRef: "BP-06 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/bp06/", "src/lib/workbook-pdf.ts", "src/components/commerce/BuyNowButton.tsx"],
  }],
  ["BP-07", "Home Study Course", "Brand", "Book", "generate-bp07-home-study", {
    what: "A self-paced video / PDF course delivered as the book's mid-tier upsell. Sits between Workbook (BP-06) and Online Course (BA-10).",
    abby: "Engines: **Course + Commerce**. ABBY drafts module → lesson outline using the book's framework. Curriculum-aware sales copy via Standardized Sales Page Builder.",
    author: "1) Open BP-07 builder. 2) Approve curriculum. 3) Add lesson assets. 4) Set price. 5) Activate.",
    reader: "Reader buys → enrolment row in `course_enrollments` → `MemberPortalPage` access → progress tracked.",
    gate: "`title` set AND (`course_id` set OR commerce signal).",
    revenue: "Direct — typically $97–$297.",
    deps: "BP-06 (must precede per `mem://business/product-development-sequence`). Sprint 50 renamed the generator folder from `generate-bp07-coaching` → `generate-bp07-home-study`.",
    contentJson: `{
  title: string;
  course_id?: string;                // FK → courses.id
  modules: Array<{ id; title; lessons: Array<{ id; title; type; asset_url? }> }>;
  sales_page: { hero; problem; framework; modules_preview; testimonials; cta };  // 11-section
  stripe_price_id?: string;
  price_usd?: number;
}`,
    edgeFns: ["generate-bp07-home-study", "deploy-bp07-to-thinkific", "create-checkout-session", "verify-purchase", "process-purchase"],
    tables: ["home_study_courses", "courses", "course_modules", "course_lessons", "course_enrollments", "author_nodes", "purchases"],
    promptRef: "BP-07 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/bp07/", "src/pages/MemberPortalPage.tsx"],
  }],
  ["BP-08", "Special Editions", "Brand", "Book", "generate-bp08-special-editions", {
    what: "Limited-edition, signed, or themed special editions of the book — physical or digital scarcity products.",
    abby: "Engine: **Commerce**. ABBY drafts edition concept, sales page, scarcity copy, calendar of release windows (`special-edition-calendar.ts`).",
    author: "1) Open BP-08 builder. 2) Approve edition concept + sales page. 3) Set price + inventory cap. 4) Activate.",
    reader: "Reader buys → physical fulfilment via author's chosen logistics OR digital download.",
    gate: "Generic gate — non-empty `content_json` passes.",
    revenue: "Direct — typically $39–$199 per edition.",
    deps: "BP-09 sales channel. Sprint 50 renamed the generator folder from `generate-bp08-mastermind` → `generate-bp08-special-editions`.",
    contentJson: `{
  edition_id: string;
  edition_name; concept; release_window: { start; end };
  inventory_cap: number;             // null = unlimited
  bonus_content?: Array<{ type; url }>;
  sales_page: { hero; scarcity_copy; cta };
  stripe_price_id?: string;
  price_usd?: number;
}`,
    edgeFns: ["generate-bp08-special-editions", "create-checkout-session", "verify-purchase", "process-purchase"],
    tables: ["special_editions", "special_edition_bonus_content", "special_edition_bundles", "special_edition_marketing", "author_nodes", "purchases"],
    promptRef: "BP-08 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/bp08/"],
  }],
  ["BP-09", "Book Sales", "Brand", "Book", "generate-bp09-book-sales", {
    what: "The book itself as a paid product — Amazon link, sales page on the microsite, and conversion toolkit (decks, scripts) for live audiences.",
    abby: "Engine: **Commerce**. ABBY generates sales-page copy and live-audience conversion assets — pitches, decks, scripts. NODE_NAME resolves dynamically via `getCanonicalNodeLabel('BP-09')` → 'Book Sales' (Sprint 52 cleared the legacy 'Live Audience Conversion Toolkit' string).",
    author: "1) Open BP-09 builder. 2) Paste Amazon link OR enable platform checkout. 3) Approve sales-page copy. 4) Activate.",
    reader: "Reader clicks → either Amazon (external) OR `<BuyNowButton>` → confirmation + download / shipping.",
    gate: "`title` set AND (`amazon_url` set OR `sales_page_url` set OR commerce signal).",
    revenue: "Direct — typically $9.99–$24.99 per unit.",
    deps: "BP-04 microsite for sales page. Sprint 50 renamed the generator folder from `generate-bp09-speaking` → `generate-bp09-book-sales`.",
    contentJson: `{
  title: string;
  amazon_url?: string;
  sales_page_url?: string;
  conversion_toolkit?: { deck_url; speaking_script; pitch_email };  // for live audiences
  stripe_price_id?: string;
  price_usd?: number;
}`,
    edgeFns: ["generate-bp09-book-sales", "export-bp09-slides", "export-bp09-handout", "create-checkout-session", "verify-purchase", "process-purchase"],
    tables: ["books", "author_nodes", "purchases"],
    promptRef: "BP-09 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/bp09/", "src/pages/MicrositePage.tsx (book section)"],
  }],
  ["BA-10", "Online Course", "Build", "Book", "generate-ba10-online-course", {
    what: "The author's flagship self-paced online course — the highest-ticket Brand-tier product before YR offers.",
    abby: "Engines: **Course + Commerce**. ABBY drafts a multi-module curriculum with lessons, optionally exports to Thinkific.",
    author: "1) Open BA-10 builder. 2) Approve modules. 3) Build lessons. 4) Optionally connect Thinkific. 5) Set price. 6) Activate.",
    reader: "Reader buys → enrolment → `MemberPortalPage` (or Thinkific subdomain).",
    gate: "`title` set AND (`course_id` set OR ≥ 1 module OR commerce signal).",
    revenue: "Direct — typically $297–$1,997.",
    deps: "BP-06 + BP-07 (per product development sequence). Optional: Thinkific.",
    contentJson: `{
  title: string;
  course_id?: string;                // FK → courses.id
  modules: Array<{ id; title; lessons: Array<{ id; title; video_url?; pdf_url?; quiz_id? }> }>;
  thinkific_subdomain?: string;
  stripe_price_id?: string;
  price_usd?: number;
}`,
    edgeFns: ["generate-ba10-online-course", "deploy-ba10-to-thinkific", "sso-proxy", "create-checkout-session", "verify-purchase", "process-purchase"],
    tables: ["courses", "course_modules", "course_lessons", "course_enrollments", "course_quizzes", "module_progress", "author_nodes", "purchases"],
    promptRef: "BA-10 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/ba10/", "src/pages/MemberPortalPage.tsx"],
  }],
  ["BA-11", "Audiobook", "Build", "Book", "generate-ba11-audiobook", {
    what: "Audiobook produced from the book's manuscript via ElevenLabs TTS, distributed via ACX (manual submission).",
    abby: "Engine: **TTS pipeline** (Podcast/Audiobook engine). Functions: `generate-ba11-audiobook` (planning), `ba11-audiobook-generate` (TTS render), `ba11-publish-audiobook` (distribution package), `ba11-voice-preview` (sample).",
    author: "1) Open BA-11 builder. 2) Pick voice. 3) Generate previews. 4) Render full chapters. 5) Save & Distribute → ACX guide generated. 6) Submit to ACX manually.",
    reader: "Reader buys on Audible / Apple Books → external fulfilment.",
    gate: "`narration_script_url` set OR `acx_guide_generated === true` OR `chapters[]` non-empty.",
    revenue: "Direct — Audible royalty share (typically 25–40 % of list).",
    deps: "ElevenLabs (platform-managed). ACX submission is manual.",
    contentJson: `{
  audiobook_id: string;
  voice_id: string;                  // ElevenLabs voice
  narration_script_url?: string;
  acx_guide_generated?: boolean;
  chapters: Array<{ id; title; script_markdown; audio_url?; duration_sec? }>;
}`,
    edgeFns: ["generate-ba11-audiobook", "ba11-audiobook-generate", "ba11-publish-audiobook", "ba11-voice-preview", "elevenlabs-tts-audiobook", "elevenlabs-tts-audiobook-v2", "distribute-audiobook", "deploy-ba11-audiobook"],
    tables: ["audiobooks", "author_nodes"],
    promptRef: "BA-11 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/ba11/", "src/components/dashboard/builders/audiobook/"],
  }],
  ["BA-12", "Membership", "Build", "Book", "generate-ba12-membership", {
    what: "A recurring-revenue community / content subscription anchored to the book's framework.",
    abby: "Engine: **Commerce (recurring)**. ABBY drafts membership tiers, content calendar, sales page.",
    author: "1) Open BA-12 builder. 2) Define tier benefits. 3) Set Stripe recurring price. 4) Activate.",
    reader: "Reader subscribes via `<BuyNowButton>` → recurring charge → `membership_content` access until cancellation.",
    gate: "`title` set AND `stripe_price_id` set (recurring price required).",
    revenue: "Direct recurring — typically $19–$97 / month.",
    deps: "Stripe (platform).",
    contentJson: `{
  title: string;
  tiers: Array<{ name; benefits: string[]; stripe_price_id; price_usd; cadence: "month"|"year" }>;
  content_calendar: Array<{ date; type; title }>;
  stripe_price_id: string;           // primary tier — required for gate
}`,
    edgeFns: ["generate-ba12-membership", "create-checkout-session", "check-subscription", "cancel-subscription", "customer-portal"],
    tables: ["membership_content", "subscriptions", "author_nodes", "purchases"],
    promptRef: "BA-12 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/ba12/"],
  }],
  ["BA-13", "Group Coaching", "Build", "Book", "generate-ba13-group-coaching", {
    what: "A cohort-based group coaching programme — fixed group meeting on a schedule for a defined duration.",
    abby: "Engines: **Sessions + Commerce**. ABBY drafts cohort outline, session schedule, sales page, application form.",
    author: "1) Open BA-13 builder. 2) Set cohort dates + Zoom link. 3) Set price. 4) Activate.",
    reader: "Reader applies → accepted → buys → receives schedule + Zoom links → joins live cohort.",
    gate: "`sessions[]` non-empty OR `schedule` string set. **Known divergence:** code comment notes BA-13 is paid, but the gate does NOT enforce a commerce signal.",
    revenue: "Direct + cohort — typically $497–$2,997 per seat.",
    deps: "Stripe; manual Zoom link.",
    contentJson: `{
  title: string;
  sessions: Array<{ id; date; topic; zoom_link }>;
  schedule?: string;                 // freeform fallback
  cohort_size_cap: number;
  stripe_price_id?: string;
  price_usd?: number;
}`,
    edgeFns: ["generate-ba13-group-coaching", "create-checkout-session", "verify-purchase", "process-purchase"],
    tables: ["author_nodes", "purchases", "consultation_sessions"],
    promptRef: "BA-13 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/ba13/"],
  }],
  ["BA-14", "Podcast Tour", "Build", "Author", "generate-ba14-podcast", {
    what: "The author's own podcast hosted on Transistor.fm, distributed via RSS to Spotify / Apple. One show per author.",
    abby: "Engine: **Podcast**. ABBY generates a season arc (`generate-podcast-season`) with episode topics, then per-episode outlines.",
    author: "1) Open BA-14 builder. 2) Approve season arc. 3) Record + upload via Transistor. 4) Activate when ready.",
    reader: "Listener subscribes via Spotify / Apple → RSS delivers new episodes.",
    gate: "RSS ready (`rss_url` / `rss_feed_url` / `transistor.show_id`) AND ≥ 1 episode, OR activated + ≥ 2 episodes + show title.",
    revenue: "Indirect — discovery + authority. Optional sponsorship via YR-28.",
    deps: "Transistor.fm (platform-managed).",
    contentJson: `{
  show_title: string;
  podcast_title?: string;            // legacy alias
  rss_url?: string;
  rss_feed_url?: string;
  transistor: { show_id?: string };
  activated: boolean;
  episodes: Array<{ id; title; outline_markdown; audio_url?; published_at? }>;
}`,
    edgeFns: ["generate-ba14-podcast", "generate-podcast-season", "deploy-ba14-to-transistor"],
    tables: ["podcasts", "podcast_episodes", "author_nodes"],
    promptRef: "BA-14 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/ba14/"],
  }],
  ["BA-15", "Media & PR", "Build", "Author", "generate-ba15-media-pr", {
    what: "Press release + targeted media outreach to land podcast interviews, book reviews, and editorial features.",
    abby: "Engine: **Asset store**. ABBY drafts press release (headline + body), media list, pitch emails, author bio.",
    author: "1) Open BA-15 builder. 2) Approve press release. 3) Approve outlets list. 4) Send pitches manually.",
    reader: "Reader discovers the author via a podcast guest spot, review, or feature.",
    gate: "Press release present (string OR object with both `headline` AND a body field) AND outlets list non-empty (`target_media_outlets` / `media_list` / `outlets`).",
    revenue: "Indirect — discovery + authority signal.",
    deps: "BP-04 microsite as landing destination.",
    contentJson: `{
  press_release: string | { headline; body };  // or press_release_html
  target_media_outlets?: Array<{ name; type; contact_email; pitch_subject }>;
  media_list?: Array<...>;            // legacy alias
  outlets?: Array<...>;               // legacy alias
  pitch_email_template?: string;
  author_bio_short?: string;
  author_bio_long?: string;
}`,
    edgeFns: ["generate-ba15-media-pr", "generate-asset-pack", "generate-author-bio"],
    tables: ["marketing_assets", "author_nodes"],
    promptRef: "BA-15 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/ba15/"],
  }],
  ["BA-16", "Affiliates", "Build", "Author", "generate-ba16-affiliate", {
    what: "Affiliate programme letting other creators promote the author's products for a referral cut.",
    abby: "Engines: **CRM + Commerce**. ABBY drafts affiliate sales page, terms, recruitment email, tracked links. NODE_NAME resolves dynamically via `getCanonicalNodeLabel('BA-16')` → 'Affiliates' (Sprint 51 replaced legacy 'Affiliate Programme').",
    author: "1) Open BA-16 builder. 2) Set commission %. 3) Approve recruitment kit. 4) Activate. 5) Recruit affiliates manually.",
    reader: "Reader follows an affiliate link → standard checkout → affiliate attribution recorded.",
    gate: "Generic gate — non-empty `content_json` passes.",
    revenue: "Indirect (each affiliate sale shares revenue).",
    deps: "Stripe; one or more paid offers (BP-06/07, BA-10/12, etc.) to promote.",
    contentJson: `{
  commission_percent: number;
  affiliate_sales_page: { hero; pitch; terms_url };
  recruitment_email_template: string;
  tracked_link_pattern: string;
}`,
    edgeFns: ["generate-ba16-affiliate", "generate-asset-pack"],
    tables: ["author_nodes", "marketing_assets", "purchases"],
    promptRef: "BA-16 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/ba16/"],
  }],
  ["BA-17", "Bundles", "Build", "Book", "generate-ba17-bundles", {
    what: "Curated bundles of two or more existing offers sold as a single discounted unit. Cross-sell engine.",
    abby: "Engine: **Commerce**. ABBY suggests profitable bundle combinations and writes the sales-page copy. NODE_NAME resolves dynamically via `getCanonicalNodeLabel('BA-17')` → 'Bundles' (Sprint 51 replaced legacy 'Upsells & Bundles').",
    author: "1) Open BA-17 builder. 2) Pick ≥ 2 items from existing live offers. 3) Set bundle price. 4) Activate.",
    reader: "Reader sees bundle on microsite OR at checkout upsell → buys all items together.",
    gate: "`title` set AND ≥ 2 items in `items[]` AND commerce signal. (A 'bundle' of one is just the underlying product.)",
    revenue: "Direct — increases AOV by 30–60 % per `mem://business/node-revenue-architecture-estimates`.",
    deps: "≥ 2 live commerce nodes (BP-06/07/09, BA-10/12, etc.). Sprint 50 renamed the generator folder from `generate-ba17-upsells` → `generate-ba17-bundles`.",
    contentJson: `{
  title: string;
  items: Array<{ node_id: string; included_label }>;     // ≥ 2
  bundle_discount_percent?: number;
  sales_page: { hero; what_you_get; cta };
  stripe_price_id?: string;
  price_usd?: number;
}`,
    edgeFns: ["generate-ba17-bundles", "create-checkout-session", "verify-purchase", "process-purchase"],
    tables: ["author_nodes", "purchases"],
    promptRef: "BA-17 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/ba17/"],
  }],
  ["BA-18", "JV Partnerships", "Build", "Author", "generate-ba18-jv-partnerships", {
    what: "Cross-promotion deals with other authors — list-swaps, joint webinars, shared launches.",
    abby: "Engine: **CRM**. ABBY drafts pitch templates, partnership scope docs, swap agreements.",
    author: "1) Open BA-18 builder. 2) Approve pitch templates. 3) Activate. 4) Outreach manually to peer authors.",
    reader: "Reader joins via partner author's list → enters BP-01 sequence.",
    gate: "Generic gate — non-empty `content_json` passes.",
    revenue: "Indirect — list growth + cross-promotion.",
    deps: "BP-01 (sequence to enrol new contacts into).",
    contentJson: `{
  pitch_template: string;
  scope_doc_template: string;
  swap_agreement_template: string;
  prospect_list?: Array<{ author_name; book_title; contact }>;
}`,
    edgeFns: ["generate-ba18-jv-partnerships", "generate-asset-pack"],
    tables: ["author_nodes", "marketing_assets"],
    promptRef: "BA-18 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/ba18/"],
  }],
  ["YR-19", "1-on-1 Coaching", "Yield", "Author", "generate-yr19-coaching", {
    what: "Author's premium 1:1 coaching practice — typically monthly retainer or session packages.",
    abby: "Engines: **Sessions + Commerce**. ABBY drafts package descriptions, application form, sales page, intake email.",
    author: "1) Open YR-19 builder. 2) Define packages. 3) Set price + booking URL. 4) Activate.",
    reader: "Reader applies → discovery call → buys → schedules sessions via booking URL.",
    gate: "`title` set AND commerce signal AND (`session_type` OR `booking_url` — session-style).",
    revenue: "Direct — typically $497–$5,000 / month.",
    deps: "Stripe; external booking tool (Calendly / Zoom — link only).",
    contentJson: `{
  title: string;
  packages: Array<{ name; sessions_per_month; duration_min; price_usd; stripe_price_id }>;
  session_type: "discovery"|"intensive"|"retainer";
  booking_url: string;
  application_form_id?: string;
  intake_email_template: string;
}`,
    edgeFns: ["generate-yr19-coaching", "create-checkout-session", "consultation-session"],
    tables: ["coaching_packages", "consultation_sessions", "author_nodes", "purchases"],
    promptRef: "YR-19 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/yr19/"],
  }],
  ["YR-20", "Big Ticket Consulting", "Yield", "Author", "generate-yr20-big-ticket", {
    what: "High-value consulting engagements — typically multi-month strategic advisory.",
    abby: "Engine: **Commerce**. ABBY drafts service tiers, application form, proposal template. NODE_NAME resolves dynamically via `getCanonicalNodeLabel('YR-20')` → 'Big Ticket Consulting' (Sprint 51 replaced legacy 'Big Ticket Offers').",
    author: "1) Open YR-20 builder. 2) Define tiers. 3) Set price. 4) Activate.",
    reader: "Buyer applies → discovery call → contract → engagement.",
    gate: "`title` set AND commerce signal.",
    revenue: "Direct — typically $10k–$100k+ per engagement.",
    deps: "Stripe (or invoicing).",
    contentJson: `{
  title: string;
  tiers: Array<{ name; scope; duration_months; price_usd; stripe_price_id? }>;
  application_form_id?: string;
  proposal_template: string;
}`,
    edgeFns: ["generate-yr20-big-ticket", "create-checkout-session"],
    tables: ["author_nodes", "purchases", "service_inquiries"],
    promptRef: "YR-20 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/yr20/"],
  }],
  ["YR-21", "Speaking", "Yield", "Author", "generate-yr21-speaking", {
    what: "Speaker kit + topics list for booking the author for keynotes and panels.",
    abby: "Engine: **Asset store**. ABBY generates speaker bio, topic descriptions, demo reel page, speaking-fee guide.",
    author: "1) Open YR-21 builder. 2) Define topics + fees. 3) Add demo video link. 4) Activate.",
    reader: "Event organiser visits speaker page → fills inquiry form → booking conversation begins.",
    gate: "`title` set AND commerce signal (speaking fee).",
    revenue: "Direct — typically $5k–$50k per keynote.",
    deps: "BP-04 microsite for the speaker page.",
    contentJson: `{
  title: string;
  topics: Array<{ id; title; abstract; format: "keynote"|"workshop"|"panel" }>;
  fees: Array<{ topic_id; price_usd; travel_terms }>;
  demo_video_url?: string;
  speaker_bio: string;
  inquiry_form_id?: string;
}`,
    edgeFns: ["generate-yr21-speaking", "send-service-inquiry-email"],
    tables: ["speaking_topics", "service_inquiries", "author_nodes"],
    promptRef: "YR-21 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/yr21/"],
  }],
  ["YR-22", "Corporate Training", "Yield", "Author", "generate-yr22-corporate", {
    what: "Customised corporate training programmes built from the book's framework. 8-step workflow includes Bloom's taxonomy + Kolb's stages alignment.",
    abby: "Engines: **Sessions + Commerce**. ABBY generates training menu, learning outcomes (`blooms_level`), experiential mapping (`kolbs_stage`), proposal templates (per `mem://features/training-program-comprehensive-specs`).",
    author: "1) Open YR-22 builder (8 steps). 2) Define audience + outcomes. 3) Generate curriculum. 4) Set price. 5) Optionally connect Thinkific. 6) Activate.",
    reader: "L&D buyer requests proposal → contract → delivery (live or Thinkific) → evaluation.",
    gate: "`title` set AND commerce signal AND (`session_type` OR `booking_url` — session-style).",
    revenue: "Direct — typically $5k–$75k per engagement.",
    deps: "Stripe; optional Thinkific.",
    contentJson: `{
  title: string;
  programs: Array<{
    id; title; audience; duration_days;
    modules: Array<{ title; blooms_level; kolbs_stage; outcomes }>;
    price_usd; stripe_price_id?;
  }>;
  session_type: "in_person"|"virtual"|"hybrid";
  booking_url?: string;
  proposal_template: string;
}`,
    edgeFns: ["generate-yr22-corporate", "deploy-yr25-to-thinkific"],
    tables: ["training_programs", "training_modules", "training_deliverables", "author_nodes", "purchases"],
    promptRef: "YR-22 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/yr22/"],
  }],
  ["YR-23", "Mastermind", "Yield", "Author", "generate-yr23-mastermind", {
    what: "Long-form group programme combining cohort coaching, peer accountability, and live retreats.",
    abby: "Engines: **Sessions + Commerce**. ABBY drafts cohort outline, application form, sales page, Zoom schedule.",
    author: "1) Open YR-23 builder. 2) Define cohort + cadence. 3) Set price. 4) Activate.",
    reader: "Reader applies → accepted → buys → joins cohort.",
    gate: "`title` set AND commerce signal AND (`session_type` OR `booking_url` — session-style).",
    revenue: "Direct — typically $5k–$25k per seat.",
    deps: "Stripe; manual Zoom link.",
    contentJson: `{
  title: string;
  cohort_dates: { start; end };
  cadence: "weekly"|"biweekly"|"monthly";
  session_type: "virtual"|"hybrid";
  booking_url?: string;
  application_form_id?: string;
  stripe_price_id; price_usd;
}`,
    edgeFns: ["generate-yr23-mastermind", "create-checkout-session"],
    tables: ["author_nodes", "purchases", "consultation_sessions"],
    promptRef: "YR-23 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/yr23/"],
  }],
  ["YR-24", "Retreats", "Yield", "Author", "generate-yr24-retreats", {
    what: "In-person multi-day retreats — premium experience tied to the book's transformation.",
    abby: "Engines: **Sessions + Commerce**. ABBY drafts retreat itinerary, sales page, application form.",
    author: "1) Open YR-24 builder. 2) Set venue + dates. 3) Set price. 4) Activate.",
    reader: "Reader applies → accepted → buys → travels to venue.",
    gate: "`title` set AND commerce signal AND (`session_type` OR `booking_url` — session-style).",
    revenue: "Direct — typically $3k–$15k per seat.",
    deps: "Stripe; venue logistics manual.",
    contentJson: `{
  title: string;
  venue: { name; city; country };
  dates: { start; end };
  itinerary: Array<{ day; activities: string[] }>;
  session_type: "in_person";
  booking_url?: string;
  stripe_price_id; price_usd;
}`,
    edgeFns: ["generate-yr24-retreats", "create-checkout-session"],
    tables: ["author_nodes", "purchases"],
    promptRef: "YR-24 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/yr24/"],
  }],
  ["YR-25", "Certification", "Yield", "Author", "generate-yr25-certification", {
    what: "Formal certification programme that licenses others to teach the author's framework.",
    abby: "Engines: **Course + Commerce**. ABBY drafts certification curriculum, exam, licensing terms, sales page.",
    author: "1) Open YR-25 builder. 2) Approve curriculum + exam. 3) Set price + recurring licence fee. 4) Activate.",
    reader: "Practitioner buys → completes course → passes exam → receives certification + licence.",
    gate: "`title` set AND commerce signal.",
    revenue: "Direct + recurring — typically $2k–$10k upfront + annual licence.",
    deps: "Stripe; optional Thinkific delivery.",
    contentJson: `{
  title: string;
  curriculum: Array<{ module; lessons }>;
  exam: { questions; pass_threshold_percent };
  licensing_terms: string;
  upfront_price_usd; annual_licence_usd?;
  stripe_price_id;
}`,
    edgeFns: ["generate-yr25-certification", "deploy-yr25-to-thinkific", "create-checkout-session"],
    tables: ["courses", "course_modules", "course_lessons", "course_quizzes", "author_nodes", "purchases"],
    promptRef: "YR-25 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/yr25/"],
  }],
  ["YR-26", "Conference", "Yield", "Author", "generate-yr26-conference", {
    what: "Author-hosted annual conference — premium tickets, sponsors, speakers.",
    abby: "Engines: **Commerce + Sessions**. ABBY drafts agenda, sales page, sponsor packages, speaker outreach.",
    author: "1) Open YR-26 builder. 2) Set venue + dates. 3) Set tier prices. 4) Activate.",
    reader: "Attendee buys ticket → receives agenda + venue info → attends.",
    gate: "`title` set AND commerce signal.",
    revenue: "Direct — tickets $497–$2,997 + sponsor revenue (cross-sell with YR-28).",
    deps: "Stripe; venue logistics manual.",
    contentJson: `{
  title: string;
  venue: { name; city; country };
  dates: { start; end };
  agenda: Array<{ day; sessions: Array<{ time; title; speaker }> }>;
  ticket_tiers: Array<{ name; price_usd; stripe_price_id; perks }>;
  sponsor_packages?: Array<{ name; price_usd; deliverables }>;
}`,
    edgeFns: ["generate-yr26-conference", "create-checkout-session"],
    tables: ["author_nodes", "purchases"],
    promptRef: "YR-26 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/yr26/"],
  }],
  ["YR-27", "Fundraising", "Yield", "Author", "generate-yr27-fundraising", {
    what: "Fundraising offers — donations, cause-aligned product sales, charity tie-ins.",
    abby: "Engine: **Commerce**. ABBY drafts campaign page, impact narrative, donor tiers, thank-you sequence.",
    author: "1) Open YR-27 builder. 2) Define cause + tiers. 3) Set goal. 4) Activate.",
    reader: "Donor visits page → donates → receives thank-you + impact updates.",
    gate: "`title` set AND commerce signal.",
    revenue: "Direct — variable, often pass-through to charity.",
    deps: "Stripe; legal compliance for non-profit framing where applicable.",
    contentJson: `{
  title: string;
  cause: string;
  impact_narrative: string;
  donor_tiers: Array<{ name; amount_usd; perks; stripe_price_id }>;
  goal_usd: number;
  thank_you_sequence_id?: string;    // FK → email_flows.id
}`,
    edgeFns: ["generate-yr27-fundraising", "deploy-yr27-to-stripe", "create-checkout-session"],
    tables: ["author_nodes", "purchases"],
    promptRef: "YR-27 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/yr27/"],
  }],
  ["YR-28", "Sponsors", "Yield", "Author", "generate-yr28-sponsors", {
    what: "Author-side sponsorship sales — podcast sponsorships, newsletter sponsorships, conference sponsorships.",
    abby: "Engine: **Commerce**. ABBY drafts sponsor deck, rate card, prospect list, outreach emails. NODE_NAME resolves dynamically via `getCanonicalNodeLabel('YR-28')` → 'Sponsors' (Sprint 52 replaced legacy 'Sponsors & Exhibitors').",
    author: "1) Open YR-28 builder. 2) Set inventory + rates. 3) Approve deck. 4) Activate. 5) Outreach manually.",
    reader: "Sponsor (B2B buyer) reviews deck → buys placement → receives reporting.",
    gate: "`title` set AND commerce signal.",
    revenue: "Direct — typically $500–$25k per placement.",
    deps: "BA-14 (podcast inventory), BP-01 (newsletter inventory), YR-26 (conference inventory).",
    contentJson: `{
  title: string;
  inventory: Array<{ channel: "podcast"|"newsletter"|"conference"; placement_type; rate_usd }>;
  deck_url?: string;
  rate_card_url?: string;
  prospect_list?: Array<{ company; contact_email }>;
  outreach_email_template: string;
}`,
    edgeFns: ["generate-yr28-sponsors", "create-checkout-session"],
    tables: ["author_nodes", "purchases", "marketing_assets"],
    promptRef: "YR-28 in `03-abby-ai/03-node-activation-prompts.md`",
    ui: ["src/components/dashboard/builders/yr28/"],
  }],
];

function build(node) {
  const [id, label, category, scope, fn, c] = node;
  const scopeLabel = scope === "Author" ? "Author-level" : "Book-level";
  const catLabel = category === "Brand" ? "Brand Products"
                 : category === "Build" ? "Build Authority"
                 : "Yield Revenue";
  const edgeList = c.edgeFns.map(e => `- \`supabase/functions/${e}/index.ts\``).join("\n");
  const tableList = c.tables.map(t => `- \`${t}\``).join("\n");
  const uiList = c.ui.map(u => `- \`${u}\``).join("\n");

  return `# ${id} · ${label}

_Version ${VERSION} · ${DATE}_

**Category:** ${catLabel}  
**Scope:** ${scopeLabel}  
**Primary edge function:** \`supabase/functions/${fn}/index.ts\`

> Canonical source: see [Master Architecture Reference](../01-architecture/01-master-architecture-reference.md) §3 for the full registry.

---

## 1. What it is

${c.what}

## 2. What ABBY builds

${c.abby}

## 3. What the author does

${c.author}

## 4. What the reader experiences

${c.reader}

## 5. Readiness gate (\`hasRequiredAssets\`)

${c.gate}

_Source: \`supabase/functions/_shared/node-readiness.ts\`._

## 6. Revenue model

${c.revenue}

## 7. Dependencies

${c.deps}

---

## Technical Appendix

### 8. \`content_json\` schema

\`\`\`typescript
${c.contentJson}
\`\`\`

> Stored at \`author_nodes.content_json\` for this node ID. The readiness gate (§5) reads from this object.

### 9. Edge functions

${edgeList}

### 10. Database tables read / written

${tableList}

### 11. ABBY prompt

See [${c.promptRef}](../03-abby-ai/03-node-activation-prompts.md). Prompts are extracted verbatim from the generator source and version-stamped there.

### 12. UI source files

${uiList}
`;
}

const ROOT = resolve(process.cwd(), "docs/04-node-frameworks");
let n = 0;
for (const node of NODES) {
  const file = resolve(ROOT, `${node[0]}.md`);
  await writeFile(file, build(node), "utf8");
  n++;
}
console.log(`Wrote ${n} node framework docs to ${ROOT} (v${VERSION})`);
