

## Diagnosis

BA-18's title interpolation on line 98 is already correct and identical to BA-17. The reason the user still sees "your book" on BA-18 is different from the earlier BA bug:

- BA-18 has an extra **book-gate branch** (lines 93–97) that BA-17 does not have.
- That gate branch contains the literal hard-coded sentence: *"Hi {authorName}! Before I design your revenue sharing strategy, I need to know about your book. Please complete your book profile first."*
- When `useAuthorBook()` returns `hasBook = false` for this author at mount, BA-18 renders that gate copy — which **statically contains the words "your book"** — instead of the dynamic title sentence on line 98.
- `resolvedBookTitle` is not the issue here; the title sentence is simply never reached.

In other words, the prior fix is fully wired in BA-18. What's showing is a different sentence entirely, controlled by `hasBook`, not by `detectedBookTitle`.

## Fix

Make BA-18's gate behave the same way as the working sibling builders by:

1. **Removing the literal phrase "your book"** from the gate copy so it is not mistaken for the placeholder bug. New copy: *"Hi {authorName}! Before I design your revenue sharing strategy, I need to confirm your book details. Please complete your book profile first."*
2. **Tightening the gate condition** so it only blocks when there is genuinely no book detected by *either* source. Change:
   ```tsx
   {!isBookLoading && !hasBook ? (
   ```
   to:
   ```tsx
   {!isBookLoading && !hasBook && !resolvedBookTitle ? (
   ```
   This way, if `useAuthorBook` says no book but the local `author_context` / `books` fallback found one (which is exactly the scenario the prior fix was built for), BA-18 proceeds to render the dynamic title sentence on line 98 just like BA-10 / BA-12 / BA-15 do.

No other changes. No touch to BA-17 or any other builder.

## Files to update

- `src/components/dashboard/builders/ba18/BA18Builder.tsx`
  - Line 93: gate condition change
  - Line 95: gate copy wording change

## Verification

1. Project compiles clean.
2. For an author whose book is detected by `useAuthorBook` → BA-18 renders the title-bearing sentence with `Be SUCKcessful`. (Already worked, still works.)
3. For an author where `useAuthorBook` returns `hasBook = false` but `author_context` / `books` resolves a title → BA-18 now bypasses the gate and renders the title-bearing sentence with the resolved title (this is the failing case being reported).
4. For an author with truly no book in either source → BA-18 still shows the gate, but the gate no longer contains the misleading phrase "your book".
5. The diagnostic `[BA-18] book resolution` log added previously will confirm in DevTools which path was taken.

