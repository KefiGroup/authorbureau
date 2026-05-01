#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DOCS = path.join(ROOT, "docs");
const VERSION = "1.0";
const DATE = "2026-05-01";

const write = (p, s) => fs.writeFileSync(path.join(DOCS, p), s);

// ──────────────────────────────────────────────────────────────────
// 04 — Engine Architecture Map
// ──────────────────────────────────────────────────────────────────
write(
  "04-ab-engine-architecture-map.md",
  `# 04 · AB Engine Architecture Map

_Version ${VERSION} · ${DATE}_

The Authors Bureau backend is organized into **7 cooperating engines**. Each section below describes what the engine does, the database tables it owns or reads, the external services it calls, and the key edge functions that implement it.

| Engine | Owns | Reads | External | Edge function count |
|---|---|---|---|---|
| 1. Email | \`email_queue\`, \`email_flows\`, \`author_email_settings\` | \`crm_contacts\`, \`books\` | Resend, Lovable AI Gateway | 12 |
| 2. Funnel (Lead Magnet) | \`funnels\`, \`funnel_responses\` | \`crm_contacts\`, \`books\` | Lovable AI Gateway | 6 |
| 3. Course | \`courses\`, \`course_modules\`, \`course_lessons\`, \`course_enrollments\` | \`author_nodes\` | Thinkific, ElevenLabs, Lovable AI | 8 |
| 4. Commerce | \`author_nodes\`, \`purchases\`, \`platform_config\`, \`payouts\` | \`books\`, \`author_profiles\` | **Stripe (Authors Bureau as Merchant of Record)** | 14 |
| 5. Sessions | \`sessions\`, \`session_bookings\` | \`author_nodes\` | Zoom, Stripe | 4 |
| 6. Podcast | \`podcasts\`, \`podcast_episodes\`, \`audiobooks\` | \`books\` | Transistor.fm, ElevenLabs | 7 |
| 7. CRM / Social / Nurture | \`crm_contacts\`, \`social_connections\`, \`social_posts\`, \`abby_nudges\`, \`notifications\` | All node tables | Buffer, LinkedIn | 10 |

---

## 1. Email Engine

**Purpose** — Centralized scheduling, sending, and tracking of every email leaving the platform: transactional, nurture sequences, broadcast campaigns, and AI-generated author marketing flows.

**Key tables**
- \`email_queue\` — pgmq-backed queue of pending sends
- \`email_flows\` — sequence definitions (welcome, post-purchase, lead-magnet nurture)
- \`author_email_settings\` — per-author Reply-To, sender display name
- \`email_sync_log\` — audit of email-change syncs from PublishNow ↔ Authors Bureau

**External services**
- **Resend** — delivery (verified domain \`notify.authorsbureau.com\`)
- **Lovable AI Gateway** — drafting nurture sequences

**Edge functions**
- \`process-email-queue\` — drains the pgmq queue
- \`process-email-flows\` — fans out scheduled sequence steps
- \`send-transactional-email\` — single-send entry point. When called with \`authorId\`, From becomes "{senderName} via Authors Bureau"
- \`trigger-sequence\` — enqueues a flow for a contact
- \`enroll-subscriber\` / \`sync-subscribers\` / \`webinar-register\`
- \`process-email-events\` / \`resend-webhook\` / \`handle-email-suppression\` / \`handle-email-unsubscribe\`
- \`auth-email-hook\` — Supabase auth email customizer
- \`preview-transactional-email\`, \`verify-sender-email\`

**Authoring rule** — System emails (book-approved, profile-*, abby-daily-report) omit \`authorId\` and stay platform-branded. Author-marketing emails always pass \`authorId\` so they render the "via Authors Bureau" footer. See \`mem://features/transactional-email-framework\`.

---

## 2. Funnel / Lead Magnet Engine

**Purpose** — Public-facing lead capture: 8-question quizzes, downloadable PDFs, gated assessments. 4-stage journey (Gate → Quiz → Results → Next Step).

**Key tables**
- \`funnels\` — funnel definitions (template, headline variants, result tiers)
- \`funnel_responses\` — submitted answers, computed tier, contact info
- \`funnel_views\` — view tracking for conversion analytics

**External services**
- **Lovable AI Gateway** — quiz generation (8 Qs, 5 result tiers, 3 headline variants per spec)

**Edge functions**
- \`generate-bp02-lead-magnets\` — full quiz/PDF generation
- \`generate-bp02-social-pack\` — 5-platform social distribution kit
- \`submit-funnel\` — public reader submission endpoint
- \`track-funnel-view\` — anonymous view counter
- \`submit-quiz-response\` — quiz-specific answer flow
- \`microsite-action\` — lead-magnet gate page actions

See \`mem://ai/lead-magnet-generation-specs\`, \`mem://features/lead-magnet-microsite-conversion-specs\`.

---

## 3. Course Engine

**Purpose** — Authors generate full curricula (modules → lessons), then deploy them to Thinkific. Single sign-on lets readers jump from Authors Bureau into the hosted course.

**Key tables**
- \`courses\` — top-level course (title, slug, price, deployment status)
- \`course_modules\` — modules within a course
- \`course_lessons\` — individual lessons (with optional audio narration)
- \`course_enrollments\` — reader enrollments after purchase

**External services**
- **Thinkific** — course hosting (subdomain-based)
- **ElevenLabs** — optional lesson audio narration
- **Lovable AI Gateway** — curriculum generation

**Edge functions**
- \`generate-ba10-online-course\`, \`generate-bp06-online-course\`, \`generate-bp07-coaching\`
- \`deploy-ba10-to-thinkific\`, \`deploy-bp07-to-thinkific\`, \`deploy-yr25-to-thinkific\`
- \`sso-proxy\` — Thinkific SSO bridge

Curriculum requires module-centric authoring with 7-email sequences using dynamic placeholders. See \`mem://features/course-lesson-authoring-ux\`.

---

## 4. Commerce Engine (v1)

**Purpose** — Single payment rail for all reader purchases. **Authors Bureau is the Merchant of Record.** Every reader Buy Now flows through the platform Stripe account; authors receive 92% net of an 8% platform fee that covers all payment-processing costs.

**Key tables**
- \`author_nodes\` — product registry (status, price_usd, content_json, delivery_url)
- \`purchases\` — completed reader orders (gross, net, fee, payment_intent_id)
- \`platform_config\` — single-row config (\`platform_fee_percent\` default \`0.08\`)
- \`payouts\` — author payout records (Stripe Express transfers or manual)

**External services**
- **Stripe** — checkout, webhooks, payouts (Express only)

**Edge functions**
- \`create-checkout-session\`, \`create-checkout\`, \`create-product-checkout\` — reader checkout
- \`verify-purchase\` (sync) + \`process-purchase\` (async webhook) — dual-webhook pattern
- \`refund-purchase\`, \`mark-payout-paid\`, \`run-monthly-payouts\`
- \`stripe-connect\` — author Express onboarding (payout method only)
- \`setup-stripe-product\`, \`sync-stripe-metrics\`
- \`check-subscription\`, \`cancel-subscription\`, \`customer-portal\` — author tier billing

**Locked rules**
- Author Stripe Express connection governs **payouts only**, never node Live status (\`mem://architecture/commerce-engine-v1\`, \`mem://Payout vs Commerce Separation\`)
- Reader Buy Now is gated only by node \`status='live'\` and \`price_usd > 0\`
- Locked author-facing copy: "Authors Bureau retains an 8% platform fee to cover all payment-processing costs on gross sales, so no extra processing fees are ever deducted from your share. You keep 92% of every sale."

---

## 5. Sessions Engine

**Purpose** — Booking and delivery of 1-on-1 coaching, big-ticket consulting, and group-coaching cohorts.

**Key tables**
- \`sessions\` — session-type definitions (duration, price, booking URL)
- \`session_bookings\` — confirmed reader bookings
- \`consultation_sessions\` — ABBY consultation records (special tier pricing timer)

**External services**
- **Zoom** — meeting links (when booking URL is Zoom-backed)
- **Stripe** — checkout for paid sessions

**Edge functions**
- \`generate-yr19-coaching\`, \`generate-yr20-big-ticket\`, \`generate-ba13-group-coaching\`
- \`consultation-session\` — drives the post-consultation 60-minute special-pricing timer

See \`mem://business/post-consultation-pricing-logic\`.

---

## 6. Podcast / Audiobook Engine

**Purpose** — Author podcast tour assets (BA-14) and full audiobook production (BA-11) with TTS narration.

**Key tables**
- \`podcasts\`, \`podcast_episodes\` — podcast asset registry
- \`audiobooks\` — chapter-level audio production records (script_markdown, audio_url, duration)

**External services**
- **Transistor.fm** — podcast hosting
- **ElevenLabs** — TTS narration
- **Lovable AI Gateway** — pitch + episode generation

**Edge functions**
- \`generate-ba14-podcast\`, \`generate-podcast-season\`
- \`generate-ba11-audiobook\`, \`ba11-audiobook-generate\`, \`ba11-publish-audiobook\`, \`ba11-voice-preview\`
- \`elevenlabs-tts-audiobook\`, \`elevenlabs-tts-audiobook-v2\`
- \`distribute-audiobook\`, \`deploy-ba11-audiobook\`
- \`deploy-ba14-to-transistor\`

See \`mem://features/audiobook-tts-pipeline\`.

---

## 7. CRM / Social / Nurture Engine

**Purpose** — Continuous monitoring of author activity and reader interactions. Auto-captures contacts, schedules social posts, and surfaces ABBY nudges in the dashboard.

**Key tables**
- \`crm_contacts\` — unified contact record (last_node_id, archetype A/B/C/D auto-filled)
- \`social_connections\` — Buffer / LinkedIn OAuth connections per author
- \`social_posts\` — scheduled and published posts with platform metadata
- \`abby_nudges\` — proactive coaching cards (9 trigger types)
- \`notifications\` — in-app notification feed
- \`abby_conversations\` — chat history with ABBY

**External services**
- **Buffer** — multi-platform scheduling (GraphQL API)
- **LinkedIn** — direct OAuth posting
- **Lovable AI Gateway** — nudge and post generation

**Edge functions**
- \`crm-auto-capture\` — captures contacts from any author touchpoint
- \`social-connect-start\`, \`social-connect-callback\`, \`social-publish\`, \`social-scheduler\`
- \`auto-refill-social-calendar\` — keeps the calendar 30+ days out
- \`generate-nudges\` — nightly nudge generator
- \`generate-daily-insight\`, \`abby-daily-report\`, \`abby-daily-report-dispatcher\`
- \`abby-help-chat\` — anonymous-safe ABBY chat for guests

See \`mem://features/abby-performance-coach-and-nudge-engine\`, \`mem://features/buffer-social-scheduling-sprint36b\`.

---

## Cross-cutting infrastructure

- **Shared edge-function modules** — \`supabase/functions/_shared/\` provides \`node-readiness.ts\` (commerce gating logic), \`microsite-content-rules.ts\` (em-dash / placeholder scrubbing), \`asset-pack-trigger.ts\`, \`from-address.ts\`, \`log-error.ts\`, \`persist-node-content.ts\`
- **DB triggers** — \`scrub_microsite_jsonb\`, \`detect_microsite_violations\`, \`author_nodes_autofill_delivery_url\`, \`crm_contacts_autofill_archetype\`, \`sync_email_change_to_downstream\`, \`books_after_status_change\`
- **All edge functions** ship with \`verify_jwt = false\` and validate JWTs in code (or run anonymously for public endpoints), bypassing RLS via the service role
- **All shared-backend calls** must use \`getActiveToken()\` + \`fetchWithTimeout()\` (180s default), never \`supabase.auth.getSession()\` directly
`,
);

