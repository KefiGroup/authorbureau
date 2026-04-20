
## AC-A3 Fix — Resolve Book Title for `author_nodes` Products

### Root Cause
1. In `builder-draft-state/index.ts` line 303, `author_nodes` rows are pushed into `allDrafts` **without an `author_id` field**. The author-primary-book fallback at line 348 keys off `d.author_id`, which is `undefined` for these rows, so it never fires.
2. In `ReviewProductsPage.tsx` line 152, the client still wraps the result with `item.bookTitle || "Unknown Book"`, overriding the empty-string fallback agreed in the previous patch.

### Fix (2 files, surgical)

**1. `supabase/functions/builder-draft-state/index.ts` (line 303-315)**  
Add `author_id: n.author_id` to the pushed object so the existing `authorPrimaryBook[d.author_id]` fallback resolves the title from `books` via the author profile id.

```ts
allDrafts.push({
  id: n.id,
  title: n.personalised_name || n.node_name || n.node_id,
  book_id: null,
  author_id: n.author_id,   // ← ADD THIS LINE
  created_at: n.created_at,
  ...
});
```

No other changes to the function. Redeploy.

**2. `src/components/dashboard/ReviewProductsPage.tsx` (line 152)**  
Change `bookTitle: item.bookTitle || "Unknown Book"` → `bookTitle: item.bookTitle || ""`. The display layer that consumes `bookTitle` will simply render nothing when empty (cleaner than "Unknown Book").

### Verification
- `/dashboard?section=review-products` for Pauline → all 4 author_nodes products show "Be SUCKcessful".
- Authors without any book → blank label (no "Unknown Book" string).
- No other product types affected.
