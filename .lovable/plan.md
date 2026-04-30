# Bugs 12, 13, 14 — Book Microsite Fixes

## Bug 12 — Trailing-hyphen book slugs (SEO)

**Root cause.** `generateSlug()` in `supabase/functions/save-book/index.ts` slices the title to 50 chars and only strips leading/trailing hyphens *before* the slice in some flows. The current order can still leave a trailing `-` when the slice falls right after a separator (e.g., a long title ending with a punctuation char that becomes `-`). The existing live row `be-suckcessful-` confirms this.

**Fix.**
1. **Code** — In `supabase/functions/save-book/index.ts`, reorder `generateSlug` so the trailing/leading hyphen strip runs *after* the 50-char slice (it already does in the current file, but we will also collapse double-hyphens after slicing and run the strip a second time defensively):
   ```ts
   return title.toLowerCase()
     .replace(/[^\w\s-]/g, "")
     .replace(/\s+/g, "-")
     .replace(/-+/g, "-")
     .slice(0, 50)
     .replace(/-+/g, "-")
     .replace(/^-+|-+$/g, "");
   ```
2. **Apply the same hardening** to the other slug generators that feed public URLs:
   - `supabase/functions/sync-author-profile/index.ts` (author slug)
   - DB function `public.generate_unique_author_slug()` (already strips, leave as-is — verify only)
   - DB function `public.generate_course_slug()` (already strips — verify only)
3. **Data migration** — One-time SQL migration to fix existing rows:
   ```sql
   UPDATE public.books
      SET slug = regexp_replace(slug, '-+$', '')
    WHERE slug ~ '-$';
   ```
   Targets the single known row (`be-suckcessful-` → `be-suckcessful`) and any others that may exist. Safe because the slug-uniqueness check would have prevented a clean `be-suckcessful` from existing alongside it (verified via DB query — no conflict).

   `BookSlugRedirect.tsx` already handles `/books/:slug` redirects, so any external links to the old trailing-hyphen URL still resolve via the directory fallback.

## Bugs 13 & 14 — "Get the Full Experience" cards lack descriptions and Learn More links

**Location.** `src/pages/AuthorBookPage.tsx` lines 792–839 (the `buyableNodes` grid).

**Current behaviour.** Each card renders only: title, price, Buy Now. No description, no link to the product microsite.

**Available data (verified via DB query).** Each `author_nodes` row already carries:
- `tagline` — short 1-line hook (e.g., "Every Master Was Once a Disaster…")
- `content_json.description` — long-form sales copy
- `delivery_url` — already points to the individual product microsite (e.g., `https://authorsbureau.com/pauline-teo/sponsors`). This is the correct "Learn More" target.

**Fix.**
1. **Extend the `buyableNodes` query** (line 408–415) to also select `tagline`, `content_json`:
   ```ts
   .select("id, node_id, node_name, personalised_name, price_usd, currency, delivery_url, tagline, content_json")
   ```
   Update the `buyableNodes` state type accordingly.
2. **Rewrite each card** (lines 812–834) to:
   - Show title (unchanged).
   - Show a **1–2 sentence description**: prefer `tagline`; if absent, take the first ~160 chars of `content_json.description` (stripped of HTML, ending at sentence boundary).
   - Show price (unchanged).
   - Show **two CTAs stacked**:
     - Primary: **Learn More** → `<Link to={new URL(delivery_url).pathname}>` (internal SPA nav, falls back to `#` if no delivery_url).
     - Secondary: **Buy Now** (existing `<BuyNowButton>`, restyled as outline/ghost).
3. **Helper.** Add a small `extractCardDescription(node)` helper next to `NODE_TO_PRODUCT` that returns `tagline || truncate(stripHtml(content_json.description), 160)`. Reuse `stripHtml` from `src/lib/stripHtml.ts`.
4. **Empty-field guard.** If neither tagline nor description exists, fall back to the generic node label (e.g., "Sponsorship & Exhibitor Programme by {authorName}") so the card never looks broken — consistent with the "empty fields must hide cleanly" microsite rule.

## Files touched

| File | Change |
|---|---|
| `supabase/functions/save-book/index.ts` | Harden `generateSlug` (post-slice strip) |
| `supabase/functions/sync-author-profile/index.ts` | Same hardening for author slug fallback |
| `supabase/migrations/<new>.sql` | `UPDATE books SET slug = rtrim(slug,'-')` for trailing-hyphen rows |
| `src/pages/AuthorBookPage.tsx` | Extend buyableNodes query + state type; redesign card with description + Learn More link |

## Out of scope

- The "Go Deeper" section (lines 841+) already links to product pages — no change needed.
- No DB schema change required (tagline + content_json already exist on `author_nodes`).
- No edge-function redeploy needed beyond `save-book` and `sync-author-profile`.
