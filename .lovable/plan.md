## Problems

Two issues with the Manage Plan flow for `pl@paulineteo.com`:

### 1. Billing Portal returns an error
Edge function logs confirm:
```
[customer-portal] Error: Could not resolve user email from token
```
The `customer-portal` function tries (a) local Cloud auth, (b) shared backend auth, (c) raw JWT decode — and all three fail for this user's session token. This user authenticates against the shared backend (`wuftdpnekscrsghqtssd.supabase.co`), and the JWT decode fallback isn't returning an email either.

The real reason: the recent `get-active-token.ts` change introduced a `localStorage` fallback that can return a token from the **wrong** Supabase project (the shared backend session) which `supabase.functions.invoke()` then sends to the local Cloud function. The local `auth.getUser` rejects it (different signing key), the shared lookup also fails because the token may already be expired or only the access_token portion is present, and the JWT payload doesn't contain `email` (Supabase JWTs put email under `email` only when not stripped — the shared backend JWT here isn't carrying it the way we expect).

### 2. Manage Plan link highlights "Author Profile" in sidebar
`/account-settings?tab=billing` is mapped in `DashboardLayout.deriveActiveSection` to the `"profile"` sidebar item — which is rendered as **"Author Profile"** in the sidebar. So clicking "Manage plan" lands the user on Billing, but the left nav shows Author Profile selected — visually wrong and confusing.

## Plan

### Fix A — Resolve email reliably in `customer-portal`
Make `resolveUserEmail` robust:
1. Always try local Cloud `auth.getUser(token)` first.
2. If that fails, try shared backend `auth.getUser(token)`.
3. **NEW**: If both fail, look up the email by `user_id` claim from the JWT against `auth.users` in the shared backend via service role (we already query users by id in other shared-backend functions).
4. Add detailed logging at each step (token prefix, decoded sub, decoded email presence) so future failures are diagnosable.
5. Return a clear, actionable error message to the client (e.g. "Session expired — please sign out and back in") instead of the generic 500.

Also harden the frontend `handleManageBilling`:
- Pass the resolved access token explicitly via `headers: { Authorization: 'Bearer ${token}' }` using `getActiveToken()` (the same helper used elsewhere) so the function never receives a stale/wrong token from the SDK lock fallback.
- Surface the edge function's `error` body in the toast (currently shows only the SDK's generic "non-2xx" message).

### Fix B — Highlight a dedicated "Account" item for billing
Two options, pick simplest:
- Add a new sidebar item ID `"account"` for `/account-settings*`, distinct from the profile-editor "Author Profile" item, OR
- Add an explicit override: when `pathname.startsWith("/account-settings")`, return a new section that maps to a distinct sidebar entry labeled "Account & Billing".

Recommended: introduce `"account"` section, render a small "Account" entry under the user menu area (already exists in `DashboardHeader`), and stop forcing any sidebar item to highlight when on `/account-settings`. This avoids cluttering the main nav and matches user expectation that billing lives in the user/account dropdown, not in the sidebar.

### Files to change
- `supabase/functions/customer-portal/index.ts` — robust email resolution + better errors, redeploy.
- `src/pages/AccountSettings.tsx` — pass explicit Authorization header, surface edge error body.
- `src/components/dashboard/DashboardLayout.tsx` — change `/account-settings` mapping so the Author Profile item no longer lights up.

### Verification
1. Call deployed `customer-portal` with the user's session via curl to confirm a valid portal URL is returned.
2. Click "Manage plan" from Book Hub → lands on `/account-settings?tab=billing`, sidebar no longer mis-highlights Author Profile.
3. Click "Open Billing Portal" → Stripe portal opens in a new tab without error toast.
