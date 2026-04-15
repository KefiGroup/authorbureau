

# Sprint 28: ABBY Continuous AI Nurture Engine

## What We're Building

One complete working loop: Author activates node → ABBY generates marketing assets → live landing page with lead capture → lead submits → welcome email sent → open/click tracked → ABBY generates next email.

## Existing Infrastructure We Reuse

- **`author_subscribers`** table — already captures leads per author with email, source, status
- **`email_send_logs`** table — already tracks opens, clicks, bounces per email
- **`generated_assets`** table — already stores AI-generated content per book
- **`author_nodes`** table — tracks node status, content_json, microsite_url
- **`microsite-action`** edge function — already handles opt-in form submissions and saves to `author_subscribers`
- **`get-microsite-page`** edge function — already serves landing page data
- **`MicrositePage.tsx`** — already renders landing pages with lead capture forms
- **`send-transactional-email`** edge function — already sends emails via Lovable Email infra with queue/retry
- **`process-email-queue`** — already processes email queue via pg_cron
- **AI generation functions** (`generate-bp01`, `generate-bp02`, etc.) — already generate marketing content from manuscripts

## Database Changes (Migration)

### New Table: `leads`
```
id, email, name, book_id, author_id, source (microsite/manual/import),
status (active/nurturing/customer/unsubscribed), captured_at,
last_activity_at, nurture_stage (welcome/engaged/dormant/customer),
metadata jsonb
```
RLS: author can read/update own leads.

### New Table: `nurture_events`
```
id, lead_id, event_type (email_sent/email_opened/email_clicked/
purchase/unsubscribe/reply/page_view), metadata jsonb, created_at
```
RLS: author can read own lead events.

### New Table: `generated_emails`
```
id, lead_id, author_id, book_id, subject, body_html, body_markdown,
trigger_condition (welcome/follow_up/re_engage/upsell/announce),
status (queued/sent/failed/cancelled), scheduled_at, sent_at,
resend_message_id, metadata jsonb
```
RLS: author can read own emails.

### New Table: `marketing_assets`
```
id, book_id, author_id, asset_type (landing_page/lead_magnet_outline/
social_calendar/blog_post/amazon_aplus/ad_copy/review_kit),
content jsonb, status (draft/approved/live), created_at, updated_at
```
RLS: author can CRUD own assets.

## Edge Functions (New or Modified)

### 1. `abby-generate-marketing-assets` (New)
- Input: `{ book_id, author_id }`
- Reads manuscript from `generated_assets` (source_material)
- Calls Lovable AI Gateway (gpt-5.2) with structured prompts for each asset type
- Saves all 7 asset types to `marketing_assets` table with status `draft`
- Returns asset summaries

### 2. `abby-activate-node` (New)
- Input: `{ author_id, node_id, book_id }`
- Verifies all required marketing assets exist and are approved
- Updates `author_nodes` to status `live`
- Sets microsite_url
- Returns success

### 3. Modify `microsite-action` 
- After saving to `author_subscribers`, ALSO insert into `leads` table
- Insert a `nurture_events` record (event_type: `captured`)
- Call `abby-nurture-respond` to generate immediate welcome email

### 4. `abby-nurture-respond` (New)
- Input: `{ lead_id }` or `{ lead_id, event_type }`
- Reads lead data, book manuscript, author profile
- Determines next action based on nurture_stage and last event
- Generates personalised email via Lovable AI Gateway
- Saves to `generated_emails` with status `queued`
- Enqueues via `send-transactional-email` (uses existing email queue infra)

### 5. `abby-nurture-cron` (New — scheduled every 24h)
- Queries all leads with `status = active`
- For each lead, checks `nurture_events` for last activity
- Applies rules:
  - No open after 48h → generate alternative subject, resend
  - Link clicked → advance to product interest
  - No activity 14 days → re-engagement campaign
  - Purchase → move to customer track
- Calls `abby-nurture-respond` for each lead needing action
- pg_cron job triggers this daily

### 6. `track-email-event` (New)
- Webhook endpoint for email open/click tracking
- Inserts into `nurture_events`
- Updates `leads.last_activity_at` and `nurture_stage`

## Frontend Changes

### Marketing Hub Overhaul (`MarketingHub.tsx`)
- Replace GHL deploy function calls with `abby-generate-marketing-assets`
- New "Activate" flow:
  1. Click "Activate" → ABBY generates all 7 asset types
  2. Show asset review cards (landing page copy, email sequences, social calendar, etc.)
  3. Author approves each asset (or edits inline)
  4. "Go Live" button calls `abby-activate-node`
  5. Node status becomes `live`, landing page URL shown

### Asset Review UI (New Component)
- `MarketingAssetReview.tsx` — card-based review of each generated asset
- Inline editing with markdown preview
- Approve/regenerate per asset
- Progress indicator showing which assets are ready

### Lead Dashboard (New Component)
- `LeadsDashboard.tsx` — shows captured leads, nurture stage, email history
- Accessible from Marketing Hub when node is live
- Shows: total leads, open rates, click rates, nurture stage distribution

## What Gets Removed/Deprecated

- All 28 `deploy-*-to-ghl` edge functions — no longer called from Marketing Hub (kept in codebase for optional GHL sync later)
- GHL-specific code in `MarketingHub.tsx` — replaced with native ABBY flow
- `CAMPAIGNS` config array referencing `deployFunctions` — replaced with ABBY activation

## GHL as Optional Add-On

- `microsite-action` already pushes to GHL contacts when `ghl_sub_account_id` exists — this stays unchanged
- No GHL required for the core loop to work

## Sprint 28 Delivery Sequence

1. **Database migration** — create 4 new tables with RLS
2. **`abby-generate-marketing-assets`** — AI asset generation
3. **Modify `microsite-action`** — add lead capture + welcome email trigger
4. **`abby-nurture-respond`** — generate personalised emails from manuscript
5. **`track-email-event`** — open/click webhook
6. **`abby-nurture-cron`** — daily scheduled job
7. **Frontend: Marketing Hub + Asset Review UI** — replace GHL flow
8. **Frontend: Leads Dashboard** — monitoring
9. **End-to-end test** — activate node, submit form with real email, verify welcome email arrives, simulate open, verify follow-up queued

## Technical Notes

- AI generation uses Lovable AI Gateway with `openai/gpt-5.2` (per memory rules)
- Email sending uses existing `send-transactional-email` → pgmq queue → `process-email-queue` cron
- Landing pages already work via `MicrositePage.tsx` + `get-microsite-page`
- All edge functions use `verify_jwt = false` with in-code validation per platform standard
- Token auth via `getActiveToken()` per memory rules