// ──────────────────────────────────────────────────────────────────
// 05 — Database Schema (from /tmp/schema.json)
// ──────────────────────────────────────────────────────────────────
const rawSchema = JSON.parse(fs.readFileSync("/tmp/schema.json", "utf8"));
const byTable = {};
for (const r of rawSchema) {
  (byTable[r.table_name] ||= []).push(r);
}
const tableNames = Object.keys(byTable).sort();

let doc05 = `# 05 · AB Database Schema — Current

_Version ${VERSION} · ${DATE}_

Live export of all tables and columns in the \`public\` schema, generated directly from \`information_schema.columns\`. **${tableNames.length}** tables, **${rawSchema.length}** columns total.

> Regenerate with \`node scripts/build-docs.mjs\` after every migration.

## Index

`;

for (const t of tableNames) {
  doc05 += `- [${t}](#${t.replace(/_/g, "_")}) (${byTable[t].length} cols)\n`;
}

doc05 += `\n## Storage buckets\n\n| Bucket | Public |\n|---|---|\n| author-photos | Yes |\n| book-covers | Yes |\n| email-assets | Yes |\n| manuscripts | No |\n| audiobook-audio | Yes |\n| social-media-graphics | Yes |\n| course-videos | Yes |\n| payouts | No |\n\n`;

