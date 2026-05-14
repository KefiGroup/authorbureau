# Fix all admin tabs failing with "Admin access required"

## Root cause

Two edge functions still verify the caller with the **project-local** Supabase client:

- `supabase/functions/admin-data/index.ts` → `verifyAdmin()` calls `client.auth.getUser(token)` on the Cloud project client
- `supabase/functions/daily-audit/index.ts` → `authorize()` calls `admin.auth.getUser(token)` on the Cloud project client

Pauline (and every shared-backend admin) signs in via the **shared** Supabase project. Her JWT is signed by a key the local Cloud project does not recognise (`unrecognized JWT kid`). So:

1. `auth.getUser(token)` returns no user.
2. `admin-data`'s shared fallback then queries `user_roles` against the **shared** user id (`50a60e39…`), but her admin role row is bound to the **Cloud** user id (`5fd84779…`). No role row → 403.
3. `daily-audit` has no fallback at all → 403.

This is exactly the same bug already fixed in `admin-books` last loop (replaced with `_shared/resolve-user.ts`). Every admin tab that calls these two functions is affected: Errors, CRM, Messages, Reading Club, Authors, Support, Payouts, Audit Log, System Health, Broadcast, Daily Ops report, and Daily Audit.

## Fix

Apply the same canonical pattern used by `admin-books` and `list-my-books`.

### 1. `supabase/functions/admin-data/index.ts`
- Import `resolveUser` from `../_shared/resolve-user.ts`.
- Replace `verifyAdmin(token)` body with:
  - `const resolved = await resolveUser(authHeader)`
  - If `!resolved.id` → return `{ userId: null, client: null }`
  - Look up `user_roles` for `resolved.id` (the reconciled Cloud user id) with role = `admin`
  - On match return `{ userId: resolved.id, client }` (service-role client unchanged)
- Keep the existing `client` (service-role) for the rest of the action handlers — only the identity resolution changes.

### 2. `supabase/functions/daily-audit/index.ts`
- Import `resolveUser`.
- In `authorize()`, keep the cron-secret and raw service-role short-circuits, then replace the `admin.auth.getUser(token)` block with:
  - `const resolved = await resolveUser(authHeader)`
  - If superadmin email match → allow.
  - Otherwise check `user_roles` for `resolved.id` with role `admin`.
- Return the same `{ ok, actor, reason }` shape so the rest of the function is unchanged.

### 3. Deploy + verify
- Deploy `admin-data` and `daily-audit`.
- Curl `admin-data` with action `daily-audit-history` and `daily-audit` POST to confirm 200 with Pauline's session.
- Reload `/admin?tab=errors` and `/admin?tab=daily-audit` to confirm both tabs render and "Run audit now" succeeds, which will also populate the Daily Ops report (cron will then keep emailing it).

## Out of scope

- No client-side changes — `useAuthReady` gating in `AdminDashboard` already shipped last loop.
- No schema or RLS changes.
- `admin-books` is already correct; not retouched.
