## Goal
Make the dashboard reliably show the remaining book for this account after refresh/sign-out/sign-in, including in Safari.

## What I’ll change
1. **Unify identity resolution in dashboard endpoints**
   - Refactor `list-my-books`, `dashboard-state`, and `author-stats` to use the shared canonical resolver instead of three slightly different auth flows.
   - Keep the book-ownership fix already identified (`author_profiles.id` vs auth user id), but remove divergence between endpoints so they cannot disagree on who the current author is.

2. **Fix the Safari session/token path on the client**
   - Harden `getActiveToken`, shared session restore, and the dashboard boot flow so Safari refreshes cannot leave the app in a state where `useAuth` thinks the user is signed in but book fetches still send no token or a stale token.
   - Ensure the dashboard waits for the auth state that actually matters before deciding there are zero books.

3. **Stop false empty-state rendering**
   - Tighten `ABBYFrameworkDashboard` so it only shows the zero-book onboarding state after a positive, trusted empty result.
   - Prevent a transient failed/empty `list-my-books` response from overwriting known-good book state.

4. **Validate against live signals**
   - Inspect the actual edge-function responses and logs for `list-my-books`, `dashboard-state`, and `author-stats` for this exact failure path.
   - Confirm that Safari-style refresh/sign-in behavior still returns the surviving book and that the old empty dashboard does not reappear.

## Files likely involved
- `supabase/functions/list-my-books/index.ts`
- `supabase/functions/dashboard-state/index.ts`
- `supabase/functions/author-stats/index.ts`
- `supabase/functions/_shared/resolve-user.ts`
- `src/lib/get-active-token.ts`
- `src/lib/shared-backend.ts`
- `src/hooks/useAuth.tsx`
- `src/components/dashboard/ABBYFrameworkDashboard.tsx`

## What I believe the problem is
The earlier fix addressed **book ownership resolution**, but Safari likely exposes a **second bug**: the client and edge functions still use different session-resolution paths. That means the dashboard can authenticate enough to render, while `list-my-books` still receives no usable token or resolves the wrong identity during refresh/sign-in timing. When that happens, the dashboard falls back to the zero-book state even though the remaining book still exists.

## Technical details
- Replace ad-hoc endpoint auth parsing with the shared resolver pattern.
- Prefer one canonical author identity for every `author_id` query.
- Make dashboard boot conditional on trusted auth readiness, not just first render completion.
- Preserve last-known-good books until a successful request positively proves the list is empty.
- Add or extend regression coverage around the recurring `author_id` mismatch and Safari-style session restore timing.