doc05 += `## Database functions\n\nThe following \`SECURITY DEFINER\` functions are defined in \`public\`. See the source-of-truth section for full bodies.\n\n`;
const FNS = [
  "admin_acknowledge_errors", "admin_error_summary", "admin_resolve_errors",
  "admin_send_broadcast", "admin_set_author_suspension", "admin_set_author_tier",
  "author_nodes_autofill_delivery_url", "author_nodes_scrub_content",
  "books_after_status_change", "bug_reports_set_sla", "check_rate_limit",
  "compute_node_microsite_url", "crm_contacts_autofill_archetype",
  "delete_email", "detect_microsite_violations", "enqueue_email",
  "generate_account_id", "generate_course_slug", "generate_unique_author_slug",
  "get_author_curated_book_id", "get_reading_leaderboard", "handle_new_user",
  "has_role", "list_author_profile_orphans", "move_to_dlq",
  "notify_all_admins", "notify_users", "read_email_batch",
  "scrub_microsite_jsonb", "sync_email_change_to_downstream",
  "trigger_generate_asset_pack", "update_reading_streak",
  "update_updated_at_column", "validate_reading_challenge_status",
  "warn_ghost_author_uid",
];
for (const f of FNS) doc05 += `- \`${f}\`\n`;
doc05 += `\n---\n\n## Tables\n\n`;

