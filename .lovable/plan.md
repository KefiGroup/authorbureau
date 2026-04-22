

## Diagnosis (confirmed against DB)

```
node_id  status         microsite_url  activated_at
BA-13    content_ready  NULL           NULL
BA-14    content_ready  NULL           NULL
BA-15    live           …/press        2026-04-22
BA-16    live           …/affiliates   2026-04-22
BA-17    live           …/bundles      2026-04-22
BA-18    live           …/partners     2026-04-22
```

BA-13 and BA-14 generated content but never had `publishNodeToSite` called successfully — the `microsite_url` is NULL, so `MicrositePage` falls through to the "Coming Soon" fallback. Pauline can't recover today because:

- Either the loader sends her to step 3 (success screen) with no Publish button
- Or she lands on step 2 but the previous publish click silently failed (no retry surfaced)

The fix is the same pattern already proven on BA-15/16/17/18: **always land authors with missing `microsite_url` on the Review step (step 2) and surface a clear "Re-publish to My Site" banner above the tabs.**

## Plan

### Fix 1 — Loader respects `microsite_url`, not just `isLive`

In both `BA13Builder.tsx` (line 58) and `BA14Builder.tsx` (line 58), change the step-resume logic so that a draft is only treated as "live" when it actually has a microsite_url. We already have `__draft.isLive` and `__draft.micrositeUrl` available from `loadBuilderDraft`. Rewrite as:

```ts
const isActuallyLive = __draft.isLive && !!__draft.micrositeUrl;
setStep(isActuallyLive ? 3 : 2);
setContent({ ...normalised, activated: isActuallyLive });
```

(If `loadBuilderDraft` doesn't already return `micrositeUrl`, we'll fetch it in the existing select — it's cheap.)

### Fix 2 — "Re-publish to My Site" banner on Review step

In the step 2 block of both builders, add a small AbbyCard banner ABOVE the Tabs when `content` exists but the node was previously generated without a successful publish. Use the same look as the Publish button below:

```tsx
{step === 2 && content && (
  <div className="space-y-4">
    <AbbyCard>
      <p className="text-sm">
        Your content is ready, but it isn't live on your site yet. 
        Click below to publish your {nodeLabel} page.
      </p>
      <Button onClick={handlePublish} className="mt-3">
        Re-publish to My Site <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </AbbyCard>
    {/* existing AbbyCard summary + Tabs + ExportPackageCard + Publish button */}
  </div>
)}
```

The existing `handlePublish` (lines 89-100 BA-13, 86-97 BA-14) already awaits `publishNodeToSite` before advancing step — that's correct, no change there.

### Fix 3 — Loader-side check ensures `loadBuilderDraft` returns `micrositeUrl`

Verify `src/lib/builder-autosave.ts` `loadBuilderDraft` selects `microsite_url` from `author_nodes`. If not, add it to the select and expose as `micrositeUrl` on the returned object. This is a one-line change.

## Files touched

- **Update** `src/components/dashboard/builders/ba13/BA13Builder.tsx`
  - Loader: resume to step 2 when `!micrositeUrl` (line 58)
  - Step 2: add Re-publish banner above Tabs when content exists but not live (around line 128)
- **Update** `src/components/dashboard/builders/ba14/BA14Builder.tsx`
  - Loader: same change (line 58)
  - Step 2: same Re-publish banner (around line 125)
- **Update (if needed)** `src/lib/builder-autosave.ts`
  - Ensure `loadBuilderDraft` returns `micrositeUrl` from author_nodes select

## Verification

1. Reload `/node-builder/BA-13` as Pauline → lands on step 2 with a yellow "Re-publish to My Site" banner above tabs.
2. Click Re-publish → button awaits `publishNodeToSite`; on success advances to step 3 with the live URL displayed; on failure shows toast and stays on step 2.
3. DB: `author_nodes` row for BA-13 now has `microsite_url=https://authorsbureau.com/pauline-teo/group-coaching` and `status=live`.
4. Visit `/pauline-teo/group-coaching` → renders the curriculum/sales-page content (no more Coming Soon).
5. Repeat for BA-14 → `/pauline-teo/podcast` renders the podcast concept and episode list.
6. After successful publish, reloading the builder lands directly on step 3 (success screen) — no banner shown.

## Scope

Pure frontend. No DB migration. No edge function changes. No regeneration required for Pauline's existing content.

