## Bug 2 — "My Funnels" stage cards show "Not set" despite overrides existing

**Root cause:** `FunnelsHub.tsx` loads stage overrides via `loadOverrides()` in `src/lib/funnel-overrides.ts`, which calls `supabase.from("funnel_stage_overrides")…` directly from the browser. The project's Cloud PostgREST rejects the shared-backend JWT for owner-side queries on this table (same root issue documented for `funnels` — that's why `funnels-api.ts` exists). Reads silently return `[]`, so `getStagesForArchetype` sees no overrides and every stage renders as `missing` ("Not set"). The data IS in the DB (BP-02: 4 rows, BP-06: 2 rows) — only the read path is wrong.

**Fix:**
1. Add a new action `list_overrides` to the existing `supabase/functions/funnels-manage/index.ts` edge function. Body: `{ funnel_ids: string[] }`. Verifies the caller owns each funnel (same author-id resolver the function already uses), then returns `{ overrides_by_funnel: { [funnel_id]: OverrideRow[] } }` using the service-role client.
2. Add `listOverridesBulk(funnelIds: string[])` to `src/lib/funnels-api.ts` mirroring the existing helpers.
3. In `src/components/dashboard/FunnelsHub.tsx`, replace the per-funnel `loadOverrides()` loop (around lines 182–195) with a single `listOverridesBulk(funnels.map(f => f.id))` call. Map the result into `overridesByFunnel` exactly as before. Remove the `loadOverrides` import.
4. Leave `src/lib/funnel-overrides.ts` in place for `StageEditorDrawer` (which is already inside an authorized writer context using `saveStageOverrideViaFn`); but update the editor to also read overrides via `getFunnel(funnelId)` if it currently reads via the direct client. (Quick check shows `StageEditorDrawer` already gets overrides passed in as props from the hub, so no further change needed there.)

No schema change. No DB migration.

## BP-03 builder ignores `?bookId=` URL parameter

**Root cause:** Two issues compound:

1. **Nav links drop the bookId.** Several entry points navigate to BP-03 without a query string:
   - `src/components/dashboard/MarketingHub.tsx` line ~350: `navigate("/node-builder/BP-03")`
   - `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx` lines 545 and 568: same.
   When `?bookId=` is missing, `BP03Builder` falls back to `useAuthorBook()` which returns the author's most recently created book — exactly the reported behavior.

2. **One internal poll in `BP03Builder.tsx` is not book-scoped.** Around lines 305–311 the progress poll queries `author_nodes` filtered only by `author_id` + `node_id` with `.maybeSingle()`. Under per-book scoping (Sprint 8) an author can have multiple BP-03 rows (one per book); this poll can read the wrong row's `content_json.progress` and confuse state, even when `activeBookId` is correct.

**Fix:**
1. In `MarketingHub.tsx` and `SocialCalendarTab.tsx`, change every `navigate("/node-builder/BP-03")` to include the active book: `navigate(\`/node-builder/BP-03${activeBookId ? \`?bookId=\${activeBookId}\` : ""}\`)`. (`MarketingHub` already has a selected book context via the hub's `bookId`; `SocialCalendarTab` reads `bookId` from its parent — pass it through if not already in scope.)
2. In `src/components/dashboard/builders/bp03/BP03Builder.tsx`, change the progress poll (~lines 305–314) to add `.eq("book_id", activeBookId)` when `activeBookId` is set, otherwise `.is("book_id", null)` — mirroring the pattern already used by `upsertAuthorNode` / `snapshotAuthorNode` server-side.
3. Sweep the rest of `BP03Builder.tsx` for any other direct `from("author_nodes")…eq("node_id","BP-03")` reads and apply the same `book_id` filter (there's at least one in the activation/refresh path). Edge-function calls already pass `book_id: activeBookId` so they're fine.

No schema, no migration.

## Files touched
- `supabase/functions/funnels-manage/index.ts` — add `list_overrides` action
- `src/lib/funnels-api.ts` — add `listOverridesBulk`
- `src/components/dashboard/FunnelsHub.tsx` — switch override fetch to edge fn
- `src/components/dashboard/MarketingHub.tsx` — append `?bookId=` to BP-03 nav
- `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx` — append `?bookId=` to BP-03 nav
- `src/components/dashboard/builders/bp03/BP03Builder.tsx` — book-scope all direct `author_nodes` reads

## Verification
- DB confirms BP-02 has 4 override rows and BP-06 has 2 → after fix, those stages should render as "Ready" in My Funnels without any data change.
- Open BP-03 from Marketing Hub → URL should now contain `?bookId=…` and the builder should load that book's content (not the most recent book).
