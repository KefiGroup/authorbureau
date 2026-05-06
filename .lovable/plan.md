## Audit: BA-13 / BA-14 / BA-15 vs BP-02 / BP-06

I diffed all five builders against the now-stable BP-02 (Lead Magnet) and BP-06 (Workbook) patterns. The BA-13/14/15 trio share several gaps that explain the recurring "ABBY snag", "publish doesn't stick", "refresh kicks back to dashboard", and "count not updating" symptoms.

### Differences found (✅ = present, ❌ = missing/broken)

| Behaviour | BP-02 | BP-06 | BA-13 | BA-14 | BA-15 |
|---|---|---|---|---|---|
| Uses `activeBookId = bookId ?? useActiveBookId()` (book-scoped) | ✅ | ✅ | ❌ uses raw `bookId` prop only | ❌ | ❌ |
| Passes `bookId` to `publishNodeToSite(...)` | ✅ | ✅ | ✅ | ❌ (omits 4th arg) | ❌ (omits 4th arg) |
| Passes `bookId` to `loadBuilderDraft` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Re-hydrates **publish state** from `author_nodes` (status/microsite_url/activated_at) as a fallback when `loadBuilderDraft` returns empty | ✅ | ✅ | ❌ relies on draft-only | ❌ | ❌ |
| Manual **Save Draft** button | ✅ | ✅ | ❌ | ❌ | ❌ |
| `isPublishing` guard + `finally` reset | ✅ | ✅ | ✅ (BA-13 only) | ❌ | ❌ (uses `setStep(3)` optimistically then rolls back to 2 on error — racy) |
| Half-published recovery (drops back to Step 2 if status=live but no microsite_url) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Publish path persists final content via `autosaveBuilderDraft` **before** `publishNodeToSite` (avoids race with browser RLS) | ✅ | ✅ | ❌ publishes without a final save | ❌ | ❌ |
| Effect deps include `activeBookId` (re-hydrates when book switches) | ✅ | ✅ | ❌ only `[authorId, isAuthReady]` | ❌ | ❌ |
| Generation timeout uses `invokeWithTimeout` / `fetchWithTimeout` | ✅ | ✅ | ✅ | ❌ uses bare `supabase.functions.invoke` (no timeout — will hang on slow gen and surface as "ABBY snag") | ✅ |

### Why this maps to the symptoms you're still seeing

1. **"Page refresh goes back to dashboard / not permanently saved"** — BA-13/14/15's hydration only reads from `loadBuilderDraft`. If that draft row exists for a different book, or the autosave never landed, the builder falls through to step 0 with no content, and `NodeBuilder` may bounce. Fix = mirror BP-06's two-tier hydration (draft → direct `author_nodes` read scoped by `activeBookId`).
2. **"Publish not working / count not updating"** — BA-14 and BA-15 call `publishNodeToSite(authorId, nodeId, slug)` without `bookId`. The edge function then writes to whichever row it finds first (often the wrong book), so `useNodeLiveStats` never sees a `live` row for the active book, and `author-stats` count stays stuck.
3. **"ABBY snag"** — BA-14 generation has no timeout. Slow ABBY responses time out at the gateway with a generic error. BP-02/06 use `invokeWithTimeout`/`fetchWithTimeout` at 90–180 s.
4. **Effect missing `activeBookId` dep** — switching books in the picker doesn't re-hydrate the builder for that book, so users see stale draft and try to "publish" again over the wrong row.

---

## Plan

Standardise BA-13, BA-14, BA-15 to the BP-02/BP-06 pattern. All three already share an almost-identical skeleton, so the changes are surgical and consistent.

### 1. Adopt `useActiveBookId` everywhere
For each of BA-13/14/15:
```ts
const hookBookId = useActiveBookId();
const activeBookId = bookId ?? hookBookId ?? null;
```
Replace every internal use of `bookId` with `activeBookId` (load draft, publish, autosave, return-to URL).

### 2. Two-tier hydration (matches BP-06)
After `loadBuilderDraft` returns nothing, fall back to a direct `author_nodes` read scoped by `activeBookId`, restoring `step=3` if `status === 'live'` (or `microsite_url`/`activated_at` set), `step=2` if `content_ready`, `step=0` otherwise. This kills the "refresh bounces to dashboard / loses progress" case.

### 3. Pass `bookId` into publish
```ts
await publishNodeToSite(authorId!, "BA-14", authorSlug, activeBookId);
await publishNodeToSite(authorId!, "BA-15", authorSlug, activeBookId);
```
(BA-13 already does this.)

### 4. Persist content right before publish
Mirror BP-02 step (1) of `handlePublish`:
```ts
await autosaveBuilderDraft({ authorId, nodeId, nodeName,
  content: { ...content, _currentStep: 3 }, currentStep: 3, bookId: activeBookId });
```
Then call `publishNodeToSite`. Eliminates the race that leaves the row at `content_ready` even after a successful publish.

### 5. Add `isPublishing` guard + `finally` to BA-14 and BA-15
Copy BA-13's pattern (set `isPublishing=true` → try → `finally setIsPublishing(false)`); remove BA-15's optimistic `setStep(3)` before the request.

### 6. Half-published recovery for BA-14 + BA-15
Copy BA-13's check: if `__draft.isLive` but no `micrositeUrl`, drop to step 2 and toast "Your last publish didn't complete — please click Publish again."

### 7. Generation timeout for BA-14
Replace `supabase.functions.invoke("generate-ba14-podcast", ...)` with `invokeWithTimeout("generate-ba14-podcast", { author_id, book_id }, 90000)` to match BA-13/15.

### 8. Effect deps
Change `useEffect(..., [authorId, isAuthReady])` → `[authorId, isAuthReady, activeBookId]` so switching books re-hydrates the builder.

### 9. Optional but recommended
Add a small "Save Draft" button next to "Publish to My Site" on step 2 (same handler shape BP-02 uses) so authors can explicitly persist edits — this also serves as a manual recovery if autosave debounce missed a keystroke.

### Files to edit
- `src/components/dashboard/builders/ba13/BA13Builder.tsx` — items 1, 2, 4, 8, 9
- `src/components/dashboard/builders/ba14/BA14Builder.tsx` — items 1–9
- `src/components/dashboard/builders/ba15/BA15Builder.tsx` — items 1–6, 8, 9

No changes required to:
- `src/lib/builder-autosave.ts`, `src/lib/publish-node.ts` — already correct
- `supabase/functions/save-author-node/*` — already book-scoped + service-role
- `supabase/functions/_shared/node-readiness.ts` — BA-13 (`sessions[]`/`schedule`) and BA-15 (press release + outlets) gates already match the docs; BA-14 uses the generic non-empty gate, which is correct for an author-level node

### Verification after implementation
1. Open BA-14 with one of Pauline's books, generate, refresh → builder restores at step 2 with content.
2. Click Publish → `useNodeLiveStats` flips that node to "Live" or "Building (60%)" depending on assets, count on dashboard goes up by 1.
3. Switch active book to another of her books → BA-14 re-hydrates fresh for that book.
4. Same drill for BA-13 and BA-15.

Approve and I'll switch out of plan mode and make the edits in one pass.
