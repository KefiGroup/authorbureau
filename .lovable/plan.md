# Audit: BA-16 / BA-17 / BA-18 vs BP-02 / BP-06

All three builders share an identical legacy shape that diverges from the stable BP-02/BP-06 pattern in the same five ways. Symptoms expected: ABBY snag on slow generations, refresh sometimes drops to step 0, publish writes to the wrong book row when an author has multiple books, "published" not reflected on dashboard, and X/28 count not updating.

## Differences found

| Concern | BP-02 / BP-06 (good) | BA-16 | BA-17 | BA-18 |
|---|---|---|---|---|
| Active book id | `activeBookId = bookId ?? hookBookId ?? null` from `useAuthorBook` | Uses raw `bookId` prop only; pulls `hookBookId`? No | Same as BA-16 | Same as BA-16 |
| `useEffect` deps | `[authorId, isAuthReady, activeBookId]` re-hydrates on book switch | `[authorId, isAuthReady]` — stale on book switch | Same | Same |
| Hydration | Two-tier: `loadBuilderDraft` then fallback `author_nodes` query filtered by `author_id` + `book_id` checking `status in ('content_ready','live') / activated_at / microsite_url` | Single-tier `loadBuilderDraft` only | Same | Same |
| Publish call | `publishNodeToSite(authorId, nodeId, slug, activeBookId, libraryAsset?)` preceded by an immediate `autosaveBuilderDraft` and guarded by `isPublishing` state | `publishNodeToSite(authorId, "BA-16", authorSlug)` — no bookId, no pre-save, no guard | Same (BA-17, no bookId) | Same (BA-18, no bookId) |
| Generation timeout | `invokeWithTimeout(..., 90000)` to prevent hang/ABBY snag | Plain `supabase.functions.invoke` — can hang | Plain invoke — can hang | Already uses `invokeWithTimeout` (only difference) |
| Autosave bookId on draft writes | Always passes `activeBookId` | Passes `bookId ?? null` (works) but draft scoping breaks when `hookBookId` is the only source | Same | Same |
| Half-published recovery | If step≥3 but node not live → reset to step 2 with toast | None | None | None |

Net: BA-16/17/18 are functionally the pre-fix BA-13/14/15. The same standardisation pass that fixed BA-13–15 will fix these.

## Plan

Apply the BP-02/BP-06 pattern to BA-16, BA-17, BA-18:

1. **Active book scoping**
   - Pull `bookId: hookBookId` from `useAuthorBook()`.
   - Compute `const activeBookId = bookId ?? hookBookId ?? null;`
   - Replace every `bookId ?? null` reference (autosave, publish, navigate returnTo) with `activeBookId`.
   - Add `activeBookId` to the hydration `useEffect` dependency array.

2. **Two-tier hydration**
   - After `loadBuilderDraft(...)` returns empty, run a fallback query:
     ```ts
     let q = supabase.from("author_nodes").select("content_json,status,microsite_url,activated_at")
       .eq("author_id", authorId).eq("node_id", "BA-1X").maybeSingle();
     if (activeBookId) q = q.eq("book_id", activeBookId);
     ```
   - If `status === "live" || activated_at || microsite_url`, set `content = { ...content_json, activated: true }` and `step = 3`.
   - Else if `status === "content_ready"`, set content and `step = 2`.

3. **Publishing reliability**
   - Add `const [isPublishing, setIsPublishing] = useState(false);`
   - In `handlePublish`: guard with `if (isPublishing) return;`, set true in try / false in finally.
   - Immediately before `publishNodeToSite`, call `autosaveBuilderDraft(...)` with current content + `_currentStep: 2`.
   - Pass `activeBookId` to `publishNodeToSite(authorId, nodeId, authorSlug, activeBookId)`.
   - Disable the Publish button while `isPublishing`.

4. **Generation timeout (BA-16, BA-17 only)**
   - Replace `supabase.functions.invoke("generate-ba16-affiliate", ...)` and `generate-ba17-bundles` with `invokeWithTimeout(name, body, 90000)` from `@/lib/invoke-with-timeout`.
   - BA-18 already uses this; leave as is.

5. **Half-published recovery**
   - In hydration: if `__draft.currentStep >= 3` but not actually live, force `step = 2` and `toast.info("Resuming from review — please publish again.")`.

## Files to edit
- `src/components/dashboard/builders/ba16/BA16Builder.tsx`
- `src/components/dashboard/builders/ba17/BA17Builder.tsx`
- `src/components/dashboard/builders/ba18/BA18Builder.tsx`

No edge function or DB migration changes required — all three nodes (`BA-16`, `BA-17`, `BA-18`) already have working generators and readiness rules.

Approve and I'll switch out of plan mode and apply the edits in one pass.