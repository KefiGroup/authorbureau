# Daily Audit Runbook

Single source of truth: the **`daily-audit`** edge function. Surfaced four ways.

## 1. Admin dashboard panel
- URL: `/admin?tab=daily-audit` (or click **Daily Audit** in the admin tab bar).
- Click **Run audit now** to trigger on demand.
- Loads the latest persisted run on mount. Use **Recent runs** to inspect history.
- Buttons: copy report as Markdown, download as JSON.

## 2. CLI script
```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/daily-audit.mjs
node scripts/daily-audit.mjs --json   # machine-readable
```
Exit code 0 = green, 1 = amber/red. Suitable for cron / CI.

## 3. Daily email (cron)
- `daily-audit-cron` edge function calls `daily-audit` then emails each admin via `send-transactional-email` (template `daily-audit-report`) when status is amber or red.
- **Schedule:** `0 21 * * *` UTC = **05:00 SGT daily** (job name: `daily-audit-cron`).
- To change the time or remove the schedule:
  ```sql
  -- Inspect
  select jobid, schedule, jobname from cron.job where jobname = 'daily-audit-cron';
  -- Remove
  select cron.unschedule('daily-audit-cron');
  -- Reschedule (use the Supabase insert tool; replace the bearer with the anon key)
  select cron.schedule('daily-audit-cron', '0 21 * * *', $$ select net.http_post(...); $$);
  ```
- Idempotency key: `daily-audit-{YYYY-MM-DD}-{adminId}` — re-runs the same day will not duplicate.

## 4. Existing complementary surfaces
- **Errors tab** (`/admin?tab=errors`) — drill into individual rows from `system_error_log`.
- **System Health card** (Overview tab) — connector secrets + last cron runs.
- **Content Quality Log** (`/admin/content-quality`) — per-violation detail.
- **Scripts** — `scripts/audit-stuck-live.mjs`, `scripts/check-slug-parity.mjs` (now also rolled into the unified audit).

## Severity legend
| Status | Meaning | Action |
|---|---|---|
| **green** | All checks OK | None |
| **amber** | Some `warn` checks | Review when convenient |
| **red** | At least one `fail` check | Investigate same day |

## What's checked
1. Errors (24h) — `system_error_log`; only unresolved errors/criticals raise severity
2. Stuck-live nodes — `author_nodes` on legacy fallback (re-publish to upgrade)
3. Node registry parity — 28 nodes with canonical labels
4. Connector secrets — Stripe, Resend, ElevenLabs, Buffer, Lovable AI, Perplexity, Firecrawl
5. Cron freshness — payouts / statements timestamps (email sync is event-driven, informational only)
6. Email queue (24h) — sent / dlq / failed / suppressed counts (deduped by message_id)
7. Content quality (24h) — unresolved vs auto-corrected. DB triggers on `author_nodes`, `social_posts`, `generated_assets` strip dashes, fill "[Your Name]/[Your Website]" with real author details, swap banned phrases, and preserve the `{{first_name}}` merge tag
8. Ghost author UIDs — `auth_uid_warnings` last 24h
9. Book ownership orphans — `books.author_id` not in `author_profiles`

## Troubleshooting
- **No email arrived**: check `email_send_log` for `template_name='daily-audit-report'`; verify recipient not on `suppressed_emails`.
- **Edge fn 401**: confirm caller is admin user or using `SUPABASE_SERVICE_ROLE_KEY`.
- **Empty history**: the panel reads `daily_audit_runs` (admin-only RLS) — ensure caller has the admin role.

## Permanent synthetic test fixture

A dedicated sandbox exercises the whole platform every day without touching real author data.

- Test author: `audit.author@authorsbureau.com` (pen name Avery Sandhu, slug `audit-sandbox`, `directory_status = unlisted`, `is_test = true`).
- Test reader: `audit.reader@authorsbureau.com`.
- Pseudo book: "The Modern Thought Leader" (`modern-thought-leader`), 8-chapter manuscript stored as `generated_assets.asset_type = 'source_material'`.
- `is_test = true` on `books`, `author_profiles`, `author_subscribers`, `crm_contacts` keeps the fixture out of the directory, Meet Our Authors, and revenue reporting.

Edge function `audit-test-fixture` accepts `{"action": "ensure" | "journey" | "cleanup"}` (service role, cron secret, or admin JWT). The journey is also check #11 (`synthetic_journey`) inside `daily-audit`, so every daily run verifies: fixture intact, manuscript readable, reader signup, email-flow enrolment, welcome email dispatch, and the module ledger. Failures appear red the same day in `/admin?tab=daily-audit` and in the daily admin email.
