## Findings

I verified the backend data for **Be SUCKcessful** (`bookId = e5b857ac-48ce-4ffc-a761-3c09e95a318e`) and the manuscript is present.

- The manuscript is stored in the backend table **`generated_assets`**.
- The lookup key is:
  - **`book_id = e5b857ac-48ce-4ffc-a761-3c09e95a318e`**
  - **`asset_type = 'source_material'`**
- The manuscript text is stored in the **`content`** column.
- The stored manuscript row currently has about **100,589 characters**, so this is not a missing-data issue.
- The book row is owned by **support@paulineteo.com** and its `author_id` matches the authenticated user id already seen elsewhere in the logs.

I also confirmed an important implementation mismatch:

- The **old Audiobook Studio** (`src/components/dashboard/AudiobookStudio.tsx`) calls **`get-book-manuscript`**.
- The **current BA-11 builder flow** (`src/components/dashboard/builders/audiobook/ManuscriptOptimizationStep.tsx`) calls **`get-manuscript-source`**.
- The failing UI text **"No manuscript found for this book"** comes from the **old `AudiobookStudio` component**.

The strongest root-cause signal is that there were **no request logs** for `get-book-manuscript` during the failing session snapshot, while the manuscript row definitely exists. That points to the client failing **before or during auth token resolution**, not to missing manuscript data.

## Plan

1. **Fix the BA-11 client bootstrap path in `AudiobookStudio`**
   - Make manuscript loading wait for shared auth restoration instead of treating a missing token as “no manuscript”.
   - Reuse the same retry pattern already used in `useMyBooks` so the studio survives refresh/navigation timing issues.
   - Distinguish these states in UI:
     - auth not ready
     - loading manuscript
     - manuscript not found
     - backend request failed
   - Prevent the current false-negative state where `token === null` immediately falls through to the “No manuscript found” card.

2. **Add explicit diagnostics to the manuscript edge function**
   - Instrument `get-book-manuscript` to log:
     - received `book_id`
     - how the user was resolved
     - book ownership result
     - whether a `source_material` asset was found
     - matched `author_id`
     - content length returned
   - Return a clearer structured error payload when the request is unauthorized, the book is not owned, or the asset query returns empty.
   - This will make the next failure unambiguous instead of looking like deleted content.

3. **Normalize the manuscript read path across BA-11**
   - Align the old `AudiobookStudio` manuscript fetch with the same ownership/data rules already used in `get-manuscript-source`, or extract a shared backend helper so both BA-11 experiences read manuscripts the same way.
   - Remove the current situation where two BA-11 UIs depend on two different functions and produce different failure modes.

4. **Verify the fix against the real book record**
   - Re-test `bookId = e5b857ac-48ce-4ffc-a761-3c09e95a318e` specifically.
   - Confirm the studio auto-loads the stored manuscript instead of showing the fallback card.
   - Confirm the edge logs now show the actual lookup and returned content length.

## Technical details

Relevant files to update:

- `src/components/dashboard/AudiobookStudio.tsx`
- `supabase/functions/get-book-manuscript/index.ts`
- potentially `supabase/functions/get-manuscript-source/index.ts` if I consolidate the lookup logic

Confirmed backend data for this bug:

```text
books.id = e5b857ac-48ce-4ffc-a761-3c09e95a318e
generated_assets.book_id = e5b857ac-48ce-4ffc-a761-3c09e95a318e
generated_assets.asset_type = source_material
generated_assets.content_length ≈ 100589
```

Most likely failure sequence today:

```text
AudiobookStudio mounts
-> getActiveToken() returns null during shared-auth restoration / lock contention
-> component stops loading
-> no backend request is made
-> manuscript stays empty string
-> UI renders "No manuscript found for this book"
```

This is why the earlier fix did not resolve the bug: the manuscript row exists, but the old studio is still vulnerable to the refresh-time auth bootstrap race before it ever reaches the backend lookup.