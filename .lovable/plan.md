## Goal

Make the AI-generated product cover (the phoenix workbook for Be SUCKcessful) actually visible everywhere it should be — public microsite, builder, library, and node card — and extend auto-generation to the other product builders.

## What's broken / missing today

1. **Microsite** — the cover exists in the DB and storage, but `get-microsite-page` strips `cover_image_url` from the response, so the public workbook page falls back to the plain navy SVG.
2. **BP-06 builder** — no preview of the generated cover, no way to regenerate it.
3. **Author Library** — asset rows show only the file (PDF/DOCX), no cover thumbnail.
4. **Brand Products Hub / node cards** — no cover thumbnail.
5. **BP-07 / BP-08 / BP-09** — auto-generation is not wired into their publish hooks; only BP-06 fires it.

## Plan

### 1. Fix microsite (the critical one)
- `supabase/functions/get-microsite-page/index.ts` — add `cover_image_url: node.cover_image_url` to the `node:` block of the response payload.
- Redeploy. Microsite already prefers `data.node.cover_image_url` over the SVG, so the phoenix cover will appear immediately.

### 2. Show generated cover in BP-06 builder
- In `src/components/dashboard/builders/bp06/BP06Builder.tsx`, add a small "Cover" preview tile in the published/preview tab:
  - If `cover_image_url` exists → show the image (3:4 aspect, ~180px wide, rounded shadow).
  - If not → show a "Generate cover" button.
  - Always show a "Regenerate cover" button beneath that calls `generate-product-cover` with `force: true`, then refreshes the node row.
- Toast on success/failure; disable button while in flight.

### 3. Show cover thumbnail in Author Library
- `src/components/library/AssetRow.tsx` (and the parent that fetches rows) — load `cover_image_url` from the matching `author_nodes` row keyed by `(author_id, node_id, book_id)`.
- Render a 48×64 thumbnail on the left of each row when present; fall back to the existing icon.

### 4. Show cover thumbnail on node cards
- Brand Products Hub card (the component that renders the BP-06 etc. tiles in the dashboard) — when `cover_image_url` exists, render it as a small badge/thumbnail in the card header. Falls back cleanly to current icon.

### 5. Extend auto-generation to BP-07, BP-08, BP-09
- Mirror the existing BP-06 publish hook: in each builder's publish/activate path, fire-and-forget call to `generate-product-cover` with the appropriate `productKind` (`home-study`, `course`, `bundle`) when `cover_image_url` is empty and the parent book has a cover.
- Pass `productTitle`, `productSubtitle`, `authorName` consistently.

### 6. One-time backfill for existing live nodes
- New short-lived edge function `backfill-product-covers` that loops through `author_nodes` where `cover_image_url IS NULL`, `node_id IN ('BP-06','BP-07','BP-08','BP-09')`, parent book has a cover, and calls `generate-product-cover` for each (rate-limited ~1/sec). Admin-only.
- After it runs, can be left dormant or removed.

## Files touched

- `supabase/functions/get-microsite-page/index.ts` (fix)
- `supabase/functions/backfill-product-covers/index.ts` (new)
- `src/components/dashboard/builders/bp06/BP06Builder.tsx` (cover preview + regenerate)
- `src/components/dashboard/builders/bp07/...`, `bp08/...`, `bp09/...` (publish-hook calls)
- `src/components/library/AssetRow.tsx` + parent loader (thumbnail)
- Brand Products Hub card component (thumbnail)
- `src/lib/generate-product-cover.ts` (already exists; expose `force` flag if missing)

## Out of scope

- Re-generating book covers themselves
- Audiobook (BA-11) covers — uses ElevenLabs pipeline
- Lead-magnet visuals — separate system
- Editing the generated cover by hand (only "regenerate")
