

## Plan: Make `get-author-book` the Primary Source, Read `author_context` Server-Side

### Root cause confirmation (verified against the live DB)

The user's diagnosis is correct. I queried both projects directly:

| Row | Project | author_id |
|---|---|---|
| `author_profiles` for Pauline (`user_id = ef23c521-…`) | **project-local `tubpbslfrxyfhldkcyyq`** | id = `92326a2f-…` |
| `author_context` row (`book_title = "Be SUCKcessful"`) | **project-local `tubpbslfrxyfhldkcyyq`** | author_id = `92326a2f-…` |
| Both rows in shared backend `wuftdpnekscrsghqtssd` | not present | — |

Meanwhile `useAuth().user` comes from the **shared backend** (where the auth session lives). The previous "fix" pointed `useBookContext` queries at the shared backend, where neither row exists, so `author_profiles` returned null and the function exited at `if (!authorId) return` before ever touching `author_context`.

### Fix (clean approach — edge function as primary)

The `get-author-book` edge function already runs in project-local with service role and dual-token reconciliation. The only thing missing is that it doesn't read `author_context.book_title`. We add that, then use the edge function as the primary (and effectively only) lookup from the hook.

**1. `supabase/functions/get-author-book/index.ts`**
After resolving `userId` → `authorIds` (the existing block), read `author_context` first:

- `SELECT book_title FROM author_context WHERE author_id IN (idList) ORDER BY created_at DESC LIMIT 1`
- If a non-empty `book_title` is returned, prefer it over `books.title`
- Return shape extended with `bookTitle` (the resolved curated title) alongside the existing `book` payload, so the hook has both
- Keep all existing `books` resolution logic intact (still needed for cover, genre, description, bookId)

**2. `src/hooks/useBookContext.ts`**
Strip the direct table queries. The hook becomes a thin wrapper around the edge function:

- Remove `import { supabase } from "@/lib/shared-backend"`
- Remove the `author_profiles` lookup block, the direct `author_context` query, and the direct `books` query
- Keep `useAuth()` for `user.id` (used only for `enabled` + `queryKey`)
- `queryFn` calls `get-author-book` via `getActiveToken()` + `fetchWithTimeout()` (already present as the fallback path; promote it to be the only path)
- Map the response: `bookTitle` → primary, `book.title` → fallback, `"your book"` → final fallback
- `hasContext` becomes `!!response.bookTitle` (curated ABBY title present)
- Bump `HOOK_VERSION` to `v3.4-2026-04-20-edge-primary` and `queryKey` to `["book-context-v3.4", user?.id ?? "anon"]` to invalidate the cached empty `v3.3` results

**3. Memory update**
Update `mem://architecture/book-ownership-lookup-standard.md` to make explicit that the edge function also resolves `author_context.book_title` (it already states "must route through `get-author-book`"; we add the curated-title responsibility).

### Why this is correct and safe

- The edge function runs with `SUPABASE_URL` = project-local, where both `author_profiles` and `author_context` actually live → query will succeed
- Service role bypasses RLS → no client-session-vs-data-location mismatch is possible going forward
- Dual-token reconciliation already handles the shared-backend session → project-local user mapping
- Matches existing platform memory rule: "Book Ownership Lookup must route through `get-author-book`. Never query the `books` table directly from the browser"
- Eliminates the entire class of "wrong client" bugs for this lookup

### Pass/fail verification

After Publish + hard refresh on `/node-builder/BA-10`:

1. Network: single call to `…/functions/v1/get-author-book`
2. Edge function logs: `[get-author-book] author_context resolved: Be SUCKcessful`
3. Response JSON: `{ bookTitle: "Be SUCKcessful", book: {…}, … }`
4. Console: `[useBookContext] resolved title: Be SUCKcessful`
5. ABBY intro on BA-10, BA-12, BP-06, BP-07 reads `based on "Be SUCKcessful"`
6. No direct `author_context` or `author_profiles` requests from the browser

### Out of scope

- Consolidating the two Supabase clients (separate architectural cleanup)
- Changing `useAuthorBook`, `useAuthReady`, or other consumers
- RLS, schema, or onboarding changes
- Migrating data between the two projects

### What only the user can do

- Click **Publish → Update** (frontend bundle + edge function deploy)
- Sign back in
- Hard refresh and confirm the four builders show "Be SUCKcessful"

