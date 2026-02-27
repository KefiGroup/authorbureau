

## Plan: Remove Marketing Access Gate from Authors Bureau Dashboard

### Problem
The `AuthorDashboard` page blocks authenticated users with a "Marketing Studio Access Required" wall when the shared backend's `platform-access` check doesn't return a `marketing` flag. Per project memory, marketing is intended as open Tier 1 for all authenticated users.

### Changes

#### 1. Simplify `usePlatformAccess` hook — treat marketing as always-granted for authenticated users
**File:** `src/hooks/usePlatformAccess.ts`
- Set `hasMarketing` to `true` for any authenticated user (not just admins)
- Remove the blocking `loading` state — set initial loading to `false` or resolve immediately
- Keep the background platform-access fetch for non-marketing entitlements (write/publish) but don't gate on it
- Keep `requestAccess` wiring in case it's needed for other platforms later

#### 2. Remove the "Marketing Studio Access Required" wall from `AuthorDashboard`
**File:** `src/pages/AuthorDashboard.tsx`
- Remove the `usePlatformAccess` import and hook call
- Remove the `accessLoading` check from the loading spinner guard
- Remove the entire `if (!hasMarketing) { ... }` block (lines 54-87) that renders the access-denied wall
- Keep the `if (!user) return <Navigate to="/auth" replace />` redirect (this becomes the sole gate)

#### 3. SSO error handling — already correct
The `/sso` page already redirects failures to `/auth` (sign-in) via "Sign In with Email" links, never to an access-denied page. No changes needed.

#### 4. Source platform tagging — already correct
All backend calls in `usePlatformAccess`, `SSO`, and `admin-api` already include `source_platform: "authorsbureau"`. No changes needed.

### Result
- Signed-out users landing on `/dashboard` → redirected to `/auth`
- Signed-in users → dashboard loads immediately (no platform-access network call blocking render)
- SSO handoff → works as before, lands on dashboard
- Premium gates for courses/speaking/coaching/AI toolkit remain unchanged

