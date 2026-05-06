# Audit: YR-22 / YR-23 / YR-24 / YR-25 vs BP-02 / BP-06

All four builders share the identical legacy shape that YR-19/20/21 had before their fix. Same five gaps, same expected symptoms (ABBY snag on slow gen, refresh sometimes drops to step 0, publish writes against the wrong book row when an author has multiple books, "published" not reflected on dashboard, X/28 count not updating).

## Differences found

| Concern | BP-02 / BP-06 (good) | YR-22 (Corporate Training) | YR-23 (Mastermind) | YR-24 (Retreats) | YR-25 (Certification) |
|---|---|---|---|---|---|
| Active book id | `activeBookId = bookId ?? hookBookId ?? null` from `useAuthorBook` | `bookId` prop only; `hookBookId` not destructured | Same | Same | Same |
| `useEffect` deps | `[authorId, isAuthReady, activeBookId]` re-hydrates on book switch | `[authorId, isAuthReady]` — stale on book switch | Same | Same | Same |
| Hydration | Two-tier: `loadBuilderDraft` then fallback `author_nodes` query filtered by `author_id` + `book_id` | Single-tier `loadBuilderDraft` only | Same | Same | Same |
| Publish call | `publishNodeToSite(authorId, nodeId, slug, activeBookId)` after a forced `autosaveBuilderDraft`, guarded by `isPublishing` | `publishNodeToSite(authorId, "YR-22", authorSlug)` — no bookId, no pre-save, no guard | Same (YR-23) | Same (YR-24) | Same (YR-25) |
| Generation timeout | `invokeWithTimeout(..., 90000)` | Plain `supabase.functions.invoke` — can hang past gateway 30s | Plain invoke — can hang | Plain invoke — can hang | Plain invoke — can hang |
| Half-published recovery | Step≥3 but node not actually live → reset to step 2 + toast | None | None | None | None |

Net: YR-22/23/24/25 are functionally the pre-fix YR-19/20/21. Same standardisation pass fixes them.

## Plan

Apply the BP-02/BP-06 pattern to YR-22, YR-23, YR-24, YR-25:

1. **Active book scoping**
   - Destructure `bookId: hookBookId` from `useAuthorBook()`.
   - Compute `const activeBookId = bookId ?? hookBookId ?? null;`
   - Replace `bookId ?? null` in autosave/publish/resolveBookTitle/loadBuilderDraft with `activeBookId`.
   - Add `activeBookId` to the hydration `useEffect` dependency array.

2. **Two-tier hydration**
   - After `loadBuilderDraft(...)` returns empty, run a fallback query against `author_nodes` filtered by `author_id`, `node_id`, and `book_id = activeBookId` when present.
   - If `status === "live" || activated_at || microsite_url` → set content + step 3.
   - Else if a saved `_currentStep` exists → use it; otherwise step 2.

3. **Publishing reliability**
   - Add `const [isPublishing, setIsPublishing] = useState(false);` and guard `handlePublish`.
   - Immediately before `publishNodeToSite`, await `autosaveBuilderDraft(...)` with current content + `_currentStep: 3`.
   - Pass `activeBookId` to `publishNodeToSite(authorId, nodeId, authorSlug, activeBookId)`.
   - Disable Publish button while `isPublishing`; switch the activation loader from `step === 3` to `isPublishing`.

4. **Generation timeout**
   - Replace `supabase.functions.invoke("generate-yr22-corporate" | "generate-yr23-mastermind" | "generate-yr24-retreats" | "generate-yr25-certification", ...)` with `invokeWithTimeout(name, body, 90000)` from `@/lib/invoke-with-timeout`.

5. **Half-published recovery**
   - In hydration: if `__draft.currentStep >= 3` but node isn't actually live, force `step = 2` and `toast.info("Your last publish didn't complete — please click Publish again.")`.

## Files to edit
- `src/components/dashboard/builders/yr22/YR22Builder.tsx`
- `src/components/dashboard/builders/yr23/YR23Builder.tsx`
- `src/components/dashboard/builders/yr24/YR24Builder.tsx`
- `src/components/dashboard/builders/yr25/YR25Builder.tsx`

No edge function or DB changes required — `generate-yr22-corporate`, `generate-yr23-mastermind`, `generate-yr24-retreats`, `generate-yr25-certification` already exist and the readiness gates are unchanged.

Approve and I'll switch out of plan mode and apply the edits in one pass.
