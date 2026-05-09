## Goal

Every morning, you (admin) receive one **Daily Audit & Fixes** report covering the last 24h, delivered both as an email and as a dashboard card with full history. It always sends — even on quiet days.

## What's already in place (reused, not rebuilt)

- `daily-audit` edge function + `daily_audit_runs` table (per-check severity history)
- `daily-audit-cron` runs daily and **already** emails admins — but only on amber/red. We'll flip it to always-send and add the new content sections.
- `admin_audit_log` (admin actions trail)
- `send-transactional-email` infrastructure with admin recipients

## New content the report will include

```text
DAILY OPS REPORT — {date}
========================
1. Health: {green|amber|red}  ({fail_count} fails, {warn_count} warns)
2. Fixes auto-resolved (last 24h):
   - {check_key}: was {prev_severity}, now ok
   - …
3. New issues opened (last 24h):
   - {check_key}: now {severity} — {message}
4. Sprints / code shipped (last 24h):
   - Sprint 58 — CRM Daily Intelligence (3 migrations, 12 files)
   - Sprint 57 — BP-01 Autowire (...)
5. ABBY one-line takeaway (gpt-5-mini)
```

- **Audit deltas** = compare today's `daily_audit_runs.report.checks[]` vs yesterday's row — surface keys whose `severity` flipped either direction.
- **Sprint/code activity** = pull from two sources: (a) new memory files under `mem://sprints/` whose `Updated` timestamp is in the last 24h, exposed via a new `recent_sprint_activity` view sourced from a small `sprint_log` table the cron writes into; (b) count of new rows in `supabase/migrations` based on filename timestamp parsed at audit time. Since the audit runs in an edge function with no filesystem access to the repo, we'll use a lightweight `dev_activity_log` table that I append to at the end of each sprint (one row: `sprint_id`, `title`, `summary`, `files_touched`, `created_at`). The report queries the last 24h.

## Plan of work

### 1. Migration — `dev_activity_log` table
- Columns: `id`, `sprint_id` (text, nullable), `title`, `summary` (text), `files_touched` (text[]), `category` (text — 'sprint'|'audit-fix'|'hotfix'), `created_at`
- RLS: admins read; service-role insert. No public access.

### 2. Edge function — `daily-ops-report` (new)
Replaces the email body that `daily-audit-cron` currently sends. Steps:
1. Read today's `daily_audit_runs` row (just persisted by `daily-audit`)
2. Read yesterday's row → diff `report.checks[]` by `key` → produce `resolved[]` and `opened[]`
3. Read `dev_activity_log` rows where `created_at >= now() - 24h`
4. Call gpt-5-mini for one-line takeaway (no `temperature` override — gpt-5 ban)
5. Persist a row to new `daily_ops_reports` table (`id`, `report_date`, `payload jsonb`, `email_sent_at`)
6. Send transactional email to every `user_roles.role = 'admin'` user via `send-transactional-email` template `daily-ops-report` (system-branded — no `authorId`)

### 3. Migration — `daily_ops_reports` table
- Columns: `id`, `report_date` (date, unique), `payload jsonb`, `email_sent_at timestamptz`
- RLS: admins read

### 4. Email template — `_shared/transactional-email-templates/daily-ops-report.tsx`
- Navy/gold platform-branded React Email
- Sections: Health pill, Resolved (green checks), Opened (red dots), Sprints shipped (cards), ABBY takeaway, "Open dashboard →" button deep-linking to `/admin/audit?date=YYYY-MM-DD`
- Register in `registry.ts`

### 5. Update `daily-audit-cron`
- After running the audit, always invoke `daily-ops-report` (regardless of severity)
- Remove its current "only if amber/red" email branch — the new function owns email

### 6. Dashboard card — `DailyOpsReportCard`
- Lives at top of `AdminAuditPage` (or create one if missing — check existing `/admin/*` routes)
- Fetches `daily_ops_reports` latest row + a 14-day sparkline of health
- Expandable "View full history" → table of past reports, each opens a modal with the saved `payload`
- Admin-only route guard (reuse existing `has_role(auth.uid(),'admin')` check)

### 7. Convention — automatic sprint logging
- After every sprint ships, insert a `dev_activity_log` row. Done by a tiny helper `logSprintActivity({sprint_id,title,summary,files_touched})` callable from any edge function or written to as part of sprint close. Documented in a new memory `mem://process/dev-activity-logging`.
- For Sprint 58 (just shipped), backfill one row so tomorrow's report is non-empty.

### 8. Memory updates
- New `mem://process/dev-activity-logging` — convention rule
- Update `mem://index.md` Memories list

## Files touched

```text
supabase/migrations/<ts>_dev_activity_log.sql                (new)
supabase/migrations/<ts>_daily_ops_reports.sql               (new)
supabase/functions/daily-ops-report/index.ts                 (new)
supabase/functions/_shared/transactional-email-templates/
  daily-ops-report.tsx                                       (new)
  registry.ts                                                (edit)
supabase/functions/daily-audit-cron/index.ts                 (edit — always invoke daily-ops-report)
src/components/admin/DailyOpsReportCard.tsx                  (new)
src/pages/admin/AuditPage.tsx (or equivalent)                (edit — mount card)
mem://process/dev-activity-logging.md                        (new)
mem://index.md                                               (edit)
.lovable/audit-3-must-have.md                                (edit — log this capability)
```

## Out of scope

- Per-author daily reports (already exists: `abby-daily-report`)
- Slack / push notifications
- Auto-fixing audit findings (report only — fixes remain manual / sprint-driven)
- Git diff parsing (we use the explicit `dev_activity_log` instead — more reliable)
