
## Verify & Re-Deploy `get-author-book` Systemic Fix

### Investigation needed first
Before re-doing work, I need to confirm what's actually live vs. what's in the repo. The user reports the browser is still hitting `books?select=title&author_id=eq.ef23c521-...` directly, which means either:
- The hook file was reverted / never saved
- The edge function was never deployed
- The migration never ran
- OR the browser is hitting a stale bundle and a hard reload would fix it

### Verification steps (read-only, before deploy)
1. `code--view src/hooks/useAuthorBook.ts` — confirm it calls `get-author-book` edge function (not `supabase.from("books")`)
2. `code--view supabase/functions/get-author-book/index.ts` — confirm file exists with service-role + dual-token logic
3. `supabase--read_query` on `pg_proc` / migrations table — confirm `owner_email` backfill ran (count books where `owner_email IS NULL` should be 0 or near it)
4. `supabase--curl_edge_functions` GET `/get-author-book` with Pauline's session — confirm function responds with her book
5. `code--search_files` for any remaining direct `from("books")` ownership queries that bypass the hook

### Then act based on findings

**Case A — Files in repo are correct, but bundle is stale**
The frontend hook change requires a publish to go live (frontend changes do NOT auto-deploy, only edge functions do). Tell the user to click **Publish → Update** to push the new bundle. No code changes needed.

**Case B — Hook file was reverted**
Re-write `src/hooks/useAuthorBook.ts` to use `getActiveToken()` + `fetchWithTimeout()` against `${SUPABASE_URL}/functions/v1/get-author-book`. Same shape as the version from the previous deploy.

**Case C — Edge function missing**
Re-create `supabase/functions/get-author-book/index.ts` with service-role + dual-token + owner_email fallback, then call `supabase--deploy_edge_functions` for `["get-author-book"]`.

**Case D — Migration never ran**
Create a new migration that backfills `books.owner_email` from `auth.users.email` where null.

**Case E — Other components still query `books` directly for ownership**
List those components, then either route them through the hook or through the same edge function. (Most likely culprits: `BA10Builder`, `BA12Builder`, `BookProfileGate`, dashboard tiles.)

### Verification after deploy
- Hard refresh as `pl@paulineteo.com` → DevTools Network tab shows POST to `/functions/v1/get-author-book` and NO direct `rest/v1/books?author_id=eq...` ownership query
- BA-10 ABBY intro: "Let's build your Online Course based on 'Be SUCKcessful'", no gate
- BA-12 same, no gate
- Edge function logs show `[get-author-book] resolved book: <id> Be SUCKcessful`

### Deliverable
A short report back to the user: which of the three components were live, which were missing, what was redeployed, and confirmation the network trace now shows the new path.
