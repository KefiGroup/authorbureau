# Audit #4 — Sender Domain Fix (Platform-Wide)

## Root cause
1,768 failed sends in 7 days, all with the same Resend error:
*"The authorsbureau.com domain is not verified."*

Verified domain in Resend = `notify.authorsbureau.com`. Three edge functions hardcode the wrong sender. This blocks email for **every author**, not just Pauline.

## Fix scope (this sprint)

### 1. Replace hardcoded sender in 3 edge functions
- `supabase/functions/process-email-flows/index.ts` (line 167) — `newsletter@authorsbureau.com` → `newsletter@notify.authorsbureau.com`
- `supabase/functions/send-campaign/index.ts` (line 144) — same fix
- `supabase/functions/trigger-sequence/index.ts` (line 130) — `onboarding@resend.dev` → `newsletter@notify.authorsbureau.com`

Set `reply_to` to author's `author_email_settings.reply_to_email` if present, else `support@authorsbureau.com`, so replies still reach the author.

### 2. Centralize via shared helper
New file `supabase/functions/_shared/from-address.ts` exporting `buildFromAddress(senderName, replyTo?)`. All 3 functions import from it. Future flows can't drift back to the unverified domain.

### 3. Deploy + re-poke stuck enrollments
- Deploy the 3 edge functions
- Reset `email_flow_enrollments` rows where `last_sent_at IS NULL` and `created_at > now() - 30 days` so step 1 retries on the next cron tick (within 60s)
- Verify `email_send_log` shows new `sent` rows within 2 minutes

## Out of scope (queued for later)
- Engagement scoring in `resend-webhook` (open/click → `leads.abby_score`)
- Hot Leads card in CRM
- Instant welcome email (currently 5-min cron delay)
- Per-author verified subdomains
- Migrating `sequence_step` to durable pgmq queue

## Files changed
- `supabase/functions/_shared/from-address.ts` — **new**
- `supabase/functions/process-email-flows/index.ts`
- `supabase/functions/send-campaign/index.ts`
- `supabase/functions/trigger-sequence/index.ts`

## Success criteria
- Zero new `failed` rows with the "domain not verified" error after deploy
- The 17 currently-active enrollments produce `sent` rows
- Pauline's quiz → welcome email arrives (within 5 min on the existing cron)
