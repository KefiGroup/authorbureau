
Do I know what the issue is? Yes.

## What I verified
- Pauline’s BP-03 row does exist in the database.
- That row currently has `status = 'content_ready'` and `content_json.posts.length = 5`.
- The `author_nodes` RLS policy for “authors can manage own nodes” is still present.
- The Sprint 36b `social_connections` / `social_posts` policies are separate and are not what BP-03 reads on mount.
- I found no database log evidence of an RLS exception on `author_nodes`.

## Actual root cause
This does not look like a broken `author_nodes` policy.

The real issue is a session-timing mismatch:
- `NodeBuilder` gets the signed-in user from the shared auth flow.
- `BP03Builder` queries `author_nodes` using the project-local database client.
- On a fresh page load, BP-03 can mount before the project-local auth session is restored.
- When that happens:
  - `author_profiles` may still load because Pauline’s profile is public/listed
  - `books` may still load because the book is published
  - but `author_nodes` is private, so the query returns no row yet
- Result: BP-03 silently falls back to Step 1 even though saved posts exist.

That matches the screenshot: Intro screen with saved data still in the backend.

## Fix plan
### 1) Fix BP-03 to wait for auth restoration before querying saved node state
Update `src/components/dashboard/builders/bp03/BP03Builder.tsx` to use the existing `useAuthReady()` pattern before running the mount resume query.

Implementation:
- import `useAuthReady`
- gate the mount `useEffect` with `isAuthReady`
- keep the loading shield visible until auth is ready and the resume query finishes

### 2) Keep `content_json.posts` as the source of truth for resume
After auth is ready, run the mount query and use this exact mapping:
- if `content_json.posts.length > 0` → hydrate content and `setStep(3)` (user-visible Step 4)
- else if `status === 'generating'` → `setStep(1)`
- else → `setStep(0)`

### 3) Make mount failures silent
Keep mount-query error handling quiet:
- log errors with `console.error`
- fall back to Step 1
- do not show the “ABBY hit a snag” banner from the mount path

### 4) Small safety cleanup in the same file
In the mount path only:
- switch profile lookup from `.single()` to `.maybeSingle()` where appropriate
- make sure `setError` is only used for generation/save/activate failures, not resume failures

## RLS decision
No RLS rollback is currently justified.
From what I inspected, `author_nodes` access rules are still correct. Loosening RLS would mask the real bug and weaken security. The fix should be in BP-03 auth-ready resume timing, not in database policy changes.

## File to change
- `src/components/dashboard/builders/bp03/BP03Builder.tsx`

## Validation after implementation
1. Hard refresh BP-03 while signed in
2. Confirm Pauline lands on Step 4, not Introduction
3. Navigate away and back
4. Confirm it still lands on Step 4
5. Confirm no “ABBY hit a snag” banner appears on mount fallback
6. Confirm true generation failures still show the banner normally
