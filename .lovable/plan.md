# Daily Audit System

One unified audit pipeline, surfaced four ways. Single source of truth (one edge function), consumed by an admin panel, a CLI script, a daily cron email, and a written runbook.

## Architecture

```text
                  ┌─────────────────────────┐
                  │  daily-audit (edge fn)  │  ← single source of truth
                  │  returns JSON report    │
                  └────────────┬────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   Admin panel          scripts/daily-       daily-audit-cron
   (/admin?tab=         audit.mjs            (pg_cron 07:00 UTC)
    daily-audit)        prints MD/JSON       → emails admins
```

## What the audit checks

Each check returns `{ ok, count, severity, details[], link }`.

1. **Errors (24h)** — `system_error_log`: critical/error/warning counts; unresolved critical list.
2. **Stuck-live nodes** — `author_nodes` where `status='live'` but `hasRequiredAssets()` fails (reuses logic from `scripts/audit-stuck-live.mjs`).
3. **Canonical label parity** — runs the same checks as `scripts/check-slug-parity.mjs` (node_registry vs builderNodeConfig).
4. **Connector health** — secret presence (Stripe, Resend, ElevenLabs, Buffer, Lovable AI, Perplexity, Firecrawl) — same set as `SystemHealthCard`.
5. **Cron freshness** — last run timestamps for monthly payouts, annual statements, email sync, daily-audit itself; flag if >25h stale.
6. **Email queue health** — `email_send_log` (deduped by `message_id`): 24h sent / dlq / suppressed counts; flag if dlq > 5.
7. **Content quality (24h)** — top 10 violation types from `content_quality_log`.
8. **Ghost author UIDs** — count of rows in `auth_uid_warnings` last 24h.
9. **Book ownership integrity** — `books` rows with `author_id` not in `author_profiles` (orphans).

Top-level summary: `{ status: 'green' | 'amber' | 'red', issue_count, generated_at }`.

## Deliverables

### 1. Edge function — `supabase/functions/daily-audit/index.ts`
- `verify_jwt = false`; admin check via `has_role(actor, 'admin')` for browser/CLI calls; bypass when called by cron with service-role.
- Returns `{ success, status, report }` per platform convention.
- Reuses `_shared/resolve-user.ts`.

### 2. Admin panel — `src/components/admin/DailyAuditTab.tsx`
- New tab in `AdminDashboard.tsx`: "Daily Audit" (`/admin?tab=daily-audit`).
- "Run audit now" button → invokes `daily-audit` via `adminDataFetch`.
- Renders status header (green/amber/red), 9 collapsible check cards with deep-links (e.g., stuck-live → Books tab, errors → Errors tab).
- "Copy as Markdown" + "Download JSON" buttons.
- Auto-runs latest cached report on mount; shows "last run X ago".

### 3. CLI script — `scripts/daily-audit.mjs`
- Node script that calls the edge function via service-role key (read from env), prints a markdown report to stdout, exits non-zero if status=red.
- `--json` flag for raw JSON output (cron/CI friendly).
- Also runs `audit-stuck-live.mjs` and `check-slug-parity.mjs` checks inline so it works without the edge fn (offline fallback).

### 4. Daily email — `daily-audit-cron` + transactional template
- `pg_cron` job at 07:00 UTC daily → calls `daily-audit` edge fn → if any issue, invokes `send-transactional-email` with template `daily-audit-report` to all admin users (one email per admin, idempotency key = `daily-audit-{YYYY-MM-DD}-{adminId}`).
- New React Email template `_shared/transactional-email-templates/daily-audit-report.tsx` — navy/gold branded, summary table + top issues + link back to `/admin?tab=daily-audit`.
- Stores last report in new `daily_audit_runs` table (id, generated_at, status, report jsonb) so panel can show history.

### 5. Runbook — `docs/05-sprint-records/07-daily-audit-runbook.md`
- Lists all surfaces: Daily Audit tab, CLI command, email subscribers, existing tabs (Errors, Content Quality), existing scripts.
- Severity legend (green/amber/red) and what to do for each issue type.
- Troubleshooting section (e.g., "no email arrived" → check `email_send_log`, suppression list).

## Database migration

```sql
create table public.daily_audit_runs (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null default now(),
  status text not null check (status in ('green','amber','red')),
  issue_count int not null default 0,
  report jsonb not null
);
alter table public.daily_audit_runs enable row level security;
create policy "Admins read audit runs" on public.daily_audit_runs
  for select using (public.has_role(auth.uid(), 'admin'));
-- service role inserts; no client write policy
create index on public.daily_audit_runs (generated_at desc);
```

Plus pg_cron schedule for `daily-audit-cron`.

## Files

**New**
- `supabase/functions/daily-audit/index.ts`
- `supabase/functions/daily-audit-cron/index.ts`
- `supabase/functions/_shared/transactional-email-templates/daily-audit-report.tsx` (+ registry update)
- `src/components/admin/DailyAuditTab.tsx`
- `scripts/daily-audit.mjs`
- `docs/05-sprint-records/07-daily-audit-runbook.md`

**Edited**
- `src/pages/AdminDashboard.tsx` — register new tab
- `supabase/functions/_shared/transactional-email-templates/registry.ts`

## Out of scope
- Slack/Discord webhooks (email + dashboard cover the channels you have today).
- Auto-remediation (audit reports only; humans act).
- Per-author audits (this is platform-wide; per-author lives in CRM).
