## Goal

Keep up to **3 generated cover designs** per product node so the author never loses a prior cover, and let them pick which one is "active" (the one shown publicly on the microsite).

## Business rule (final)

- **Auto-generate on publish**: only fires when the node has zero saved designs (current behavior — unchanged).
- **Regenerate**: always allowed manually. Each click produces a NEW design and stores it.
- **History cap = 3**: the most recent 3 designs are kept. When a 4th is generated, the **oldest non-active** design is dropped (the active one is never auto-deleted).
- **Active design**: exactly one of the saved designs is "active" at any time. Its URL is mirrored to `author_nodes.cover_image_url` (what the microsite + library + dashboard read today — no consumer changes needed).
- **Pick / switch**: author can click any thumbnail in the 3-up gallery to make it active. Switching is instant (DB update only, no AI call).
- **Newly generated** design becomes active by default.
- Storage files for dropped designs are deleted from the `product-covers` bucket to avoid orphan files.

## Scope: applies to all 4 product covers

BP-06 Workbook, BP-07 Home Study, BP-08 Special Editions, BP-09 Live Audience Toolkit.

---

## Technical changes

### 1. Database (migration)

Add `cover_image_history jsonb` to `author_nodes`:

```
[
  { "url": "...", "created_at": "2026-05-08T...", "is_active": true },
  { "url": "...", "created_at": "...", "is_active": false },
  { "url": "...", "created_at": "...", "is_active": false }
]
```

- `cover_image_url` (existing column) continues to mirror whichever entry has `is_active: true`. No consumer code changes.
- Default `'[]'::jsonb`. No RLS changes (table policies already cover it).

### 2. Edge function `generate-product-cover`

- After successful AI generation + storage upload:
  1. Read current `cover_image_history`.
  2. Mark all existing entries `is_active: false`.
  3. Push new entry `{ url, created_at: now, is_active: true }`.
  4. If length > 3, drop the **oldest non-active** entry and delete its file from the `product-covers` bucket.
  5. Write updated `cover_image_history` AND set `cover_image_url` to the new active URL.
- Existing "already-generated, skip unless force" guard stays only for the auto-publish path: when `force === false` AND history already has ≥1 entry, return the active one without calling AI (prevents duplicate generation on republish). Manual regenerate from UI always passes `force: true`.

### 3. New edge function `set-active-product-cover` (tiny)

- Inputs: `authorNodeId` (or `authorId + nodeId + bookId`) and `url` (must already exist in history).
- Validates ownership via service role + the requesting user's JWT.
- Flips `is_active` flags in `cover_image_history` and updates `cover_image_url`.
- Returns `{ success, cover_url }`.

### 4. UI — `ProductCoverPreview.tsx`

Replace single thumbnail with a 3-slot gallery:

```
[ active large 160px ]  [ thumb #2 ]  [ thumb #3 ]
                        [ thumb #2 ]  [ thumb #3 ]
```

- Active slot has a gold ring + "Active" badge.
- Clicking an inactive thumb → calls `set-active-product-cover`, optimistic swap.
- Empty slots show a dashed placeholder.
- Below the gallery: **Generate new design** button (enabled until history has 3; after 3, label becomes **Replace oldest with new design** so the consequence is explicit).
- Same component is already used by BP-06/07/08/09, so all four nodes inherit the new UX automatically.

### 5. No changes needed in

- `MicrositePage.tsx`, `get-microsite-page` edge function — they continue to read `cover_image_url`.
- `AssetRow.tsx`, Brand Products Hub cards — same.
- BP-06/07/08/09 builders — `<ProductCoverPreview/>` props are unchanged.

---

## What the user sees

1. Publishes BP-06 → first cover auto-generates → appears as active.
2. Opens success screen → sees Cover Design card with 1 large thumb + 2 empty slots.
3. Clicks "Generate new design" → second design appears, becomes active, first design demoted to inactive thumb.
4. Generates a 3rd → all 3 slots filled.
5. Clicks "Replace oldest with new design" → oldest inactive is dropped, new one is active.
6. Clicks any inactive thumb → instantly becomes active (no AI call, no cost).

## Out of scope (this plan)

- Manual upload of a custom cover image.
- Naming / labeling individual designs.
- A/B testing different covers on the public page.
- Retroactively backfilling history for nodes that already have a single `cover_image_url` — those will be migrated by writing one `is_active: true` entry into history on first read (handled inside the edge function).