# Make BP-02 + BP-06 Social Pack Persistence Bulletproof

## Problem

In BP-02, after clicking **Generate Social Pack** in the Share tab, the AI returns successfully but the result is **never written to `author_nodes.content_json`**. It only lives in local React state via `setContent({ ...content, social_pack })`. The moment the user navigates away (or the page re-mounts), `loadBuilderDraft` returns the prior saved content **without** the social pack, so the UI appears to "jump back" and the work is lost.

Two contributing bugs:

1. **Edge function** `generate-bp02-social-pack` writes only to `cross_builder_pushes`, not to the node's `content_json`.
2. **Parent component** `BP02Builder.tsx` (line 1279) only updates local state in `onContentLoaded` — no `autosaveBuilderDraft` call. It also uses a stale-closure spread (`...content`) instead of a functional updater, which can drop concurrent edits.

BP-06 doesn't have a Share / Social Pack tab today, but we want the same persistence contract everywhere social packs / sub-assets get generated, so we make it a reusable pattern.

## Fix (BP-02 first, BP-06 audit second)

### 1. `SocialDistributionPack.tsx`
- Accept new optional props: `bookId: string | null` and `onPersist?: (socialPack) => Promise<void>`.
- After successful generation: call `onContentLoaded(socialPack)` **and then** `await onPersist?.(socialPack)`. Surface persistence errors via a toast (do NOT swallow).

### 2. `BP02Builder.tsx`
- Pass `bookId={activeBookId}` to `<SocialDistributionPack>`.
- Replace the inline `onContentLoaded` with a stable handler:
  ```ts
  const handleSocialPackLoaded = useCallback(async (socialPack) => {
    setContent((prev) => ({ ...(prev || {}), social_pack: socialPack }));
    if (!authorId) return;
    await autosaveBuilderDraft({
      authorId,
      nodeId: "BP-02",
      nodeName: "Lead Magnets",
      content: { ...(content || {}), social_pack: socialPack, _currentStep: step },
      currentStep: step,
      bookId: activeBookId ?? null,
    });
  }, [authorId, content, step, activeBookId]);
  ```
  Wire it as both `onContentLoaded` and `onPersist` (single source of truth).
- Remove the second redundant `<SocialDistributionPack>` instance at line 1656 if it isn't reachable, or wire it the same way.

### 3. `generate-bp02-social-pack/index.ts` (defence in depth)
- After parsing AI JSON, also merge into `author_nodes.content_json.social_pack` via `upsertAuthorNode` (same helper BP-06 generator uses), scoped by `author_id` + `book_id`. This guarantees persistence even if the client crashes between AI return and autosave.

### 4. BP-06 audit
- BP-06 has no Share/Social tab today, so no immediate regression. Confirm by grep — no `SocialDistributionPack` import.
- Document the contract: any builder that generates a sub-asset (social pack, marketing pack, distribution pack) **must** persist via `autosaveBuilderDraft` immediately after the AI returns. Add a short comment block at the top of `SocialDistributionPack.tsx` describing the `onPersist` contract so future builders (BP-03, BA-*, YR-*) follow it.

### 5. Verification
- Generate social pack on BP-02 → reload page → Share tab still shows the generated content (read from `author_nodes.content_json.social_pack`).
- Re-confirm BP-06 publish/save flow still works (no changes to its files).

## Files Touched

- `src/components/dashboard/builders/bp02/SocialDistributionPack.tsx` — add `bookId` + `onPersist` props, await persistence
- `src/components/dashboard/builders/bp02/BP02Builder.tsx` — `handleSocialPackLoaded` with autosave; functional setContent
- `supabase/functions/generate-bp02-social-pack/index.ts` — also write `social_pack` into `author_nodes.content_json` via `upsertAuthorNode`

No DB migrations. No changes to BP-06 source (audit only).

## Out of Scope

Rolling this pattern out to BA / YR builders — that's the next pass once BP-02 + BP-06 are confirmed solid.
