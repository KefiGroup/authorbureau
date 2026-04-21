

## Goal
Stop the false "Complete Book Profile" gate from showing on BA-10 through BA-18, BP-03, BP-04, BP-06, BP-07, BP-08, BP-09 for users like Pauline whose book IS in the system.

## Root cause found
Even after switching the broken builders to `useAuthorBook`, they still have a **second, divergent gating path** that BP-01 / BP-02 do not have:

1. They call `useAuthReady()` AND gate the local effect on `if (!isAuthReady || !authorId) return`. BP-01/02 only gate on `authorId`.
2. They run a local `author_context` query through the **Cloud** Supabase client. Pauline's session is on the **shared** backend (the platform's standard auth), so the Cloud client has no `auth.uid()`, RLS blocks the query, no row returns, and `setHasContext(false)` fires.
3. They then check `detectedBookTitle !== "your book"` — but `useAuthorBook` returns the literal string `"your book"` when its query is still in flight or when the user has no Cloud session (`useAuthReady` returns `isReady=false` → hook short-circuits to `"your book"`). That string-equality guard fails, `hasContext` stays false, gate renders.

BP-01 / BP-02 happen to work because their `setBookTitle` from local `author_context` may also fail, but their flow tolerates `bookTitle` being an empty string and still shows the intro because their gate condition is reached differently — and crucially, BP-01 was the original reference and its book lookup hits `books` via `profile.user_id` which lines up with shared-backend `auth.uid()` patterns in some paths the BA builders no longer use.

## Fix — make `useAuthorBook` the single source of truth

In all 15 broken builders, do exactly this:

1. **Delete the local `author_context` lookup and the `hasContext` state.** Remove the entire local supabase query block that sets `bookTitle` / `hasContext`.
2. **Remove the `useAuthReady` import and `isAuthReady` guard** from the effect. Match BP-01: only guard on `if (!authorId) return`.
3. **Keep the local effect ONLY for things that aren't book-resolution** (loading author profile name/slug, loading the saved draft, etc.).
4. **Drive the intro from `useAuthorBook` directly:**
   ```ts
   const { hasBook, bookTitle: detectedBookTitle, isLoading: isBookLoading } = useAuthorBook();
   ```
5. **Replace the gate condition** with the same shape BP-01 uses, but driven entirely by `useAuthorBook`:
   ```tsx
   {!isBookLoading && !hasBook ? (
     <>
       <p>Hi {authorName}! Before I can build this, I need to know about your book…</p>
       <Button onClick={() => navigate("/my-books?returnTo=/node-builder/<NODE_ID>")}>
         Complete Book Profile
       </Button>
     </>
   ) : (
     <>
       <p>… personalised for '{detectedBookTitle || "your book"}' …</p>
       <Button onClick={handleGenerate} disabled={isBookLoading}>Generate</Button>
     </>
   )}
   ```
6. **Drop the `bookTitle` local state** entirely — every reference to `bookTitle` in the JSX becomes `detectedBookTitle`.

This removes:
- the divergent local RLS-blocked `author_context` query
- the `useAuthReady` race that gates the effect entirely
- the `setHasContext(false)` path that forces the gate

…and replaces them with the **same single hook** BP-01/02 already trust.

## Backstop fix to `useAuthorBook` (one-line safety)
While the hook is short-circuiting on `!isReady || !user`, return `isLoading: true` (not `false`) so consumers' "loading branch" stays active until the auth handshake completes. This prevents the gate from ever rendering during the brief Cloud-session-restoration window.

```ts
if (!isReady || !user) {
  return { hasBook: false, bookTitle: "your book", book: null, bookId: null,
           missingFields: [], isComplete: false, isLoading: true }; // was: !isReady
}
```

## Files to update
Builders (all 15):
- `src/components/dashboard/builders/ba10/BA10Builder.tsx` … `ba18/BA18Builder.tsx`
- `src/components/dashboard/builders/bp03/BP03Builder.tsx`, `bp04/BP04Builder.tsx`, `bp06/BP06Builder.tsx`, `bp07/BP07Builder.tsx`, `bp08/BP08Builder.tsx`, `bp09/BP09Builder.tsx`

Hook:
- `src/hooks/useAuthorBook.ts` (one-line `isLoading` change)

**Untouched:** `BP01Builder.tsx`, `BP02Builder.tsx`, `BP05Builder.tsx`, all YR builders.

## Why this will actually work this time
Previous attempts kept the local `author_context` query as a "fast path" alongside the hook. That query is the source of the false gate — it returns `false` when the Cloud session isn't present, and that `false` overrides whatever `useAuthorBook` later resolves. Removing it leaves `useAuthorBook` as the only signal, and `useAuthorBook` already has the proven dual-token + `owner_email` resolution path that returns `Be SUCKcessful` for Pauline.

## Verification
1. `/node-builder/BA-10` for Pauline → intro reads `'Be SUCKcessful'`, no gate.
2. `/node-builder/BA-11` … `BA-18`, `BP-03`, `BP-04`, `BP-06`–`BP-09` → same.
3. BP-01, BP-02, BP-05 unchanged.
4. A genuinely new user with no book → still sees the "Complete Book Profile" CTA correctly (because `useAuthorBook` returns `hasBook=false` legitimately).

## Rollback option (if you'd rather)
You also asked about rolling back. If you'd prefer, we can revert to the version where BP-03 and BP-04 were last green — but that would also undo every other improvement made since. The fix above is smaller and surgical. Click below if you want to compare versions:

<lov-actions>
<lov-open-history>View History</lov-open-history>
</lov-actions>

