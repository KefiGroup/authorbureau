# 04 · AB Engine Architecture Map

_Version 1.0 · 2026-05-01_

The Authors Bureau backend is organized into **7 cooperating engines**. Each section below describes what the engine does, the database tables it owns or reads, the external services it calls, and the key edge functions that implement it.

| Engine | Owns | Reads | External | Edge function count |
|---|---|---|---|---|
| 1. Email | `email_queue`, `email_flows`, `author_email_settings` | `crm_contacts`, `books` | Resend, Lovable AI Gateway | 12 |
| 2. Funnel (Lead Magnet) | `funnels`, `funnel_responses` | `crm_contacts`, `books` | Lovable AI Gateway | 6 |
| 3. Course | `courses`, `course_modules`, `course_lessons`, `course_enrollments` | `author_nodes` | Thinkific, ElevenLabs, Lovable AI | 8 |
| 4. Commerce | `author_nodes`, `purchases`, `platform_config`, `payouts` | `books`, `author_profiles` | **Stripe (Authors Bureau as Merchant of Record)** | 14 |
| 5. Sessions | `sessions`, `session_bookings` | `author_nodes` | Zoom, Stripe | 4 |
| 6. Podcast | `podcasts`, `podcast_episodes`, `audiobooks` | `books` | Transistor.fm, ElevenLabs | 7 |
| 7. CRM / Social / Nurture | `crm_contacts`, `social_connections`, `social_posts`, `abby_nudges`, `notifications` | All node tables | LinkedIn (Buffer removed Sprint 37) | 10 |

---

## 1. Email Engine

**Purpose** — Centralized scheduling, sending, and tracking of every email leaving the platform: transactional, nurture sequences, broadcast campaigns, and AI-generated author marketing flows.

**Key tables**
- `email_queue` — pgmq-backed queue of pending sends
- `email_flows` — sequence definitions (welcome, post-purchase, lead-magnet nurture)
- `author_email_settings` — per-author Reply-To, sender display name
- `email_sync_log` — audit of email-change syncs from PublishNow ↔ Authors Bureau

**External services**
- **Resend** — delivery (verified domain `notify.authorsbureau.com`)
- **Lovable AI Gateway** — drafting nurture sequences

**Edge functions**
- `process-email-queue` — drains the pgmq queue
- `process-email-flows` — fans out scheduled sequence steps
- `send-transactional-email` — single-send entry point. When called with `authorId`, From becomes "{senderName} via Authors Bureau"
- `trigger-sequence` — enqueues a flow for a contact
- `enroll-subscriber` / `sync-subscribers` / `webinar-register`
- `process-email-events` / `resend-webhook` / `handle-email-suppression` / `handle-email-unsubscribe`
- `auth-email-hook` — Supabase auth email customizer
- `preview-transactional-email`, `verify-sender-email`

**Authoring rule** — System emails (book-approved, profile-*, abby-daily-report) omit `authorId` and stay platform-branded. Author-marketing emails always pass `authorId` so they render the "via Authors Bureau" footer. See `mem://features/transactional-email-framework`.

---

## 2. Funnel / Lead Magnet Engine

**Purpose** — Public-facing lead capture: 8-question quizzes, downloadable PDFs, gated assessments. 4-stage journey (Gate → Quiz → Results → Next Step).

**Key tables**
- `funnels` — funnel definitions (template, headline variants, result tiers)
- `funnel_responses` — submitted answers, computed tier, contact info
- `funnel_views` — view tracking for conversion analytics

**External services**
- **Lovable AI Gateway** — quiz generation (8 Qs, 5 result tiers, 3 headline variants per spec)

**Edge functions**
- `generate-bp02-lead-magnets` — full quiz/PDF generation
- `generate-bp02-social-pack` — 5-platform social distribution kit
- `submit-funnel` — public reader submission endpoint
- `track-funnel-view` — anonymous view counter
- `submit-quiz-response` — quiz-specific answer flow
- `microsite-action` — lead-magnet gate page actions

See `mem://ai/lead-magnet-generation-specs`, `mem://features/lead-magnet-microsite-conversion-specs`.

---

## 3. Course Engine

**Purpose** — Authors generate full curricula (modules → lessons), then deploy them to Thinkific. Single sign-on lets readers jump from Authors Bureau into the hosted course.

**Key tables**
- `courses` — top-level course (title, slug, price, deployment status)
- `course_modules` — modules within a course
- `course_lessons` — individual lessons (with optional audio narration)
- `course_enrollments` — reader enrollments after purchase

**External services**
- **Thinkific** — course hosting (subdomain-based)
- **ElevenLabs** — optional lesson audio narration
- **Lovable AI Gateway** — curriculum generation

**Edge functions**
- `generate-ba10-online-course`, `generate-bp06-workbook`, `generate-bp07-home-study`
- `deploy-ba10-to-thinkific`, `deploy-bp07-to-thinkific`, `deploy-yr25-to-thinkific`
- `sso-proxy` — Thinkific SSO bridge

Curriculum requires module-centric authoring with 7-email sequences using dynamic placeholders. See `mem://features/course-lesson-authoring-ux`.

---

## 4. Commerce Engine (v1)

**Purpose** — Single payment rail for all reader purchases. **Authors Bureau is the Merchant of Record.** Every reader Buy Now flows through the platform Stripe account; authors receive 92% net of an 8% platform fee that covers all payment-processing costs.

