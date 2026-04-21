

## Status: Already Fixed — No Changes Needed

BP06Builder.tsx already contains the exact dual-source fallback pattern you described. It was applied in the previous round alongside BP-04, BP-07, BP-08, and BP-09.

## Verified in current source

**Line 47** — state declared:
```tsx
const [resolvedBookTitle, setResolvedBookTitle] = useState<string>("");
```

**Lines 56–62** — `author_context` → `books` fallback inside the existing `useEffect`:
```tsx
const { data: ctx } = await supabase.from("author_context")
  .select("book_title").eq("author_id", authorId)
  .order("created_at", { ascending: false }).limit(1).maybeSingle();
if (ctx?.book_title) {
  setResolvedBookTitle(ctx.book_title);
} else {
  const { data: book } = await supabase.from("books")
    .select("title").eq("author_id", profile?.user_id || authorId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (book?.title) setResolvedBookTitle(book.title);
}
```

**Line 138** — JSX uses the exact requested expression:
```tsx
'{(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "your book"}'
```

This is identical to BP-04, BP-07, BP-08, BP-09.

## If Pauline is still seeing 'your book' on BP-06

The code is correct, so the runtime cause is likely one of:

1. **Stale browser bundle** — the previous deploy hadn't reached her session. Hard refresh `/node-builder/BP-06` (Cmd+Shift+R) and re-test.
2. **No `author_context` row + no `books` row resolvable for `authorId`** — both fallbacks return nothing, so `resolvedBookTitle` stays `""` and the UI correctly falls through to `"your book"`. This would be a data issue, not a code issue, and would also affect BP-04/07/08/09 the same way (you reported those are now working, which strongly suggests the data IS there and the code IS running — pointing back to cache).
3. **Different builder being viewed** — confirm the URL is exactly `/node-builder/BP-06` and not a redirect to a hub page.

## Recommendation

No code edit is required. Please:
1. Hard-refresh `/node-builder/BP-06` and confirm.
2. If it still shows `'your book'` after a clean reload, share a screenshot of the BP-06 intro plus the browser console — I'll inspect whether `useAuthorBook` or the local fallback is failing at runtime, and if needed add a diagnostic log or query the DB to confirm Pauline's `author_context` / `books` rows are reachable from the BP-06 author scope.

