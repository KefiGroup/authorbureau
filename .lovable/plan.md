## Audit: YR-26 (Conferences), YR-27 (Fundraising), YR-28 (Sponsors / JV)

All three builders share the same legacy gaps as YR-19→YR-25 (now fixed):

| Gap | YR-26 | YR-27 | YR-28 |
|---|---|---|---|
| Uses `bookId` only (no `activeBookId` from `useAuthorBook`) | yes | yes | yes |
| `loadBuilderDraft` only — no `author_nodes` DB fallback | yes | yes | yes |
| `publishNodeToSite` not passed `activeBookId` | yes | yes | yes |
| No mandatory `autosaveBuilderDraft` immediately before publish | yes | yes | yes |
| No `isPublishing` guard | yes | yes | yes |
| No half-published recovery (Step 3 + status≠live) | yes | yes | yes |
| Generation calls lack `invokeWithTimeout` (90s) | yes | yes | yes |
| Hydration `useEffect` deps don't include `activeBookId` | yes | yes | yes |

## Plan — apply the same BP-02/BP-06 standardization

For each of `YR26Builder.tsx`, `YR27Builder.tsx`, `YR28Builder.tsx`:

1. **Active book scoping**
   - `const { bookId: hookBookId } = useAuthorBook();`
   - `const activeBookId = bookId ?? hookBookId ?? null;`
   - Use `activeBookId` in all autosave/load/publish calls.
   - Add `activeBookId` to hydration `useEffect` deps.

2. **Two-tier hydration**
   - Try `loadBuilderDraft(authorId, nodeId, activeBookId)` first.
   - If empty, fallback query `author_nodes` filtered by `author_id`, `node_id`, and `activeBookId` to recover `content_json`, `status`, `microsite_url`, `current_step`.

3. **Publishing reliability**
   - Add `isPublishing` state; disable Publish button while true.
   - Force `await autosaveBuilderDraft({ ..., currentStep: 3, content: { ..., _currentStep: 3 }, bookId: activeBookId })` immediately before `publishNodeToSite(authorId, nodeId, authorSlug, activeBookId)`.
   - On error, revert to Step 2 and clear `isPublishing`.

4. **Half-published recovery**
   - On hydrate, if `current_step === 3` and `status !== 'live'`, set step to 2 and toast "Resumed — please re-publish".

5. **Generation timeouts**
   - Replace `supabase.functions.invoke("generate-yr2X-...")` with `invokeWithTimeout(..., 90_000)` and surface timeout as a friendly error.

## Files to edit
- `src/components/dashboard/builders/yr26/YR26Builder.tsx`
- `src/components/dashboard/builders/yr27/YR27Builder.tsx`
- `src/components/dashboard/builders/yr28/YR28Builder.tsx`

No DB migrations, no edge function changes — purely client-side parity work matching the YR-22→YR-25 fixes.

Approve to implement.