for (const t of tableNames) {
  doc05 += `### ${t}\n\n`;
  doc05 += `| Column | Type | Nullable | Default |\n|---|---|---|---|\n`;
  for (const c of byTable[t]) {
    const def = c.column_default ? "`" + String(c.column_default).replace(/\|/g, "\\|") + "`" : "—";
    doc05 += `| \`${c.column_name}\` | ${c.data_type} | ${c.is_nullable} | ${def} |\n`;
  }
  doc05 += `\n`;
}

write("05-ab-database-schema-current.md", doc05);

// ──────────────────────────────────────────────────────────────────
// 06 — Be SUCKcessful walkthrough
// ──────────────────────────────────────────────────────────────────
write(
  "06-ab-node-framework-be-suckcessful-test.md",
  `# 06 · AB Node Framework — "Be SUCKcessful" Test Walkthrough

_Version ${VERSION} · ${DATE}_

This document uses the book **Be SUCKcessful** as the worked example to document the **author journey** and **reader journey** for the 5 most-used nodes on the platform:

1. **BP-04** Author Website
2. **BP-02** Lead Magnet (Free Gift)
3. **BA-10** Online Course
4. **YR-19** 1-on-1 Coaching
5. **BP-01** Email Marketing

The author identity used throughout: pen name **"Be SUCKcessful Author"**, slug \`be-suckcessful\`. All public URLs use the form \`https://authorsbureau.com/be-suckcessful/{node-slug}\` (computed by \`compute_node_microsite_url\` in the database).

---

## 1. BP-04 · Author Website

### Author journey

\`\`\`
Dashboard → ?section=builder&node=BP-04
  │
  ├─ Step 1: Introduction (BP-04 builder card)
  ├─ Step 2: Generating
  │     POST /generate-bp04-website  (model: openai/gpt-5.2, ~16k tokens)
  │       inputs: book context + author profile
  │       output: hero, about, books grid, testimonials, CTA
  │     persists → author_nodes (node_id='BP-04', content_json)
  ├─ Step 3: Review (edit any section inline)
  ├─ Step 4: Publish
  │     UPDATE author_nodes SET status='live'
  │     trigger author_nodes_autofill_delivery_url fires
  │       → delivery_url = 'https://authorsbureau.com/be-suckcessful/author-website'
  │     trigger trigger_generate_asset_pack fires
  │       → POST /generate-asset-pack (social graphics, OG image)
  └─ Step 5: Live
        Author sees URL card with "Copy" + "View public site"
\`\`\`

### Reader journey

\`\`\`
Reader visits  /be-suckcessful/author-website
  │
  ├─ /microsite/[slug]/[node] route → calls /get-microsite-page
  │     loads content_json from author_nodes
  │     scrub_microsite_jsonb has already stripped emdashes/placeholders
  ├─ Renders hero + about + books + lead-magnet CTA
  ├─ "Powered by Authors Bureau" footer (mandatory)
  └─ CTAs route to:
      - /be-suckcessful/free-gift   (BP-02 lead magnet)
      - /be-suckcessful/coaching    (YR-19, with BuyNowButton)
\`\`\`

### Tables touched
- Write: \`author_nodes\` (BP-04 row), \`generated_assets\` (asset pack)
- Read at runtime: \`author_nodes\`, \`author_profiles\`, \`books\`

---

## 2. BP-02 · Lead Magnet ("Free Gift")

### Author journey

\`\`\`
Dashboard → ?section=builder&node=BP-02
  │
  ├─ Step 1: Pick template (Quiz / PDF / Checklist) — 6 visual templates
  ├─ Step 2: Generate
  │     POST /generate-bp02-lead-magnets  (gpt-5.2)
  │       output: 8 questions, 5 result tiers, 3 headline variants
  │       persists → funnels (definition) + author_nodes (BP-02 row)
  ├─ Step 3: Headline picker (Identity / Outcome / Curiosity)
  ├─ Step 4: Social distribution pack
  │     POST /generate-bp02-social-pack
  │       persists 5-platform pack to Marketing Hub
  ├─ Step 5: Publish (status='live')
  │     delivery_url → /be-suckcessful/free-gift
  └─ Live: visible in Lead Magnet Library, retains older versions
\`\`\`

### Reader journey

\`\`\`
Reader visits /be-suckcessful/free-gift  (4-stage journey)
  │
  ├─ Stage 1 — Gate page (headline + email capture form)
  │     POST /track-funnel-view (anonymous view counter)
  ├─ Stage 2 — Quiz (8 questions, single-select, no back button)
  ├─ Stage 3 — Results (computed tier, personalised explanation)
  │     POST /submit-funnel + /submit-quiz-response
  │       writes funnel_responses (with tier + email)
  │       triggers /enroll-subscriber → joins nurture flow
  │       triggers /crm-auto-capture → upserts crm_contacts
  └─ Stage 4 — Next Step (3 headline variants → BP-04 or BA-10)
\`\`\`

### Tables touched
- Write: \`funnels\`, \`funnel_responses\`, \`funnel_views\`, \`crm_contacts\`, \`email_queue\`
- Triggers: \`crm_contacts_autofill_archetype\` sets \`archetype='B'\` (BP-02 = lead-gen)

---

## 3. BA-10 · Online Course

### Author journey

\`\`\`
Dashboard → ?section=builder&node=BA-10
  │
  ├─ Step 1: Generate curriculum
  │     POST /generate-ba10-online-course  (gpt-5.2, 16k tokens, temp 0.2)
  │       output: 5–8 modules × 3–6 lessons each
  │     persists → courses + course_modules + course_lessons
  ├─ Step 2: Sales-page builder (11-section mandatory framework)
  │     Mismatch Validator cross-references curriculum
  ├─ Step 3: Set price (e.g. $197) → author_nodes.price_usd
  ├─ Step 4: Deploy to Thinkific
  │     POST /deploy-ba10-to-thinkific
  │       creates course on author's Thinkific subdomain
  │       writes thinkific_course_id back to courses
  └─ Step 5: Publish (status='live')
        delivery_url → /be-suckcessful/online-course
\`\`\`

### Reader journey

\`\`\`
Reader on /be-suckcessful/online-course
  │
  ├─ Renders sales page (11 sections from author_nodes.content_json)
  ├─ Clicks <BuyNowButton>
  │     POST /create-checkout-session
  │       creates Stripe Checkout (Authors Bureau is MoR)
  │       redirects to checkout.stripe.com
  ├─ Stripe webhook → /verify-purchase  (sync confirmation)
  │                 → /process-purchase (async fulfilment)
  │     writes purchases (gross, fee=8%, net=92%)
  │     writes course_enrollments
  │     enqueues confirmation email (author-branded "via Authors Bureau")
  └─ Reader clicks "Access course" → /sso-proxy
        → bridges into Thinkific course
\`\`\`

### Tables touched
- Write: \`courses\`, \`course_modules\`, \`course_lessons\`, \`author_nodes\`, \`purchases\`, \`course_enrollments\`, \`email_queue\`
- Locked rule: author payout is computed (purchases.net) and surfaced in Revenue Dashboard, paid via \`run-monthly-payouts\` (Stripe Express transfer) — independent of node Live status

---

## 4. YR-19 · 1-on-1 Coaching

### Author journey

\`\`\`
Dashboard → ?section=builder&node=YR-19
  │
  ├─ Step 1: AI generates positioning + 3 session types
  │     POST /generate-yr19-coaching  (gpt-5.2)
  ├─ Step 2: Configure each session_type
  │     fields: title, duration, price_usd, booking_url (Zoom or external)
  │     persisted into author_nodes.content_json
  ├─ Step 3: Sales page review
  └─ Step 4: Publish (status='live')
        delivery_url → /be-suckcessful/coaching
        Required asset gate: title + price_usd + session_type
\`\`\`

### Reader journey

\`\`\`
Reader on /be-suckcessful/coaching
  │
  ├─ Sees 3 session-type cards (e.g. "30-min Strategy" / "60-min Deep Dive" / "90-min Intensive")
  ├─ Clicks "Book this session" → <BuyNowButton>
  │     POST /create-checkout-session  (Stripe, MoR)
  ├─ On payment success:
  │     /verify-purchase → writes purchases
  │     /process-purchase → writes session_bookings
  │       sends author-branded confirmation email with booking_url (Zoom link)
  └─ Reader receives email + calendar invite, joins Zoom at scheduled time
\`\`\`

### Tables touched
- Write: \`author_nodes\`, \`sessions\`, \`session_bookings\`, \`purchases\`, \`email_queue\`

---

## 5. BP-01 · Email Marketing

### Author journey

\`\`\`
Dashboard → ?section=builder&node=BP-01
  │
  ├─ Step 1: Generate sequence
  │     POST /generate-bp01-email-marketing  (gpt-5.2)
  │       output: 7-email welcome sequence with dynamic placeholders
  │             ({{first_name}}, {{book_title}}, {{author_name}})
  │     persists → email_flows + author_nodes (BP-01 row)
  ├─ Step 2: Review each email (subject, preheader, body)
  ├─ Step 3: Set trigger
  │     options: lead-magnet completion (BP-02), website signup (BP-04),
  │              webinar registration (BP-05)
  ├─ Step 4: Author-branded sender setup
  │     /verify-sender-email → confirms Reply-To (author_email_settings)
  └─ Step 5: Publish (status='live')
        Required asset gate: ≥3 email steps with subject + body
\`\`\`

### Reader journey

\`\`\`
Reader is enrolled (e.g. completed BP-02 quiz)
  │
  ├─ /enroll-subscriber  → adds to email_flows.flow_subscribers
  ├─ /process-email-flows  (cron) fans out scheduled steps
  │     enqueues to email_queue (pgmq)
  ├─ /process-email-queue  drains queue → POST to Resend API
  │     From:     "Be SUCKcessful Author via Authors Bureau"
  │     Reply-To: author_email_settings.reply_to_email
  │     Footer:   "You're receiving this because Be SUCKcessful Author sent it via Authors Bureau"
  ├─ Resend webhooks → /resend-webhook → /process-email-events
  │     records opens, clicks, bounces, complaints
  ├─ Suppression handling: /handle-email-suppression
  └─ Reader can unsubscribe via footer link → /handle-email-unsubscribe
\`\`\`

### Tables touched
- Write: \`email_flows\`, \`email_queue\` (pgmq), \`crm_contacts\`, \`email_sync_log\`
- Read: \`author_email_settings\` (sender display name + Reply-To)

---

## Summary table

| Node | Author time-to-live | Reader path | Stripe involved? | External services |
|---|---|---|---|---|
| BP-04 Website | ~5 min (gen + review) | Free public page | No | — |
| BP-02 Lead Magnet | ~8 min | Free quiz → email opt-in | No | Resend |
| BA-10 Online Course | ~30 min (incl Thinkific deploy) | Paid checkout → SSO into course | Yes (MoR) | Thinkific, Stripe |
| YR-19 1-on-1 Coaching | ~10 min | Paid checkout → Zoom booking | Yes (MoR) | Zoom, Stripe |
| BP-01 Email Marketing | ~12 min | Drip campaign on opt-in | No | Resend |

---

## Cross-references

- Microsite slug authority → \`compute_node_microsite_url\` in \`supabase/functions/_shared/\` SQL functions
- Required-asset gates → \`hasRequiredAssets()\` in \`supabase/functions/_shared/node-readiness.ts\` and \`src/lib/node-readiness.ts\`
- Locked rules → \`mem://architecture/commerce-engine-v1\` (8% platform fee, MoR), \`mem://Payout vs Commerce Separation\`
`,
);

console.log("docs 04, 05, 06 written.");
