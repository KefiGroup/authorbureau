# Plan: BP-06 Back Navigation + BP-05 Live Badge

## Investigation summary

After reading the current code, both reported bugs appear to **already be fixed** by the prior sprint. This plan confirms the current state and proposes only the small remaining cleanups needed to make the behaviour bullet-proof.

### Bug 1 — BP-06 "Go back to Brand Products"

What I found:
- `/dashboard?section=workbooks` does **not** render `WorkbooksManager`. It performs `<Navigate to={\`/node-builder/BP-06${location.search}\`} replace />` (AuthorDashboard.tsx line 446), preserving `?bookId=...`.
- `NodeBuilder.tsx` reads `bookId` from search params and renders the page-level back link via `getHubPath()` → `/book-hub/{bookId}?tab=revenue-streams` with label **"Back to Book Hub · Brand"** (lines 39–60, 146–154).
- `BuilderHeader.onBack` is marked `@deprecated` — the visible back link is the one in `NodeBuilder`, not the builder.
- `BP06Builder.tsx` line 189 already passes the correct `onBack={() => navigate(bookId ? \`/book-hub/${bookId}?tab=revenue-streams\` : "/dashboard?section=my-books")}` — identical to BP-07/08/09.
- Searched the entire codebase for the literal string "Back to Brand Products". Only one match remains: `src/pages/NodeBuilder.tsx` line 171, inside the **fallback "Coming Soon" branch** that renders only when a nodeId is not in the builders map. BP-06 is in the map, so this branch never runs for it — but the legacy `/brand-products` link still exists and should be removed.

Conclusion: the live BP-06 back button already works. The only remaining trace of "Back to Brand Products" is the dead fallback link.

### Bug 2 — BP-05 false "Live" badge

What I found:
- `src/hooks/useBookNodeProgress.ts` lines 101–116 already implements the content-existence check:
  ```ts
  const hasContent = n.content_json && typeof n.content_json === "object" && Object.keys(n.content_json).length > 0;
  const isLiveStatus = n.status === "live" || n.status === "published_pending_ghl";
  if (isLiveStatus && hasContent) map[n.node_id] = "completed";
  else if (n.status === "content_ready" || n.status === "draft" || (isLiveStatus && !hasContent))
    if (map[n.node_id] !== "completed") map[n.node_id] = "in-progress";
  ```
- This check is applied to **all nodes**, not just BP-05, so the rule is consistent.

Conclusion: the false "Live" badge logic is already corrected. A node marked `live` with empty `content_json` will now resolve to "in-progress" → renders as **"Building"** (or "Ready to Build" if no row exists at all).

If BP-05 still shows "Live" in the user's view, the most likely cause is a stale `author_nodes` row where `content_json` actually has fields but the builder UI is empty (different shape). Audit one row before changing logic again.

## Proposed changes

Small, low-risk cleanups:

### 1. `src/pages/NodeBuilder.tsx` (lines 160–175)

Replace the legacy "Coming Soon" fallback so it no longer references `/brand-products`:

```text
- Change button text "Back to Brand Products" → "Back to Dashboard"
- Change navigate target "/brand-products" → "/dashboard"
```

This removes the last trace of the legacy phrase and matches `getHubPath`'s no-book fallback.

### 2. Audit task — confirm BP-05 `author_nodes` row

Read one BP-05 row for the affected author via `supabase--read_query`:

```sql
select node_id, status, content_json from author_nodes
where node_id = 'BP-05' and author_id = '<id>';
```

- If `content_json IS NULL` or `'{}'` and status is `live` → the hook fix already handles it; no code change. The user may just need a hard refresh.
- If `content_json` has keys but the BP-05 builder still appears empty → the bug is in BP-05 builder's content loader, not the badge logic. Open a separate ticket; do not touch the hook.

### 3. (Optional) Delete dead code

`src/components/dashboard/WorkbooksManager.tsx` is imported in `AuthorDashboard.tsx` (line 16) but never rendered — the `workbooks` case immediately `<Navigate>`s away. Safe to remove the import to avoid future confusion. Leave the file itself in place for now (other refs may exist via dynamic paths).

## Files touched

- `src/pages/NodeBuilder.tsx` — replace legacy fallback link (1 small edit)
- `src/pages/AuthorDashboard.tsx` — remove unused `WorkbooksManager` import (1 line)
- No changes to `useBookNodeProgress.ts` (already correct)
- No changes to BP-06/07/08/09 builders (already correct)

## Verification steps after build

1. Visit `/dashboard?section=workbooks&bookId=<id>` → confirm redirect lands on `/node-builder/BP-06?bookId=<id>`.
2. Confirm top-of-page back link reads **"Back to Book Hub · Brand"** and navigates to `/book-hub/<id>?tab=revenue-streams`.
3. On Brand tab, confirm BP-05 Webinars card shows **"Ready to Build"** (or "Building") when `content_json` is empty, and **"Live"** only when populated.
