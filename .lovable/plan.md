1. Make BA-11 publish write the real saved payload instead of only showing UI success.
- Update `supabase/functions/ba11-publish-audiobook/index.ts` to first read any existing BA-11 `author_nodes` row, preserve the existing `studio` draft content, and merge the publish fields into it.
- Persist the canonical `book_id` on the BA-11 row during publish so the node belongs to the current book and appears in per-book progress.
- Stamp `published_at` into `content_json` and keep `_currentStep: 4` so the builder reliably resumes in the Publish step.
- Write a canonical `library_asset` for BA-11 using the generated ZIP URL with kind `audio_zip`, so readiness and My Library can use the same source of truth.
- Return success only after the audiobook row and author-node row are both written successfully; if the author-node update fails, return an error instead of a success payload.

2. Fix BA-11 library visibility and readiness gating.
- Update the BA-11 library asset support so My Library can show the audiobook from the saved publish data.
- Prefer the new canonical `content_json.library_asset` path for BA-11 and add a legacy fallback for `zip_url` / chapter URLs if needed for older rows.
- Ensure BA-11 readiness in the shared node-readiness contract accepts the canonical `audio_zip` library asset, so the node can count as truly completed from the saved publish output.
- Keep the dashboard/book-hub counters aligned with the same saved BA-11 data by relying on the merged, book-scoped `author_nodes` row.

3. Stop the frontend from claiming success based only on local state.
- In `src/components/dashboard/builders/audiobook/AudiobookPublishStep.tsx`, stop treating `stepData.publishedAt` alone as proof that publish worked.
- Drive the success badge/banner from the real backend response and merged saved state, not just the modal callback.
- Replace the unconditional local success toast with one that only fires after the backend returns the saved publish data needed for Library + author site + export pack.
- Pass the current `bookId` through all BA-11 autosave/publish paths so later saves do not detach the live row from its book.

4. Protect BA-11 from being overwritten by later autosaves.
- In the BA-11 builder/autosave flow, make sure post-publish draft saves preserve any live publish fields already on the row instead of replacing them with only `{ studio, _currentStep }`.
- Align BA-11 with the safer merge behavior already used by the older `distribute-audiobook` implementation.

5. Verify the real saved outputs after the fix.
- Confirm a publish creates/updates:
  - an `audiobooks` row with `status='published'`
  - a BA-11 `author_nodes` row with `status='live'`, the correct `book_id`, `chapter_urls`, `zip_url`, `published_at`, and `library_asset.kind='audio_zip'`
  - a visible My Library entry
  - completed BA-11 status in Book Hub/dashboard
  - a working audiobook author-site page / buy flow link

Technical details
- Root cause 1: `AudiobookPublishStep.tsx` currently marks success locally by setting `publishedAt` and showing a toast in `onDistributed()` even if downstream saved state is incomplete.
- Root cause 2: `ba11-publish-audiobook/index.ts` currently upserts `author_nodes` without preserving existing BA-11 draft content and without writing `book_id`, so the live row can become detached from the active book.
- Root cause 3: the BA-11 publish path does not write a canonical `library_asset`, while My Library and readiness increasingly depend on that contract.
- Root cause 4: the current live BA-11 row appears to contain only `studio` / `_currentStep` in `content_json`, which matches the symptom: success toast shown, but no actual library/live completion evidence for BA-11.

Files likely involved
- `supabase/functions/ba11-publish-audiobook/index.ts`
- `src/components/dashboard/builders/audiobook/AudiobookPublishStep.tsx`
- `src/components/dashboard/audiobook/DistributeAudiobookModal.tsx`
- `src/components/dashboard/builders/ba11/BA11Builder.tsx`
- `src/lib/nodeAssetRegistry.ts`
- Possibly `src/pages/AuthorLibrary.tsx` if BA-11 needs a specific legacy fallback render path