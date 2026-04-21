

## Goal
Fix two distinct issues:
1. **Build error**: BP-07 still references undeclared `hasContext` → blocks compile.
2. **Runtime "your book" fallback** in BP-04, BP-06, BP-08, BP-09: `useAuthorBook` returns `"your book"` placeholder when its edge-function resolution misses, but BP-01's local `author_context` query DOES find the title for the same user.

## Root cause

**Issue 1 — BP-07 stale code.** When `useBookContext` was swapped to `useAuthorBook`, BP-07's intro JSX still has `hasContext !== null && !hasBook && !hasContext` on line 105. `hasContext` was never declared → TS2304. (This is the only real build error; the BA13–BA18 errors in the report are from a stale build cache and don't exist in the actual source.)

**Issue 2 — BP-04/06/08/09 fallback gap.** They rely solely on `useAuthorBook`. For Pauline (`'Be SUCKcessful'`), the `get-author-book` edge function path doesn't always resolve cleanly, and the hook returns the literal default `"your book"`. BP-01 / BP-02 work because they ALSO run a local `author_context` → `books` lookup that succeeds where the hook misses. We need to add that same dual-source fallback to BP-04/06/08/09.

## Fix

### A. BP-07 — match BA-13 pattern (gate driven by hook only)

Replace the broken intro condition (line 103-112):

```tsx
{!isBookLoading && !hasBook ? (
  <>
    <p className="text-muted-foreground mb-4">Hi {authorName}! Before I can build your home study course, I need to know about your book. Please complete your book profile first.</p>
    <Button onClick={() => navigate("/my-books?returnTo=/node-builder/BP-07")}>Complete Book Profile</Button>
  </>
) : (
  <><p className="text-muted-foreground mb-4">Hi {authorName}! …based on '{detectedBookTitle || resolvedBookTitle || "your book"}' …</p>
  <div className="mb-4"><BuilderIntroBlock spec={BP_INTRO_SPECS["BP-07"]} /></div>
  <Button className="w-full sm:w-auto" size="lg" onClick={handleGenerate} disabled={isBookLoading}><Sparkles className="h-4 w-4 mr-2" /> Design My Programme</Button></>
)}
```

Also add the same local lookup as B below so `detectedBookTitle` reliably reads `'Be SUCKcessful'`.

### B. BP-04, BP-06, BP-07, BP-08, BP-09 — add BP-01's dual-source fallback

In each builder, add one new state and inline the lookup inside the existing profile-loading effect (the one already running), then use it as a fallback in the JSX.

```tsx
// new state alongside existing ones:
const [resolvedBookTitle, setResolvedBookTitle] = useState<string>("");

// inside the existing useEffect, after setAuthorName(...):
const { data: ctx } = await supabase
  .from("author_context")
  .select("book_title")
  .eq("author_id", authorId)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (ctx?.book_title) {
  setResolvedBookTitle(ctx.book_title);
} else {
  const { data: book } = await supabase
    .from("books")
    .select("title")
    .eq("author_id", profile?.user_id || authorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (book?.title) setResolvedBookTitle(book.title);
}
```

Then in each builder's intro JSX, change:

```tsx
'{detectedBookTitle || "your book"}'
```

to:

```tsx
'{(detectedBookTitle && detectedBookTitle !== "your book" ? detectedBookTitle : resolvedBookTitle) || "your book"}'
```

This makes `useAuthorBook` the primary source (cached, fast) but falls back to the same local query BP-01 uses when the hook returns its placeholder.

## Files to update
- `src/components/dashboard/builders/bp07/BP07Builder.tsx` — fix `hasContext` reference + add fallback (both fixes)
- `src/components/dashboard/builders/bp04/BP04Builder.tsx` — add fallback
- `src/components/dashboard/builders/bp06/BP06Builder.tsx` — add fallback
- `src/components/dashboard/builders/bp08/BP08Builder.tsx` — add fallback
- `src/components/dashboard/builders/bp09/BP09Builder.tsx` — add fallback

## Untouched
- BP-01, BP-02, BP-03, BP-05 (working gold standards)
- All BA-10 through BA-18 (their source is already clean — the reported TS errors will clear on next clean build)
- All YR builders

## Verification (Pauline, `paulinet77@gmail.com`)
1. Build compiles (BP-07 `hasContext` error gone).
2. `/node-builder/BP-07` → Abby intro shows `'Be SUCKcessful'`, no infinite "Checking your book profile…".
3. `/node-builder/BP-04`, `/BP-06`, `/BP-08`, `/BP-09` → Abby intro shows `'Be SUCKcessful'` instead of `'your book'`.
4. BP-01, BP-02, BP-03, BP-05 unchanged.
5. New user with no book → still correctly sees "Complete Book Profile" gate (`hasBook=false` and local lookup also returns nothing).