**Key tables**
- `author_nodes` — product registry (status, price_usd, content_json, delivery_url)
- `purchases` — completed reader orders (gross, net, fee, payment_intent_id)
- `platform_config` — single-row config (`platform_fee_percent` default `0.08`)
- `payouts` — author payout records (Stripe Express transfers or manual)

**External services**
- **Stripe** — checkout, webhooks, payouts (Express only)

**Edge functions**
- `create-checkout-session`, `create-checkout`, `create-product-checkout` — reader checkout
- `verify-purchase` (sync) + `process-purchase` (async webhook) — dual-webhook pattern
- `refund-purchase`, `mark-payout-paid`, `run-monthly-payouts`
- `stripe-connect` — author Express onboarding (payout method only)
- `setup-stripe-product`, `sync-stripe-metrics`
- `check-subscription`, `cancel-subscription`, `customer-portal` — author tier billing

**Locked rules**
- Author Stripe Express connection governs **payouts only**, never node Live status (`mem://architecture/commerce-engine-v1`, `mem://Payout vs Commerce Separation`)
- Reader Buy Now is gated only by node `status='live'` and `price_usd > 0`
- Locked author-facing copy: "Authors Bureau retains an 8% platform fee to cover all payment-processing costs on gross sales, so no extra processing fees are ever deducted from your share. You keep 92% of every sale."

---

## 5. Sessions Engine

**Purpose** — Booking and delivery of 1-on-1 coaching, big-ticket consulting, and group-coaching cohorts.

**Key tables**
- `sessions` — session-type definitions (duration, price, booking URL)
- `session_bookings` — confirmed reader bookings
- `consultation_sessions` — ABBY consultation records (special tier pricing timer)

**External services**
- **Zoom** — meeting links (when booking URL is Zoom-backed)
- **Stripe** — checkout for paid sessions

**Edge functions**
- `generate-yr19-coaching`, `generate-yr20-big-ticket`, `generate-ba13-group-coaching`
- `consultation-session` — drives the post-consultation 60-minute special-pricing timer

See `mem://business/post-consultation-pricing-logic`.

---

## 6. Podcast / Audiobook Engine

**Purpose** — Author podcast tour assets (BA-14) and full audiobook production (BA-11) with TTS narration.

**Key tables**
- `podcasts`, `podcast_episodes` — podcast asset registry
- `audiobooks` — chapter-level audio production records (script_markdown, audio_url, duration)

**External services**
- **Transistor.fm** — podcast hosting
- **ElevenLabs** — TTS narration
- **Lovable AI Gateway** — pitch + episode generation

**Edge functions**
- `generate-ba14-podcast`, `generate-podcast-season`
- `generate-ba11-audiobook`, `ba11-audiobook-generate`, `ba11-publish-audiobook`, `ba11-voice-preview`
- `elevenlabs-tts-audiobook`, `elevenlabs-tts-audiobook-v2`
- `distribute-audiobook`, `deploy-ba11-audiobook`
- `deploy-ba14-to-transistor`

See `mem://features/audiobook-tts-pipeline`.

---

## 7. CRM / Social / Nurture Engine

**Purpose** — Continuous monitoring of author activity and reader interactions. Auto-captures contacts, schedules social posts, and surfaces ABBY nudges in the dashboard.

**Key tables**
- `crm_contacts` — unified contact record (last_node_id, archetype A/B/C/D auto-filled)
- `social_connections` — LinkedIn OAuth connections per author (Buffer removed Sprint 37; table retained for LinkedIn + future rails)
- `social_posts` — scheduled and published posts with platform metadata
- `abby_nudges` — proactive coaching cards (9 trigger types)
- `notifications` — in-app notification feed
- `abby_conversations` — chat history with ABBY

**External services**
- **LinkedIn** — direct OAuth posting (only active social rail)
- **Lovable AI Gateway** — nudge, post, and 30-day calendar generation
- ~~Buffer~~ — removed Sprint 37; ABBY now generates a 30-day calendar that authors post manually

**Edge functions**
- `crm-auto-capture` — captures contacts from any author touchpoint
- `social-connect-start`, `social-connect-callback`, `social-publish`, `social-scheduler`
- `auto-refill-social-calendar` — keeps the calendar 30+ days out
- `generate-nudges` — nightly nudge generator
- `generate-daily-insight`, `abby-daily-report`, `abby-daily-report-dispatcher`
- `abby-help-chat` — anonymous-safe ABBY chat for guests

See `mem://features/abby-performance-coach-and-nudge-engine`, `mem://features/buffer-social-scheduling-sprint36b`.

---

## Cross-cutting infrastructure

- **Shared edge-function modules** — `supabase/functions/_shared/` provides `node-readiness.ts` (commerce gating logic), `microsite-content-rules.ts` (em-dash / placeholder scrubbing), `asset-pack-trigger.ts`, `from-address.ts`, `log-error.ts`, `persist-node-content.ts`
- **DB triggers** — `scrub_microsite_jsonb`, `detect_microsite_violations`, `author_nodes_autofill_delivery_url`, `crm_contacts_autofill_archetype`, `sync_email_change_to_downstream`, `books_after_status_change`
- **All edge functions** ship with `verify_jwt = false` and validate JWTs in code (or run anonymously for public endpoints), bypassing RLS via the service role
- **All shared-backend calls** must use `getActiveToken()` + `fetchWithTimeout()` (180s default), never `supabase.auth.getSession()` directly
