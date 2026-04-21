

## Status: Code is already identical — no fix required at the source level

I diffed the 4 "failing" builders (BA-11, BA-14, BA-17, BA-18) against the 5 "passing" ones (BA-10, BA-12, BA-13, BA-15, BA-16). The relevant code is **byte-identical**:

**State declaration** — present in all 9:
```tsx
const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();
const [resolvedBookTitle, setResolvedBookTitle] = useState<string>("");
```

**Fallback lookup in useEffect** — present in all 9:
```tsx
const { data: ctx } = await supabase.from("author_context").select("book_title")
  .eq("author_id", authorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
if (ctx?.book_title) setResolvedBookTitle(ctx.book_title);
else { /* books fallback */ }
```

**Render expression** (verified character-for-character) — identical in all 9:
```tsx
{(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "your book"}
```

There is nothing structurally different between the failing 4 and the passing 5 to copy across.

## Why the user is still seeing 'your book' on those 4

Since the code is identical and 5 sibling builders work for the same user, the cause is runtime/data, not code:

1. **Stale browser bundle on those specific routes.** `/node-builder/BA-11`, `/BA-14`, `/BA-17`, `/BA-18` may be serving cached JS from before the fix. The other BA routes were visited later and pulled the new bundle.
2. **`useAuthorBook` returning the literal `"your book"` placeholder AND the local `author_context`/`books` fallback returning nothing** for the `authorId` resolved at the moment those 4 pages mount. If `authorId` is `null` on first mount and these 4 pages don't re-trigger the effect after it arrives, `resolvedBookTitle` stays `""` → expression yields `"your book"`. (BA-10/12/13/15/16 share the same `useEffect` dependency `[authorId]`, so this would affect them equally — but only if mount timing differs per route.)

## Plan

Since there is no code asymmetry to "copy from BA-10," the only safe, useful action is to **add a runtime diagnostic** to the 4 failing builders so we can see at runtime whether:
- `detectedBookTitle` came back as `"your book"` (hook miss), and
- `resolvedBookTitle` came back as `""` (local query miss for that `authorId`)

### Step 1 — Add a one-shot console log to BA-11, BA-14, BA-17, BA-18

In each of the 4 builders, inside the existing `useEffect` after the local fallback query, log:
```tsx
console.log(`[BA-XX] book resolution`, {
  authorId,
  detectedBookTitle,
  ctxTitle: ctx?.book_title ?? null,
  bookTitle: book?.title ?? null,
});
```

This is non-functional, single-line, low-risk. It will tell us conclusively which side is missing.

### Step 2 — User performs a hard refresh on each failing route

`Cmd/Ctrl + Shift + R` on `/node-builder/BA-11`, `/BA-14`, `/BA-17`, `/BA-18` to evict any cached bundle, then open DevTools console.

### Step 3 — Read back the diagnostic

- If logs show `ctxTitle: "Be SUCKcessful"` but UI still shows `"your book"` → React state/render issue, will inspect React tree.
- If logs show `ctxTitle: null` and `bookTitle: null` → data scope issue. The `authorId` reaching these 4 pages is different from the one used for the working pages (likely a Book Hub passing a per-book `author_profiles.id` while the working ones get the user's primary `author_profiles.id`). Fix would be to also check `author_context` by `user_id` or to use `useBookContext`/`get-author-book` edge function (per memory `book-ownership-lookup-standard`) which already handles dual-token + multi-author resolution.
- If logs show `detectedBookTitle: "Be SUCKcessful"` but UI shows `"your book"` → bundle is genuinely stale, no code action.

### Step 4 — Apply the targeted fix based on diagnostic

If Step 3 reveals data scope mismatch, the proper canonical fix is to **route these 4 builders through the same `get-author-book` edge function the standard mandates**, instead of trying to expand direct browser queries. That guarantees parity with whatever `useAuthorBook` finds because it's the same source of truth, and removes the project-local vs shared-backend client risk noted in memory.

## Files touched in Step 1 (diagnostic only, no behavior change)
- `src/components/dashboard/builders/ba11/BA11Builder.tsx`
- `src/components/dashboard/builders/ba14/BA14Builder.tsx`
- `src/components/dashboard/builders/ba17/BA17Builder.tsx`
- `src/components/dashboard/builders/ba18/BA18Builder.tsx`

Once the user pastes the console output (or confirms the hard refresh fixed it), we proceed to Step 4 only if needed. No speculative code rewrites — the existing code is already correct.

