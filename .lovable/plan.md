## Auto-generate digital-product covers that match the book

### Problem
The current workbook cover is a generic SVG template (dark navy, gold accent). It looks nothing like the actual book — e.g. *Be SUCKcessful* has a phoenix, glowing sky, hand-script title, gold-foil typography. Every digital product (workbook, home-study, course, special edition, etc.) should visually emulate the book it derives from, so the pair reads as a matching set.

### Solution overview
Generate each digital-product cover with **Lovable AI Gateway image editing** (`google/gemini-2.5-flash-image`), using the **real book cover as the reference image** and a prompt that:
- preserves the book's palette, typography style, illustration mood
- replaces the title with the product's title (e.g. "The Be SUCKcessful Workbook")
- adds a small, tasteful "COMPANION WORKBOOK" / "HOME STUDY COURSE" / etc. ribbon
- keeps a 3:4 portrait ratio

The generated PNG is uploaded to Storage and the public URL is saved on `author_nodes.cover_image_url`. The microsite then renders the real cover image instead of the SVG fallback.

### 1. New edge function — `generate-product-cover`
`supabase/functions/generate-product-cover/index.ts`

Inputs: `{ authorNodeId, bookId, productKind: 'workbook'|'home-study'|'course'|'special-edition'|..., productTitle, productSubtitle?, authorName }`

Steps:
1. Resolve author + book via `_shared/resolve-user.ts` and `_shared/resolve-author-id.ts` (book ownership through `get-author-book` pattern).
2. Fetch the book's `cover_image_url` (skip gracefully if missing → fall back to SVG).
3. Build a kind-specific prompt, e.g. for workbook:
   > "Create a companion workbook cover that matches the visual style, color palette, illustration, and typography of the attached book cover. Title: '{productTitle}'. Subtitle: '{productSubtitle}'. Author: '{authorName}'. Add a small elegant 'COMPANION WORKBOOK' ribbon at the top. Portrait 3:4. High detail, print-ready, no text artifacts."
4. POST to `https://ai.gateway.lovable.dev/v1/chat/completions` with the book cover URL as `image_url` input and `modalities: ["image","text"]`.
5. Decode the returned base64 PNG, upload to Storage bucket `product-covers` at `{authorId}/{authorNodeId}.png`, get public URL.
6. Update `author_nodes.cover_image_url` (new column) with the URL.
7. Return `{ success, status, message, cover_url }`.

`verify_jwt = false`, service-role bypass for RLS, 60s timeout, retries via `callAiGateway`.

### 2. Storage bucket + DB column
- New public Storage bucket `product-covers` (read-public, author-scoped write via service role only).
- Migration: `ALTER TABLE author_nodes ADD COLUMN IF NOT EXISTS cover_image_url text;`

### 3. Hook generation into the builder lifecycle
In each product builder's "Generate" / "Activate" path (BP-06 workbook first, then BP-07 home-study, BP-08 special-edition, BP-09 course, etc.), after the content JSON is saved:
- If `cover_image_url` is empty AND book cover exists → fire-and-forget call to `generate-product-cover`.
- Also expose a manual **"Regenerate cover"** button in the builder preview tab so authors can re-run it after editing the title.

Single shared client helper: `src/lib/generate-product-cover.ts` so all builders call it the same way.

### 4. Microsite rendering
In `src/pages/MicrositePage.tsx → WorkbookSalesPage` (and the other product page renderers):
- If `data.node.cover_image_url` exists → render it as the workbook cover image, paired with the book cover (existing tilted composition).
- If missing → fall back to the existing `WorkbookCoverArt` SVG (no regression).

Apply the same pattern to the other product page components (`SalesPage` for home-study / special-edition, course microsite, etc.).

### 5. One-time backfill
Small admin-only script / edge function `backfill-product-covers` that loops through `author_nodes` where `cover_image_url IS NULL` and the parent book has a cover, calling `generate-product-cover` for each. Rate-limited to ~1/sec.

### 6. Memory rule
Add `mem://features/product-cover-generation` documenting:
- Always derived from the book cover via Nano banana edit
- Stored on `author_nodes.cover_image_url` in `product-covers` bucket
- SVG `WorkbookCoverArt` is fallback only
- Regenerate button required in every product builder

### Files touched
- **New**: `supabase/functions/generate-product-cover/index.ts`
- **New**: `supabase/functions/backfill-product-covers/index.ts`
- **New**: `src/lib/generate-product-cover.ts`
- **New migration**: add `cover_image_url` column + `product-covers` bucket
- **Edit**: `src/pages/MicrositePage.tsx` — workbook + sales page renderers prefer real cover
- **Edit**: each product builder (BP-06, BP-07, BP-08, BP-09) — auto-trigger + manual regenerate button
- **New memory**: `mem://features/product-cover-generation`

### Out of scope
- Re-generating book covers themselves (book covers come from the author, untouched).
- Audiobook cover (BA-11 already has its own art pipeline).
- Lead-magnet visuals (handled by existing lead-magnet design templates).
