

## Problem

The sidebar shows "0 built" next to Brand Products because the count only checks product tables (`workbooks`, `courses`, `email_flows`, etc.) but does not check `author_nodes` (where BP-01 through BP-05 nodes like Website, Lead Magnets, Email Marketing are tracked) or other indicators of completed work (like having an `author_slug` set for the website).

Currently, `author_nodes` is empty for this user, meaning none of the builders are writing completion status there. The only product table with data is `workbooks` (1 draft row), which doesn't increment the count because the sidebar only totals rows from specific tables.

Additionally, the edge function `deploy-bp02-to-ghl` writes to `author_nodes`, but the website builder (BP-04) and other builders may not be persisting their status there either.

## Root Cause Chain

1. **`author-stats` edge function** (line 135-160): Only queries 8 product tables. Does not query `author_nodes` at all.
2. **`AuthorDashboard.tsx`** (line 527-532): `buildUnlocked` sums from `stats.products.perTable[...]` — only product tables, no `author_nodes`.
3. **Builders not writing to `author_nodes`**: The website builder and other BP builders may not be persisting their completion status, leaving the table empty.

## Plan

### 1. Update `author-stats` edge function to count `author_nodes`

Add a query for `author_nodes` where `status` is `content_ready`, `live`, or `published_pending_ghl`. Map each `node_id` prefix (BP-01 through BP-09) to the Brand count, BA-10 through BA-18 to Build Authority, and YR-19 through YR-28 to Yield Revenue. Return these counts as new fields: `nodesBuilt.brand`, `nodesBuilt.buildAuthority`, `nodesBuilt.yield`.

Also count the website as "built" if the author has an `author_slug` set (since BP-04 completion is indicated by that).

### 2. Update `useAuthorStats` types

Add the `nodesBuilt` shape to `AuthorStats` so the dashboard can consume it.

### 3. Update `AuthorDashboard.tsx` sidebar props

Change `buildUnlocked` to sum both `stats.products.perTable[...].total` (product tables) AND `stats.nodesBuilt.brand` (author_nodes + website slug). Same for `buildAuthorityUnlocked` and `yieldUnlocked`.

### 4. Deduplicate counts

Ensure nodes that map to the same product table aren't double-counted (e.g., if BP-06 Workbook exists in both `workbooks` table and `author_nodes`, count it once).

### Technical details

Files to update:
- `supabase/functions/author-stats/index.ts` — add `author_nodes` query and `author_slug` check
- `src/hooks/useAuthorStats.ts` — extend `AuthorStats` interface
- `src/pages/AuthorDashboard.tsx` — update `buildUnlocked` / `buildAuthorityUnlocked` / `yieldUnlocked` calculations

No database migration needed. No other functionality changes.

