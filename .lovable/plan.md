## Hide "Open" links on healthy audit checks

**Problem:** The Daily Platform Audit still shows `Open →` arrows on green/OK rows (e.g. Errors 24h, Content quality, sometimes Stuck-live). Two reasons:

1. The audit function sets a `link` unconditionally on a few checks (Errors, Content quality), so even when severity is `ok`, the UI renders the link.
2. The dashboard is currently displaying the persisted cron report from ~6 hours ago, which was generated before the previous server-side conditional-link change. Stale reports still carry old links.

**Fix:** Make the UI the source of truth for "is this link actionable?" — only render the `Open →` link when `c.severity !== "ok"`. This:
- Instantly cleans up the currently displayed (stale) cron report without waiting for a re-run.
- Keeps links on warn/fail rows where the admin actually has something to do.
- Doesn't require backend changes or a data backfill.

### Change

`src/components/admin/DailyAuditTab.tsx` — line ~179, change:

```tsx
{c.link && (
```
to:
```tsx
{c.link && c.severity !== "ok" && (
```

### Validation

- Reload `/admin?tab=daily-audit` — confirm OK rows (Errors 24h, Connector secrets, Cron freshness, Email queue, Content quality, etc.) no longer show `Open →`.
- Confirm the Stuck-live nodes WARN row still shows no link (server already strips it; severity-gate is irrelevant here).
- Confirm a WARN/FAIL row that does have a meaningful link (e.g. Errors 24h if errors exist) still shows `Open →`.

Scope: single-line frontend change. No backend, no migration.
