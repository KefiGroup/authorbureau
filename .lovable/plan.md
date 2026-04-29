## Plan

### 1. Fix the real books API failure at the source
Update the `list-my-books` backend function so it no longer depends on auth verification that fails after a session refresh for this user.

What I’ll change:
- Replace the fragile `auth.getUser(token)` resolution path in `supabase/functions/list-my-books/index.ts` with the same resilient identity-resolution pattern already used in other working backend functions.
- Add a fallback chain that can resolve the signed-in author from:
  - cloud auth,
  - shared-backend auth,
  - decoded JWT claims (`sub`, `email`) when direct verification fails.
- Map shared-backend users back to the local author record by email when needed.
- Keep the existing tolerant ownership matching on `author_id` and `owner_email`, since Pauline’s books are present and correctly linked.
- Improve logging/response handling so auth-resolution failures return a clear error instead of a generic books failure.

Expected result:
- `My Books Hub` stops throwing “Could not load your books” after refresh.
- The existing books for `support@paulineteo.com` load consistently.

### 2. Remove the false “new author” dashboard state
Once the books endpoint is fixed, tighten the dashboard so it does not momentarily revert to “no books / no plan” for authenticated authors.

What I’ll change:
- In `src/hooks/useMyBooks.ts`, make the books hook preserve last-known data on transient auth/bootstrap failures instead of falling back to an empty list.
- In `src/components/dashboard/MyBooks.tsx`, reuse the same resilient token/bootstrap pattern so the main hub and sidebar are aligned.
- In `src/components/dashboard/ABBYFrameworkDashboard.tsx`, stop treating missing `list-my-books` data as `bookCount = 0` during bootstrap; keep prior values until the backend settles.
- In `src/pages/AuthorDashboard.tsx`, gate onboarding banners from real resolved state rather than temporary zero/default state.

Expected result:
- “Meet Abby” no longer shows just because the books call briefly failed.
- “Now let’s add your first book” no longer appears for existing authors.
- Navigation between dashboard sections won’t make the content area look like the account was reset.

### 3. Re-verify and finish the BA-11 / BA-13 / BA-14 / BA-15 follow-up items
After the auth/books fix is in place, verify the dependent nodes again and patch any remaining real issue.

What I’ll check and fix if needed:
- BA-11 Audiobook: confirm `get-book-manuscript` now resolves correctly from the working book context and no longer shows “No manuscript found”.
- BA-13 Group Coaching: confirm the false `Live` badge is suppressed by the effective-status logic once node data loads correctly.
- BA-14 Podcast Tour: confirm the live page resolves from its node/microsite data and does not 404.
- BA-15 Media Outreach: fix the remaining backend gap in `supabase/functions/deploy-ba15-to-ghl/index.ts`, which currently marks the node live without saving a `microsite_url`, then verify the live page works.

### 4. Validate the full author experience end-to-end
After implementation, I’ll verify the exact recovery flow for this author:
- refresh session,
- load dashboard,
- confirm books appear,
- confirm onboarding is hidden,
- open BA-11,
- confirm BA-14 and BA-15 live URLs,
- confirm BA-13 is not falsely marked live.

## Findings already confirmed
- The failing endpoint is `list-my-books`.
- Pauline’s books do exist in the database and are correctly linked to `support@paulineteo.com` and the expected author ID.
- The current auth token path is failing after refresh with backend auth verification errors (`bad_jwt` / unrecognized JWT kid), which explains why the books request still breaks even though the user is visibly signed in.
- The false onboarding state is a downstream effect of the books/auth bootstrap failure.
- BA-15 still has a concrete backend bug: its deploy function sets the node to `live` but does not persist a microsite URL, which can still produce a 404.

## Technical details
Files likely to change:
- `supabase/functions/list-my-books/index.ts`
- `src/hooks/useMyBooks.ts`
- `src/components/dashboard/MyBooks.tsx`
- `src/components/dashboard/ABBYFrameworkDashboard.tsx`
- `src/pages/AuthorDashboard.tsx`
- `supabase/functions/deploy-ba15-to-ghl/index.ts`

Implementation pattern:
- Reuse the already-working resilient identity resolution used by functions like `author-crm-data` / `check-subscription` instead of relying on a single `getUser(token)` path.
- Preserve last-known good dashboard/books state during auth restoration to avoid false empty-state UI.
- Keep BA-13’s effective-status safeguard in place and only trust `live` when required assets exist.
- Persist the missing BA-15 microsite metadata when the node is published live.