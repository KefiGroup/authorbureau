## Run audits + fix the 2 real bugs

I ran the 9 underlying audit checks directly against the database. Results:

| # | Check | Result | Status |
|---|---|---|---|
| 1 | Errors (24h) | 3 errors, all from `daily-audit-cron` saying "audit call failed → 401 invalid token" | **fail** (bug 1) |
| 2 | Stuck-live nodes | 27 reported, but 22 of those are nodes that correctly use the `deriveLibraryAsset` fallback per the Sprint 55 memory (BA-10/12/13/15/16/17/18, BP-02/05/07/08, YR-19→YR-28). Only 5 nodes have real assets (BP-01, BP-04, BP-06, BA-11, BA-14). | **false positive** (bug 2) |
| 3 | Node registry parity | 28/28, all canonical labels present | green |
| 4 | Connector secrets | All 8 present | green |
| 5 | Cron freshness | OK (last email_sync recent) | green |
| 6 | Email queue (24h) | No dlq/failed | green |
| 7 | Content quality (24h) | 0 violations | green |
| 8 | Ghost author UIDs (24h) | 0 | green |
| 9 | Book ownership orphans | 0 | green |

So **2 real bugs** to fix.

### Bug 1 — daily-audit-cron 401 "invalid token"

`daily-audit-cron` calls `daily-audit` with `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`. The platform's gateway is rewriting that header for inter-function calls, so when `daily-audit` runs `authorize()` the token no longer matches `SERVICE_ROLE_KEY`, falls through to `getUser()`, which returns no user → "invalid token".

**Fix:** Add a private shared-secret header that bypasses the gateway's rewriting.

- In `supabase/functions/daily-audit/index.ts`, also accept the request when header `x-cron-secret` equals `Deno.env.get("CROSS_PLATFORM_SECRET")` (already in project secrets — used elsewhere for the same pattern).
- In `supabase/functions/daily-audit-cron/index.ts`, send that header alongside the existing Authorization bearer.

This keeps service-role and admin-JWT paths working for CLI / panel use, and adds a reliable cron path.

### Bug 2 — Stuck-live false positives

The check requires every live node to have `library_asset.url + library_asset.kind`. That's wrong: per the Sprint 55 memory, only **BP-01, BP-03, BP-04, BP-06, BP-09** write a real asset. All others legitimately rely on the `deriveLibraryAsset` fallback.

**Fix:** In `daily-audit/index.ts`, restrict the stuck-live check to those 5 "adopter" builders. For all other live nodes, only flag when `delivery_url` is missing (their actual contract). Re-label severity:
- Adopter node missing `library_asset.kind/url` → fail member.
- Non-adopter node missing `delivery_url` → warn member.
- Otherwise OK.

This matches the canonical adoption rule and removes 22 false alarms.

### Cleanup
After deploying the two fixes, re-invoke `daily-audit-cron`, then mark the 3 stale `system_error_log` rows from `daily-audit-cron` as resolved (via `admin_resolve_errors` RPC) so the next run reports green/amber accurately.

### Files touched
- `supabase/functions/daily-audit/index.ts` (auth + stuck-live logic)
- `supabase/functions/daily-audit-cron/index.ts` (send `x-cron-secret`)
- Re-deploy both edge functions.
- Resolve 3 stale error rows.

### Out of scope
- Changing the rest of the checks (all green).
- Schema/UI changes (the admin Daily Audit panel will benefit automatically).
- Schedule changes (already running 21:00 UTC = 05:00 SGT daily).
