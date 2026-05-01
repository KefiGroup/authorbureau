# 06 · AB Node Framework — "Be SUCKcessful" Test Walkthrough

_Version 1.0 · 2026-05-01_

This document uses the book **Be SUCKcessful** as the worked example to document the **author journey** and **reader journey** for the 5 most-used nodes on the platform:

1. **BP-04** Author Website
2. **BP-02** Lead Magnet (Free Gift)
3. **BA-10** Online Course
4. **YR-19** 1-on-1 Coaching
5. **BP-01** Email Marketing

The author identity used throughout: pen name **"Be SUCKcessful Author"**, slug `be-suckcessful`. All public URLs use the form `https://authorsbureau.com/be-suckcessful/{node-slug}` (computed by `compute_node_microsite_url` in the database).

---

## 1. BP-04 · Author Website

### Author journey

```
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
```

### Reader journey

```
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
```

### Tables touched
- Write: `author_nodes` (BP-04 row), `generated_assets` (asset pack)
- Read at runtime: `author_nodes`, `author_profiles`, `books`

---

## 2. BP-02 · Lead Magnet ("Free Gift")

### Author journey

```
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
```

### Reader journey

```
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
```

### Tables touched
- Write: `funnels`, `funnel_responses`, `funnel_views`, `crm_contacts`, `email_queue`
- Triggers: `crm_contacts_autofill_archetype` sets `archetype='B'` (BP-02 = lead-gen)

---

## 3. BA-10 · Online Course

### Author journey

```
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
```

### Reader journey

```
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
```

### Tables touched
- Write: `courses`, `course_modules`, `course_lessons`, `author_nodes`, `purchases`, `course_enrollments`, `email_queue`
- Locked rule: author payout is computed (purchases.net) and surfaced in Revenue Dashboard, paid via `run-monthly-payouts` (Stripe Express transfer) — independent of node Live status

---

## 4. YR-19 · 1-on-1 Coaching

### Author journey

```
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
```

### Reader journey

```
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
```

### Tables touched
- Write: `author_nodes`, `sessions`, `session_bookings`, `purchases`, `email_queue`

---

## 5. BP-01 · Email Marketing

### Author journey

```
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
```

### Reader journey

```
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
```

### Tables touched
- Write: `email_flows`, `email_queue` (pgmq), `crm_contacts`, `email_sync_log`
- Read: `author_email_settings` (sender display name + Reply-To)

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

- Microsite slug authority → `compute_node_microsite_url` in `supabase/functions/_shared/` SQL functions
- Required-asset gates → `hasRequiredAssets()` in `supabase/functions/_shared/node-readiness.ts` and `src/lib/node-readiness.ts`
- Locked rules → `mem://architecture/commerce-engine-v1` (8% platform fee, MoR), `mem://Payout vs Commerce Separation`
