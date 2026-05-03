## BP-06 Audit — Yes, It Should Be the Reference Model

I read `BP06Builder.tsx` end-to-end and compared it against every other BP, BA, and YR builder. Here's the verdict and what we change.

### Why BP-06 works (and others don't)

BP-06 is the only builder that does ALL of these correctly:

1. **Active book resolution**
   - `const activeBookId = bookId ?? hookBookId ?? null`
   - Also derives `effectiveBookTitle` and `hasResolvedBook` so the intro screen never lies.
   - Re-runs the load effect when `activeBookId` changes (`[authorId, activeBookId]`), so switching books actually reloads the right draft.
   - Most BA/YR builders only depend on `[authorId]` and only pass `bookId ?? null`, which is why opening a node without a `?bookId=` in the URL drops the user back to the intro.

2. **Per-book persistence**
   - Load: queries `author_nodes` scoped by `book_id` when known, then falls back to `loadBuilderDraft(authorId, "BP-06", activeBookId)`.
   - Save: `autosaveBuilderDraft({ ..., bookId: activeBookId })`.
   - Publish: `publishNodeToSite(authorId, "BP-06", authorSlug, activeBookId, libraryAsset)` — passes both bookId AND library asset.
   - Most BA/YR builders call `publishNodeToSite(authorId, NODE, slug)` with no bookId, which can publish/find the wrong row in multi-book accounts.

3. **Resume on refresh**
   - On mount, hydrates from `author_nodes` first, then falls back to draft store.
   - If `status === "live"` → step 3 with `activated: true`.
   - If `status === "content_ready"` or draft exists → step 2.
   - Other builders only call `loadBuilderDraft` and skip the live-row check, so a published node can briefly look unpublished.

4. **Library save**
   - Builds DOCX + PDF, uploads via `uploadAndRegisterLibraryAsset`, attaches the canonical `library_asset` to content before publish.
   - Has BOTH a "Save to Library" path AND a publish path that uploads silently.
   - Surfaces upload failures loudly (Sprint 55c) rather than silently publishing without a library asset.
   - Most other builders either skip `library_asset` entirely or rely on the server's `deriveLibraryAsset` fallback.

5. **Auth + error handling**
   - Uses `getActiveToken()` + `fetchWithTimeout` for generation.
   - Refreshes session once if no token.
   - Wraps `StripeRequiredError` to open a modal instead of showing a generic snag.
   - Uses `toAbbyError()` only for display, keeps raw error logged.

### Minor things BP-06 still does that we should NOT copy verbatim

- The pre-load "hydrate directly from `author_nodes`" block bypasses `save-author-node` for the read. It works under project-local RLS, but for shared-backend sessions the `loadBuilderDraft` path is more reliable. The canonical reference should prefer `loadBuilderDraft` first and only fall back to direct `author_nodes` read if the draft load returns empty AND the user is on project-local auth.
- The standalone "edited Word doc re-upload" path (line 835) still does a direct `author_nodes.update`. That should also route through `autosaveBuilderDraft` so it inherits the same RLS/book scoping.

These are small fixes inside BP-06 itself, not blockers to using it as the model.

### Conclusion

**Yes — BP-06 is the correct reference.** It is the only builder that combines:
- correct active-book fallback
- per-book load + save + publish
- live-row + draft-row resume
- real `library_asset` upload
- standardized auth and error handling

### Standardization plan (uses BP-06 as the template)

1. Extract the BP-06 pattern into a small set of shared helpers so every builder can adopt it without copy-paste:
   - `useActiveBookId(propBookId)` — returns `{ activeBookId, hasResolvedBook, effectiveBookTitle, isBookLoading }`.
   - `useBuilderResume({ authorId, nodeId, activeBookId })` — runs the BP-06 hydrate logic (live row → draft → empty), returns `{ content, step, setContent, setStep }`.
   - `useBuilderPublish({ authorId, nodeId, activeBookId, authorSlug, buildLibraryAsset })` — wraps `publishNodeToSite` with the silent upload-then-publish flow and `StripeRequiredError` handling.

2. Tighten BP-06 itself first:
   - Make the initial load go through `loadBuilderDraft` first, then fall back to direct `author_nodes`.
   - Route the Word-import save through `autosaveBuilderDraft` instead of a direct table update.

3. Roll the helpers out across builders in this priority order:
   - **BP-02** (the one currently snagging) — fix the stale snag banner, replace direct `author_nodes` writes in `ReviewStep`, scope by activeBookId.
   - **BP-01, BP-03, BP-04, BP-05, BP-06, BP-07, BP-08, BP-09** — already partially aligned; finish the migration to the shared hooks.
   - **BA-10 through BA-18** — add `activeBookId` fallback, pass `bookId` to publish, add live-row resume.
   - **YR-19 through YR-28** — same as BA, plus add `resolveBookTitle` calls to the ones missing it (currently all 10 YR builders compute book title only via `useAuthorBook`).
   - **BA-11** — replace its custom `books` lookup with the standardized resolver.

4. Tighten error UI everywhere:
   - Clear `error` after a successful resume / generate / publish.
   - Only show a "Try Again" button where a retry handler is wired.
   - Keep raw error in console, friendly text in UI.

5. Keep the publish path consistent:
   - Always `publishNodeToSite(authorId, nodeId, authorSlug, activeBookId, libraryAsset?)`.
   - Optional `libraryAsset` per node (not all nodes ship a downloadable yet).

### Files this will touch

Reference model:
- `src/components/dashboard/builders/bp06/BP06Builder.tsx` (small tightening)

New shared helpers:
- `src/hooks/useActiveBookId.ts`
- `src/hooks/useBuilderResume.ts`
- `src/hooks/useBuilderPublish.ts`

Migrations (in order):
- `src/components/dashboard/builders/bp02/BP02Builder.tsx`
- BP-01, BP-03, BP-04, BP-05, BP-07, BP-08, BP-09
- BA-10 through BA-18 (BA-11 also gets the resolver swap)
- YR-19 through YR-28

Cross-cutting:
- `src/lib/abby-error.ts` (error normalization touch-ups)
- shared inline editor components that still write directly to `author_nodes`

### Expected outcome

After this:
- Every builder reads its book the BP-06 way → fixes "node cannot read the book" for BA + YR.
- Every builder resumes the BP-06 way → fixes "page goes back to introduction".
- Every builder saves and publishes the BP-06 way → removes the architectural reason ABBY keeps "hitting a snag", starting with BP-02.

If you approve, I'll start by tightening BP-06, then introduce the shared hooks, then migrate BP-02 and roll outward.