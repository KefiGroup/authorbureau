## Schedule Daily Audit at 05:00 SGT

SGT is UTC+8, so 05:00 SGT = **21:00 UTC** the previous day. Cron expression: `0 21 * * *`.

### What I'll do

1. Enable `pg_cron` and `pg_net` extensions if not already (idempotent).
2. Insert a cron job named `daily-audit-cron` that POSTs to the `daily-audit-cron` edge function once per day at 21:00 UTC, using the project's anon key in the Authorization header.
3. Update `docs/05-sprint-records/07-daily-audit-runbook.md` to reflect the actual schedule (05:00 SGT / 21:00 UTC) instead of the placeholder 07:00 UTC, and note how to change/remove the schedule.

### SQL (executed via the Supabase insert tool, not migration — contains anon key)

```sql
select cron.schedule(
  'daily-audit-cron',
  '0 21 * * *',  -- 21:00 UTC = 05:00 SGT daily
  $$
  select net.http_post(
    url := 'https://tubpbslfrxyfhldkcyyq.supabase.co/functions/v1/daily-audit-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

If a job named `daily-audit-cron` already exists, I'll `cron.unschedule('daily-audit-cron')` first so the insert is idempotent.

### Out of scope
- No edge function or UI changes — schedule only.
- No change to email recipients (still all admins, only emails when status is amber/red).
