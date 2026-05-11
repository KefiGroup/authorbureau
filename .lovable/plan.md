## Goal
Keep admins on the same `/admin?tab=...` view after a browser refresh instead of falling back to Overview.

## Plan
1. Update `AdminDashboard` to preserve the current admin URL when it sends a user to admin sign-in.
   - Read the current route with `useLocation()`.
   - Change the unauthenticated redirect from plain `/admin-auth` to `/admin-auth?redirect=<current admin path + search>`.

2. Update `AdminAuth` to honor that redirect after auth succeeds.
   - Read the `redirect` query param.
   - Use it for all successful admin-return paths:
     - existing admin session redirect
     - OTP verification success
     - magic-link success
   - Keep `/admin` as the fallback when no redirect is provided.

3. Validate the affected flows.
   - Reload `/admin?tab=daily-audit` and confirm it stays on Daily Audit.
   - Reload at least one other admin tab to confirm the fix works across the tab system.
   - Confirm normal admin sign-in still lands on `/admin` when no redirect is present.

## Technical details
- Files expected:
  - `src/pages/AdminDashboard.tsx`
  - `src/pages/AdminAuth.tsx`
- Root cause:
  - On refresh, the app can briefly bounce through `/admin-auth`.
  - `AdminAuth` currently redirects successful admin sessions to plain `/admin`, which drops `?tab=...` and defaults back to Overview.
- Scope:
  - Frontend routing only.
  - No backend, audit, or tab business-logic changes.