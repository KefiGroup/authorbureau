## Goal
Make the dashboard stop showing the old empty/no-books state for authors who still have uploaded books.

## What I’ll change
1. **Unify book ownership resolution in backend functions**
   - Update `list-my-books`, `dashboard-state`, and `author-stats` to resolve the caller to the correct `author_profiles.id` before querying `books.author_id`.
   - Keep the existing fallback matches by `owner_email` (and only where still needed) so legacy books remain visible.
   - Ensure all three endpoints use the same identity rules so `bookCount`, `myBooks`, and sidebar counts cannot disagree.

2. **Fix dashboard empty-state logic**
   - Update `ABBYFrameworkDashboard` so it does not render the “Meet Abby / old dashboard” fallback when any trusted book signal already exists.
   - Prefer the canonical books list from `useMyBooks`, and only show the true zero-books onboarding state after the book query has positively resolved empty.
   - Prevent first-render timing issues from briefly locking the screen into the empty state.

3. **Harden client-side cache/state behavior**
   - Review `useMyBooks` and route-level dashboard state so auth lock delays or slow shared-session restoration do not cause a false zero-books render.
   - Make the book-present signal consistent between `/dashboard` and the home/dashboard shell.

4. **Validate with live signals**
   - Check the relevant network responses and edge function behavior for `list-my-books`, `dashboard-state`, and `author-stats`.
   - Confirm the remaining book appears and the old fallback panel no longer renders for this account.

## Files likely involved
- `supabase/functions/list-my-books/index.ts`
- `supabase/functions/dashboard-state/index.ts`
- `supabase/functions/author-stats/index.ts`
- `src/components/dashboard/ABBYFrameworkDashboard.tsx`
- `src/hooks/useMyBooks.ts`
- possibly `src/pages/AuthorDashboard.tsx` if route-level gating still uses stale counts

## Expected result
- If an author still owns at least one book, the dashboard shows that book and the normal dashboard state.
- Deleting one book in admin no longer makes the remaining books disappear from the dashboard.
- Sidebar counts, dashboard state, and book picker stay in sync.