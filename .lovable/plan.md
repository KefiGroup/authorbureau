
## Plan: Use Shared-Backend Client for Book Context Queries

### Root cause (definitive, verified against the live DB)

I verified directly against the project DB:
- The `author_context` row exists: `author_id = 92326a2f-...`, `book_title = "Be SUCKcessful"`
- `author_profiles` resolves correctly: `user_id ef23c521-... → id 92326a2f-...`
- The hook code already does the user_id → author_profiles.id → author_context lookup correctly

The actual bug is a **client mismatch**, not a missing lookup:

| Query in `useBookContext` | Client used | Session it sees |
|---|---|---|
| `useAuth()` | shared-backend (`@/lib/shared-backend`) | Pauline ✅ |
| `supabase.from("author_profiles")` | project-local (`@/integrations/supabase/client`) | none (anon) — works only because there's an anon SELECT policy for `directory_status IN ('listed','featured','verified')` |
| `supabase.from("author_context")` | project-local | none (anon) — **RLS blocks the row** because the only policy is `authenticated` + `auth.uid() = author_profiles.user_id` |
| `supabase.from("books")` | project-local | none (anon) — only sees rows where `published_at IS NOT NULL` |

So the `author_context` query is firing, hitting the right `author_id`, and silently returning `null` because RLS hides it from `anon`. That's why `ctx` is empty and the title falls back to `"your book"`.

### The fix

Switch the three table queries inside `fetchBookContext` to use the **shared-backend** client (the one that holds the user's session), the same one `useAuth` uses. The DB schema is identical between the two project clients here — `author_profiles`, `author_context`, and `books` live in the shared backend, which is the actual source of truth (this matches the rest of the app: `author_profiles`, `author_nodes`, profile loads etc. all call the shared backend successfully).

**File:** `src/hooks/useBookContext.ts`

1. Replace the import:
   - Remove: `import { supabase } from "@/integrations/supabase/client";`
   - Add: `import { supabase } from "@/lib/shared-backend";`

2. No other code changes needed inside `fetchBookContext`:
   - The existing `author_profiles` → `author_context` → `books` → edge fallback chain is correct
   - The user_id → author_profiles.id resolution is already in place (lines 46–52)
   - The `author_id` filter on `author_context` is already correct (line 73)
   - The console logs and `v3.2` cache-bypass settings stay as-is

3. Bump `HOOK_VERSION` to `v3.3-2026-04-20-shared-client` and update `queryKey` to `["book-context-v3.3", user?.id ?? "anon"]` so any cached `v3.2` empty-result entry is invalidated on first mount of the new bundle.

### Why this is the right fix (and not "fetch via edge function")

- The shared-backend client has Pauline's authenticated session, so RLS will resolve `auth.uid() = ef23c521-...`, match `author_profiles.user_id`, and return the `author_context` row legitimately.
- This matches the pattern already used everywhere else in the signed-in UI (profile, nodes, subscription) — `useBookContext` was the outlier.
- No RLS changes, no edge function changes, no schema changes.

### Pass/fail verification

After Publish → Update + hard refresh on `/node-builder/BA-10`:

1. Console: `[useBookContext] queryFn START for user: ef23c521-...`
2. Network: request to `wuftdpnekscrsghqtssd.supabase.co/rest/v1/author_profiles?user_id=eq.ef23c521-...` returns the row with `id=92326a2f-...`
3. Network: request to `wuftdpnekscrsghqtssd.supabase.co/rest/v1/author_context?author_id=eq.92326a2f-...` returns `[{ book_title: "Be SUCKcessful" }]`
4. Console: `[useBookContext] resolved title from author_context: Be SUCKcessful`
5. ABBY intro on BA-10, BA-12, BP-06, BP-07 reads `based on "Be SUCKcessful"`

### Out of scope
- Consolidating the two Supabase clients (tracked separately)
- RLS, schema, or edge function changes
- `useAuthorBook` or `useAuthReady`

### What only the user can do
- Click **Publish → Update**
- Sign back in (currently on `/auth`)
- Hard refresh and confirm the title and network trace

<lov-actions>
<lov-suggestion message="After publishing, verify the four builders (BA-10, BA-12, BP-06, BP-07) show 'Be SUCKcessful' and the network trace shows author_context against the shared backend.">Verify it works end-to-end</lov-suggestion>
<lov-suggestion message="Audit every hook in src/hooks that imports from @/integrations/supabase/client and decide which should switch to @/lib/shared-backend, so we don't keep hitting this client-mismatch class of bug.">Audit all hooks for client mismatch</lov-suggestion>
<lov-suggestion message="Add a single unified useSupabase() helper that returns the shared-backend client by default, and update lint rules to flag direct imports of @/integrations/supabase/client from feature code.">Unify Supabase client usage</lov-suggestion>
</lov-actions>
