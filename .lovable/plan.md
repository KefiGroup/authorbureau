## Sprint Closeout — 3 Bug Fixes

### Bug 1 — Gate engine doesn't fire on publish

**Findings**
- Today the gate engine is only kicked off from the client (`useBuilderPublish.ts`) and a future cron. Any server-side publish path (cascade, admin action, library adopt) bypasses it.
- `author_nodes` already has 5 triggers but none calls `abby-gate-engine`.

**Fix**
1. Add a fire-and-forget `fetch` to `abby-gate-engine` in `supabase/functions/save-author-node/index.ts`, inside the `:publish` block right after the row update succeeds (line ~478). Pass `{ author_id, book_id }`. Wrap in try/catch — never block publish.
2. Add a DB trigger as a safety net so any path that flips `author_nodes.status` to `'live'` (cascades, manual SQL, future jobs) also calls the engine via `pg_net.http_post`. Pattern mirrors the existing `trigger_generate_asset_pack()` trigger — same shape, different URL/body. Trigger only on `OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'live'` (or INSERT with status='live').
3. Keep the existing client-side trigger as a third safety net (already works).

### Bug 2 — Funnels created in draft with empty stages

**Findings**
- `generate-funnel/index.ts` writes ONE row to `funnels` (`status: 'draft'`, body_copy only) and never touches `funnel_stage_overrides`.
- The 5-stage UI is read from `funnel-flow-stages.ts` (Archetype B = Traffic, Opt-in Page, Confirm Email, Deliver Magnet, Nurture Day 1, Upsell). Each stage's overrides live in `funnel_stage_overrides`. With no overrides + no defaults, stages render `incomplete`.
- Library already has the source content: BP-01 email sequence (welcome + day-1 nurture), BP-02 lead-magnet delivery URL, BP-03 social post, BP-06/upsell product info.

**Fix — extend `ensureFunnel()` in `abby-gate-engine`**
After `generate-funnel` returns the new funnel row (Archetype B for Gate 1's BP-02 funnel, Archetype A for Gate 2's BP-06 funnel), the engine pulls Library assets and seeds `funnel_stage_overrides` for the missing stages, then flips the funnel `status` to `'published'` (or `'live'` — whatever the existing `funnels-manage` publish path uses):

| Stage | Source |
|---|---|
| `traffic` | `author_nodes` BP-03 → first `social_posts` row body |
| `confirm_email` | `email_sequences` for BP-01 → step 1 (subject + body) |
| `deliver_magnet` | `author_nodes` BP-02 → `library_asset.public_url` |
| `nurture_1` | `email_sequences` for BP-01 → step 2 (delay 1d) |
| `upsell` | `author_nodes` BP-06 → product title + microsite URL |

Implementation:
1. Refactor `ensureFunnel()` so after creating the funnel it calls a new helper `autoCompleteFunnelStages(funnelId, archetype, authorId, bookId)`.
2. Helper queries Library, builds a `Record<stageId, Record<field, value>>`, upserts into `funnel_stage_overrides` (one row per stage_id).
3. After overrides written, update `funnels.status = 'published'` and `published_at = now()`.
4. If a Library source is missing, leave that stage blank (don't block publish — funnel still goes live with whatever stages are filled). Log the gap to `console.warn`.
5. Idempotent: re-running on an already-published funnel is a no-op (`select id from funnels where node_id = ... limit 1` already short-circuits).

### Bug 3 — CRM scoring stuck at zero

**Findings**
- DB confirms: `email_send_log` has 1,977 rows, but **0 opens / 0 clicks** ever recorded. `lead_activities` only has 1 `quiz_completed` event.
- `process-email-events/index.ts` exists and correctly mirrors scores into `crm_contacts` — it just never gets called.
- The `abby-daily-report-hourly` cron IS running (`5 * * * *`). That's not the bottleneck.
- Root cause: the Resend webhook is not pointed at `/functions/v1/process-email-events`, so `email.opened` / `email.clicked` events never reach the platform. Without engagement events, `abby_score` never moves and contacts never advance to Engaged → Warm → Hot.

**Fix**
1. Verify the Resend webhook configuration: confirm a webhook exists for events `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`, `email.unsubscribed` pointed at `https://tubpbslfrxyfhldkcyyq.supabase.co/functions/v1/process-email-events`. If missing, configure it (Resend dashboard or via API) — this is the actual fix.
2. Set `verify_jwt = false` on `process-email-events` in `supabase/config.toml` (Resend can't sign with a Supabase JWT). Add HMAC verification using the existing `RESEND_WEBHOOK_SECRET` secret to `process-email-events/index.ts` — currently the function does no signature check, which is a security gap revealed by this audit.
3. Add a one-time backfill: a small admin script or extension to `abby-daily-report` that, for each `crm_contacts` row with at least one `email_send_log` (joined via email + author_id), gives a baseline `+1` per delivered email so legacy contacts don't sit at 0 forever. Cap at 10. Optional but recommended — confirm with user before shipping.
4. Add a `lead_activities` insert path keyed off `crm_contacts` directly (not just `leads`) so future contacts captured outside the leads pipeline still score. Currently `process-email-events` only inserts to `lead_activities` if a `leads` row exists — direct CRM contacts get the score mirror but no activity timeline.

### Files touched

- `supabase/functions/save-author-node/index.ts` — Bug 1 hook
- `supabase/migrations/<ts>_author_nodes_gate_engine_trigger.sql` — Bug 1 trigger
- `supabase/functions/abby-gate-engine/index.ts` — Bug 2 (extend `ensureFunnel`, add `autoCompleteFunnelStages`)
- `supabase/functions/process-email-events/index.ts` — Bug 3 (HMAC verify + crm_contacts-direct activity insert)
- `supabase/config.toml` — `verify_jwt = false` for `process-email-events`
- Resend dashboard — webhook URL config (one-time)

### Open questions before I build
1. **Bug 2 publish status:** confirm the `funnels` "live" status string — is it `'published'`, `'live'`, or `'active'`? I'll grep `funnels-manage` to be sure but flag it now.
2. **Bug 3 backfill:** ship the one-time legacy-contact baseline scoring, or skip it and only fix forward?
3. **Bug 3 webhook:** can you add the Resend webhook in the Resend dashboard yourself (I can't reach it), or do you want me to add a small admin UI + edge function that registers it via the Resend API using `RESEND_API_KEY`?