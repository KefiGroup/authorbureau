# Audit: YR-19 / YR-20 / YR-21 vs BP-02 / BP-06

All three Yield builders share the same legacy shape that BA-13–18 had before their fix. Same five gaps, same expected symptoms (ABBY snag on slow gen, refresh sometimes drops to step 0, publish writes against the wrong book row, "published" not reflected on dashboard, X/28 count not updating).

## Differences found

| Concern | BP-02 / BP-06 (good) | YR-19 (Coaching) | YR-20 (Consulting) | YR-21 (Keynotes) |
|---|---|---|---|---|
| Active book id | `activeBookId = bookId ?? hookBookId ?? null` from `useAuthorBook` | Hook imported but `bookId` never destructured; uses raw prop only | Same as YR-19 | Same as YR-19 |
| `useEffect` deps | Re-hydrates on `[authorId, isAuthReady, activeBookId]` | Stale on book switch | Stale on book switch | Stale on book switch |
| Hydration | Two-tier: `loadBuilderDraft` then fallback `author_nodes` query filtered by `author_id` + `book_id` | Single-tier `loadBuilderDraft` only | Single-tier only | Single-tier only |
| Publish call | `publishNodeToSite(authorId, nodeId, slug, activeBookId)` after a forced `autosaveBuilderDraft`, guarded by `isPublishing` | `publishNodeToSite(authorId, "YR-19", authorSlug)` — no bookId, no pre-save, no guard | Same (YR-20) | Same (YR-21) |
| Generation timeout | `invokeWithTimeout(..., 90000)` | Plain `supabase.functions.invoke` — can hang past gateway 30s | Plain invoke — can hang | Plain invoke — can hang |
| Half-published recovery | Step≥3 but node not actually live → reset to step 2 + toast | None | None | None |

Net: YR-19/20/21 are functionally the pre-fix BA-13/14/15. Same standardisation pass fixes them.

## Plan

Apply the BP-02/BP-06 pattern to all three:

1. **Active book scoping**
   - Destructure `bookId: hookBookId` from `useAuthorBook()`.
   - Compute `const activeBookId = bookId ?? hookBookId ?? null;`
   - Replace `bookId ?? null` in autosave/publish/navigate with `activeBookId`.
   - Add `activeBookId` to the hydration `useEffect` deps.

2. **Two-tier hydration**
   - After `loadBuilderDraft(...)` returns empty, run a fallback query against `author_nodes` filtered by `author_id`, `node_id` (`YR-19`/`YR-20`/`YR-21`), and `book_id = activeBookId` when present.
   - If `status === "live" || activated_at || microsite_url` → set content + step 3.
   - Else if `status === "content_ready"` → set content + step 2.

3. **Publishing reliability**
   - Add `const [isPublishing, setIsPublishing] = useState(false);` and guard `handlePublish`.
   - Immediately before `publishNodeToSite`, await `autosaveBuilderDraft(...)` with current content + `_currentStep: 2`.
   - Pass `activeBookId` to `publishNodeToSite(authorId, nodeId, authorSlug, activeBookId)`.
   - Disable Publish button while `isPublishing`.

4. **Generation timeout**
   - Replace `supabase.functions.invoke("generate-yr19-coaching" | "generate-yr20-consulting" | "generate-yr21-speaking", ...)` with `invokeWithTimeout(name, body, 90000)` from `@/lib/invoke-with-timeout`.

5. **Half-published recovery**
   - In hydration: if `__draft.currentStep >= 3` but node isn't live, force `step = 2` and `toast.info("Resuming from review — please publish again.")`.

## Files to edit
- `src/components/dashboard/builders/yr19/YR19Builder.tsx`
- `src/components/dashboard/builders/yr20/YR20Builder.tsx`
- `src/components/dashboard/builders/yr21/YR21Builder.tsx`

No edge function or DB changes required — `generate-yr19-coaching`, `generate-yr20-consulting`, `generate-yr21-speaking` already exist and the readiness gates are unchanged.

Approve and I'll switch out of plan mode and apply the edits in one pass.
