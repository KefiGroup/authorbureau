## Goal

The "Open →" link on each Daily Audit check should take the admin to the **place where they can act on the issue**. If there is no admin-side fix, the link should be **dropped entirely** (the expandable row already shows the JSON details).

## Per-check link mapping

Edits are in `supabase/functions/daily-audit/index.ts` only — each check sets a `link` field that the audit UI renders as "Open →".

| # | Check | Current link | Next step for admin | New link |
|---|---|---|---|---|
| 1 | Errors (24h) | `/admin?tab=errors` | Triage / resolve in Errors tab | **keep** `/admin?tab=errors` |
| 2 | Stuck-live nodes | `/admin?tab=books` (misleading) | No admin-side fix — author must re-publish or attach `library_asset`. Details JSON already lists offending nodes. | **drop link** |
| 3 | Node registry parity | (none) | Requires migration / code release, not an admin UI action | **no link** |
| 4 | Connector secrets | (none) | Add secrets in Lovable Cloud settings — outside the app | **no link** |
| 5 | Cron freshness | (none) | No in-app fix | **no link** |
| 6 | Email queue (24h) | (none) | DLQ/failed rows surface in Errors via `system_error_log` | **add** `/admin?tab=errors` only when `dlq + failed > 0` (otherwise no link) |
| 7 | Content quality (24h) | `/admin/content-quality` | Review violations | **keep** `/admin/content-quality` |
| 8 | Ghost author UIDs | (none) | Investigate via author list | **add** `/admin?tab=authors` only when `count > 0` |
| 9 | Book ownership orphans | (none) | Investigate / reassign in Books | **add** `/admin?tab=books` only when `count > 0` |
| 10 | Multi-book microsite URL health | (none) | Author must re-publish — no admin button | **no link** |

## Rule of thumb (encoded in code)

For each check, only emit `link` when **both** are true:
1. There is a real admin destination that lets us act on the row.
2. `severity !== "ok"` AND `count > 0` (no point linking on a green check).

## Out of scope

- No new admin pages or tabs.
- No change to the audit logic or severity thresholds.
- The expanded row JSON (with `details.sample`) stays as-is — that's how admins see exactly which IDs are affected.

## Files touched

- `supabase/functions/daily-audit/index.ts` — adjust the `link` field on checks #1, #2, #6, #7, #8, #9 per the table above.
