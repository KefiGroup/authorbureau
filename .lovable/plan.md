## Diagnosis — what's actually happening

The audit and the email **did run successfully**, but **only on the Test (dev) backend**. The published site at `authorsbureau.com/admin` reads from the **Live (prod) backend**, which is a completely separate Supabase project. That prod project has no audit rows, no ops report, and the prod cron job never fired — so there is nothing for the admin to display, and Pauline's inbox got nothing from the prod side.

Evidence:
- Two project refs are bound to this app: `tubpbslfrxyfhldkcyyq` (Test/dev — what `.env` and all my tools query) and `wpczgwxsriezaubncuom` (Live/prod — what `authorsbureau.com` actually uses).
- All the rows I confirmed earlier (`daily_audit_runs` 2026-05-10 21:00 UTC, `daily_ops_reports` 2026-05-10 amber, `email_send_log` `daily-audit-report` → sent) live in **dev**, not prod.
- The DailyOpsReportCard "No daily ops report yet" and DailyAuditTab "No audit has been run yet" messages on the screenshot are correct for the prod DB — there genuinely is no row there.
- This is the same Test-vs-Live drift pattern documented for the email queue: cron jobs and Vault secrets do not propagate via publish; they have to be re-provisioned against the prod DB.

## What needs to happen

```text
                       Test (dev)              Live (prod)
                       tubpbslfrxyf…           wpczgwxsri…
daily-audit             deployed                deployed
daily-audit-cron        deployed + cron job    deployed, NO cron job  ← missing
daily_audit_runs        rows present            empty                  ← consequence
daily_ops_reports       row for 2026-05-10      empty                  ← consequence
email_send_log          'sent' to Pauline       empty                  ← why no email
```

## Plan

### Step 1 — Re-provision the daily-audit cron on the Live (prod) DB
On the prod Supabase project, create the missing pg_cron schedule that calls `daily-audit-cron` once per day at 21:00 UTC, authenticated with prod's `SUPABASE_SERVICE_ROLE_KEY` (stored in Vault) plus the existing `CROSS_PLATFORM_SECRET` header. Pattern is identical to the dev cron, just pointed at the prod functions URL.

Done via a migration that:
1. Reads/creates a Vault secret `daily_audit_service_role_key` on prod.
2. `cron.schedule('daily-audit-cron', '0 21 * * *', $$ select net.http_post(...) $$)` against `https://wpczgwxsriezaubncuom.supabase.co/functions/v1/daily-audit-cron`.
3. Idempotent — drops any existing job with the same name first.

### Step 2 — Backfill today's prod report so the admin isn't empty
Manually invoke `daily-audit-cron` against the **prod** function URL once. This will:
- write today's row to prod `daily_audit_runs`
- upsert today's row into prod `daily_ops_reports`
- email Pauline from prod with template `daily-audit-report`

After this, the screen she screenshotted will populate immediately and her inbox gets the report.

### Step 3 — Add a Live/Test parity guard to `daily-audit`
Add a `phase: "live" | "test"` field to the audit `report.checks[]` output (derived from `SUPABASE_URL` env), and surface it in the admin UI header so the source DB is unambiguous. Prevents future "I see it but the user doesn't" confusion when the same code runs against two DBs.

### Step 4 — Verify
- Query prod `daily_ops_reports` → expect today's row.
- Query prod `email_send_log` where `template_name='daily-audit-report'` → expect a `sent` row to `paulinet77@gmail.com`.
- Reload `authorsbureau.com/admin?tab=daily-audit` → DailyOpsReportCard renders today's report, DailyAuditTab shows the run in history.
- Confirm Pauline received the email (check inbox, not just `email_send_log`).

## Out of scope
- No changes to audit logic (Sprint 60 work stands).
- No changes to email templates.
- No changes to dev cron (already working).

## Technical notes
- Step 1 must be a migration so it persists; tool must run against the **prod** DB (not the default dev one). Will use the prod project ref `wpczgwxsriezaubncuom`.
- Step 2 is a one-shot `curl` against the prod functions endpoint with the prod service-role key + cron secret header.
- `daily-audit-cron` already calls `daily-audit` over HTTP, so as long as the prod cron fires, both functions get exercised on prod. No code changes required for Steps 1 & 2.
- Step 3 is a small, additive change to `supabase/functions/daily-audit/index.ts` plus a one-line badge in `DailyAuditTab.tsx` / `DailyOpsReportCard.tsx`.
