# Permanently fix the two recurring bugs

## Bug 1 — Counter discrepancy (Dashboard 5/28 vs Book Hub 4/28)

**Real root cause:** Dashboard and Book Hub count from *different data sources*. `author-stats` counts product-table rows (`coaching_packages`, `email_flows`, etc.) AND `author_nodes`. `useBookNodeProgress` only reads `author_nodes`. A YR-19 row in `coaching_packages` with no matching `author_nodes` row is counted by Dashboard, ignored by Book Hub.

### Fix
1. Make `useBookNodeProgress` call the same `author-stats` edge function the Dashboard uses, then read `perBook[bookId].nodeIds` and reconcile against `ABBY_CATEGORIES`. This guarantees identical numbers in all three places (Book Hub headers, Dashboard card, MultiBookPicker).
2. Keep the existing `author_nodes` query as a fallback only for when `author-stats` is unreachable.
3. Add a Vitest assertion that the two counters return identical totals for a fixture author.

### Files
- `src/hooks/useBookNodeProgress.ts` — switch primary source to `author-stats` perBook output
- `src/lib/__tests__/counter-parity.test.ts` *(new)* — parity test

---

## Bug 2 — "ABBY hit a snag" on Split Manuscript (BA-11)

**Real root cause:** `supabase/functions/get-manuscript-source/index.ts` has a custom `resolveUser()` that fails for current shared-backend tokens. Logs show `missing sub claim` (local) and `Invalid API key` (shared), so the function returns `{success:false, error:"Unauthorized"}` before any AI call. Frontend masks this as a generic ABBY error.

### Fix
1. Replace the custom `resolveUser()` in `get-manuscript-source` with the standard dual-token resolver used by `get-author-book` (book-ownership-lookup-standard memory). That resolver already handles project-local + shared-backend + `owner_email` fallback correctly.
2. Improve the frontend error path in `ManuscriptOptimizationStep.tsx` so an `Unauthorized` or `No manuscript found` response surfaces a *specific* message ("Re-link your account" / "Upload manuscript in Library"), not a generic ABBY snag.
3. Add a one-line audit test against `get-manuscript-source` using `supabase--curl_edge_functions` after deploy to confirm a real session token resolves.

### Files
- `supabase/functions/get-manuscript-source/index.ts` — adopt shared resolver
- `src/components/dashboard/builders/audiobook/ManuscriptOptimizationStep.tsx` — specific error mapping
- `src/lib/abby-error.ts` — pass through known specific error strings instead of collapsing to the generic message

---

## Architectural guardrail (so these stop recurring)

Add a documented + enforced rule:

1. **Counters:** any new code that wants to display an X/28 number MUST consume `author-stats.perBook` — never query `author_nodes` directly for counting. Add a lint comment block at the top of `useBookNodeProgress.ts` and `author-stats/index.ts`.
2. **Edge-function auth:** any edge function that needs to identify the calling user MUST use the shared dual-token resolver pattern (project-local → shared-backend → `owner_email`), not a custom `resolveUser`. Extract the resolver from `get-author-book` into `supabase/functions/_shared/resolve-user.ts` and refactor `get-manuscript-source` to import it. Future functions just import the shared helper.
3. Update `mem://architecture/shared-backend-token-standard` with: "All edge functions resolving a user MUST import `_shared/resolve-user.ts`. Custom inline resolvers are forbidden."

### Files
- `supabase/functions/_shared/resolve-user.ts` *(new — extracted)*
- `supabase/functions/get-manuscript-source/index.ts` — use shared
- Memory update via `code--write mem://...`

---

## Validation
1. Hit Split Manuscript on Be SUCKcessful → either succeeds or shows a specific "Upload manuscript" / "Re-link account" message (no more generic ABBY snag).
2. Dashboard and Book Hub both show **the same** X/28 for every book (5/28 currently expected).
3. Parity test passes in CI.
4. Edge logs for `get-manuscript-source` show successful user resolution.

## Out of scope
- BP-09 slide regeneration UX (already shipped last sprint)
- BA-11 Voice / Production / Distribute audit (blocked until Manuscript step passes; will follow in next sprint)
