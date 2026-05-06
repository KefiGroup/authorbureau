## Goal

Let each author choose how often ABBY emails them the business report — **Daily**, **Weekly**, or **Monthly** (with **Off** as a 4th option) — from the analytics dashboard (`/revenue-dashboard`). New default: **Weekly**.

---

## 1. Database (migration)

Add to `author_profiles`:
- `report_frequency` text, default `'weekly'`, check in (`'daily'`,`'weekly'`,`'monthly'`,`'off'`)
- `report_weekly_day` smallint, default `1` (Mon, 0=Sun…6=Sat) — used when frequency=weekly
- `report_monthly_day` smallint, default `1` (1–28) — used when frequency=monthly
- `last_report_sent_at` timestamptz — dedupe guard

Backfill: leave existing rows at the new default `'weekly'` (per user instruction "by default is weekly"). Timezone column already exists.

## 2. Dispatcher logic — `supabase/functions/abby-daily-report-dispatcher/index.ts`

Replace the "always fire at local 8am" filter with frequency-aware logic:

```
local 8am AND
  (frequency='daily')                                                   OR
  (frequency='weekly'  AND localWeekday === report_weekly_day)          OR
  (frequency='monthly' AND localDate    === report_monthly_day)
AND last_report_sent_at < (now - 12h)   // dedupe
AND frequency !== 'off'
```

After successful dispatch, stamp `last_report_sent_at = now()`.

## 3. Report generator — `supabase/functions/abby-daily-report/index.ts`

- Accept optional `frequency` in body (defaults to author's stored frequency).
- Widen the stats window to match cadence:
  - daily → yesterday
  - weekly → last 7 days
  - monthly → last 30 days (or current calendar month)
- Adjust subject line + intro:
  - "Your daily business report from ABBY"
  - "Your weekly business report from ABBY"
  - "Your monthly business report from ABBY"
- Pass `frequencyLabel`, `periodLabel` ("Yesterday" / "This week" / "This month") into the email template.
- Update `abby-daily-report.tsx` template section headers ("Yesterday at a glance" → dynamic).

## 4. UI — analytics dashboard

In `src/pages/RevenueFullDashboard.tsx`, add a new card directly under "ABBY's Daily Insight" (rename to "ABBY's Insight"):

**ABBY Report Settings card**
- Radio group: Daily · **Weekly (default)** · Monthly · Off
- Conditional dropdown:
  - Weekly → day-of-week (Mon–Sun)
  - Monthly → day-of-month (1–28)
- Read-only timezone line ("Sent at 8am {timezone}")
- "Send me a test report now" button → invokes `abby-daily-report` with `{ author_id, frequency: <selected> }` (not `dry_run`, so a real email is sent)
- Saves on change via `supabase.from('author_profiles').update({ report_frequency, report_weekly_day, report_monthly_day }).eq('id', authorId)` — instant toast confirmation.

## 5. Memory + docs

- Update `mem://features/abby-performance-coach-and-nudge-engine` with the cadence rule + default = Weekly.
- Add a one-liner to `docs/03-abby-ai/` noting the new author preference.

## 6. Out of scope

- No changes to email queue / template registry plumbing.
- No new cron job — existing hourly dispatcher continues to drive everything.
- No admin override UI (admins can still SQL-edit if needed).

---

### Files touched

- new migration (schema only)
- `supabase/functions/abby-daily-report-dispatcher/index.ts`
- `supabase/functions/abby-daily-report/index.ts`
- `supabase/functions/_shared/transactional-email-templates/abby-daily-report.tsx`
- `src/pages/RevenueFullDashboard.tsx` (+ small new component `AbbyReportSettingsCard.tsx`)
- memory + docs updates
