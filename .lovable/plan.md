

# Sprint 28 Bug Fix Plan — 5 Bugs

## BUG-01: BP-02/BP-03 book detection fails

**Root cause**: `useAuthorBook` hook queries books correctly by `auth.users.id`, but there may be race conditions or the `or` filter with `owner_email` can interfere. Additionally, the builders have a separate `hasContext` check that falls back to querying books with `authorId` (which is `author_profiles.id`, not `auth.users.id`).

**Fix**:
- In `useAuthorBook.ts`: Simplify the query to just `.eq("author_id", authUserId)` (remove the `or` with `owner_email` which complicates things and is filtered by RLS anyway). Also check for `title` only (not description) as the gate.
- In both `BP02Builder.tsx` and `BP03Builder.tsx`: The Step 0 intro gate at line ~223 checks `!hasBook` from the hook. Also fix the builder's own fallback book query (lines 73-86 in both) — ensure it uses `profile?.user_id` (auth user id) consistently, not `authorId` (profile id) as fallback. If either `hasContext` or `hasBook` is true, allow generation.

**Files**: `src/hooks/useAuthorBook.ts`, `src/components/dashboard/builders/bp02/BP02Builder.tsx`, `src/components/dashboard/builders/bp03/BP03Builder.tsx`

---

## BUG-02 + BUG-03: Connect Settings redirects to PublishNow / 404

**Root cause**: `connect-settings` sidebar item triggers `onSectionChange("connect-settings")` which in `AuthorDashboard.tsx` redirects to `/account-settings?tab=connections`. There is no standalone `/connect-settings` route — the redirect goes to account settings.

**Fix**:
- Create `src/pages/ConnectSettings.tsx` with: Stripe connection status/button, message that email marketing is handled natively by ABBY, no GHL references.
- Register `/connect-settings` route in the router.
- Update `AuthorDashboard.tsx` to redirect `connect-settings` section to `/connect-settings` instead of `/account-settings?tab=connections`.
- Update `DashboardSidebar.tsx` subtitle from "Marketing Account" to something like "Integrations".

**Files**: New `src/pages/ConnectSettings.tsx`, router file, `src/pages/AuthorDashboard.tsx`, `src/components/dashboard/DashboardSidebar.tsx`

---

## BUG-04: Dashboard shows onboarding to returning users

**Root cause**: In `ABBYFrameworkDashboard.tsx`, the `hasPlan` state defaults to `false` and is only set to `true` after an async call to `abby-execute` with `action: "status"` succeeds. If the call fails, times out, or returns no plan, the onboarding screen shows. The component renders the onboarding (MeetAbbySection) at line 248 when `!hasPlan`.

**Fix**:
- Don't render the onboarding MeetAbbySection until the dashboard has fully loaded (use `hasBootstrapped` state which is already tracked). While loading, show a loading spinner.
- After loading, if `hasPlan` is true, show the progress dashboard (already works). If `hasPlan` is false but user has books AND author_context exists, still show a "plan in progress" state rather than the full onboarding.
- Add a direct check: query `generated_assets` or `author_nodes` to see if the user has completed any business plan work, as a fallback for when the edge function call fails.

**Files**: `src/components/dashboard/ABBYFrameworkDashboard.tsx`, `src/components/dashboard/framework-dashboard/MeetAbbySection.tsx`

---

## BUG-05: "Ask ABBY" disappears from sidebar

**Root cause**: In `DashboardSidebar.tsx` line 108, "Ask ABBY" is conditionally included: `...(hasAnalysis ? [{ id: "abby-coach" ... }] : [])`. When `hasAnalysis` is false or undefined, the item is excluded.

**Fix**: Remove the `hasAnalysis` conditional — always include "Ask ABBY" in `homeItems`. The coaching chat should be available regardless of analysis state.

**File**: `src/components/dashboard/DashboardSidebar.tsx` (line 108)

---

## Technical Details

| Bug | Files Changed | Complexity |
|-----|--------------|------------|
| BUG-01 | useAuthorBook.ts, BP02Builder.tsx, BP03Builder.tsx | Medium |
| BUG-02/03 | New ConnectSettings.tsx, router, AuthorDashboard.tsx, DashboardSidebar.tsx | Medium |
| BUG-04 | ABBYFrameworkDashboard.tsx | Low-Medium |
| BUG-05 | DashboardSidebar.tsx | Low |

No database migrations required. No new edge functions. No new dependencies.

