## Fix BA-11 distribution failure

I found the issue: the BA-11 modal is still wired to the old `distribute-audiobook` backend, but the current BA-11 flow expects `ba11-publish-audiobook`.

For this book, the old function rejects the request because it checks ownership using `books.author_id === loggedInUserId`, while this project has books where `books.author_id` stores the author profile ID instead. That causes the 403/non-2xx error you saw. The UI also marks the audiobook as Published before the backend call actually succeeds, which makes the state feel inconsistent.

### What I’ll change

1. Update the BA-11 distribution modal to call `ba11-publish-audiobook` instead of `distribute-audiobook`.
2. Pass the same payload the newer BA-11 publish function expects, so the publish/package flow uses the backend already built for this node.
3. Remove the premature local `publishedAt` success state from the button flow so BA-11 only shows Published / Library success after the backend returns success.
4. Keep the existing narrator-credit helper text, reset button, and validation exactly as implemented.
5. Make the success toast and library messaging reflect the real backend outcome, so users only see “saved to My Library” after a successful publish.

### Files to update

- `src/components/dashboard/audiobook/DistributeAudiobookModal.tsx`
- `src/components/dashboard/builders/audiobook/AudiobookPublishStep.tsx`

### Expected result

- “Send to PublishNow” stops throwing the edge-function non-2xx error for this flow.
- The audiobook publish flow uses the correct BA-11 backend.
- The page will no longer look published before the publish actually succeeds.
- Library confirmation and Published badge will stay consistent with the real outcome.

### Technical notes

- Root cause confirmed from code and backend data:
  - UI currently invokes `distribute-audiobook`
  - Current BA-11 comment/path expects `ba11-publish-audiobook`
  - The affected book stores `books.author_id` as the author profile ID, not the auth user ID
- The newer `ba11-publish-audiobook` function already handles author profile resolution, legacy/canonical audio paths, ZIP generation, author_nodes live state, and library-facing publish metadata more safely.
- No database schema changes are needed for this fix.