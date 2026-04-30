## Verification of Section 7 bugs on `/pauline-teo`

### Bug 19 — "26 Products Available" → "28" — **NOT A BUG (label is misleading)**

The hero stat is **not** the platform's total node count. It's `Math.max(allProducts.length, liveProductsCount)` in `AuthorHeroSection.tsx`, where `liveProductsCount` = the number of live `author_nodes` rows for this author (excluding BP-01/BP-02 lead-magnet types). Pauline currently has 26 live products. Hard-coding "28" would falsely claim every author has every node activated.

The reporter's confusion is the **label** — "Products Available" reads as "available on the platform" rather than "this author offers". Recommended fix: rename to something unambiguous.

**Fix:** In `src/pages/author-site/AuthorHeroSection.tsx` line 166, change copy from `Products Available` → `Products & Services` (matches the established split-audience vocabulary).

### Bug 20 — Products show "Free" instead of real price — **CONFIRMED, CRITICAL**

Verified in DB. `AuthorLearnSection.tsx` (line 55) and `AuthorServicesSection.tsx` only read `node.content_json?.price`, but each builder writes prices under a **different key**:

| Node | Actual price key in `content_json` |
|---|---|
| BA-10 Online Course | `suggested_price_usd` |
| BA-12 Membership | `monthly_price_usd` (+ `tiers[].price_monthly`) |
| BP-07 Home Study | `price` ✅ (already works — Pauline = $9.90) |
| BP-05 Webinar | typically free; no price field |
| YR-19 1:1 Coaching | `packages[].price` (per-package) |
| YR-23 Mastermind | `tiers[].price` |
| YR-25 Certification | `certification_levels[].price` |
| BA-11 Audiobook | `price` ✅ |

So all of Pauline's paid products fall through to "Free". Confirmed values are missing/under different keys for: SUCKcess Circle, Practitioner Certification, SUCKCESS Blueprint, Mastermind, 1:1 Coaching.

**Fix:** Add a single shared helper `getNodePriceLabel(node)` in `src/pages/author-site/types.ts` (or a new `node-price.ts`) that:

1. Checks (in order): `content_json.price`, `suggested_price_usd`, `monthly_price_usd` (suffixed `/mo`), then min-of `tiers[]`/`packages[]`/`certification_levels[]` price → returns `"$297"`, `"$27/mo"`, `"From $1,500"`.
2. Returns `null` when no price exists.
3. Webinar (BP-05) and lead magnets keep showing "Free" only when the helper returns null **and** the node type is in a known-free set; otherwise show no badge instead of misleading "Free".

Wire the helper into:
- `src/pages/author-site/AuthorLearnSection.tsx` (replace lines 55, 85–87)
- `src/pages/author-site/AuthorServicesSection.tsx` (line 166 area)

**Note:** This is a display-only fix. Buy Now / checkout already pulls authoritative pricing from each builder's own table via `BuyNowButton`, so checkout is unaffected.

### Bug 21 — "Specialist ,who" formatting — **CONFIRMED, DATA-ONLY**

The string lives in `author_profiles.bio_short` for Pauline (not in any component template). No code change can fix it generically without risking false-positive edits to legitimate content.

**Fix:** Two-part:
1. **One-off data fix** for Pauline via migration: `UPDATE author_profiles SET bio_short = replace(bio_short, 'Specialist ,who', 'Specialist, who') WHERE author_slug='pauline-teo';`
2. **Defensive sanitizer** in `src/lib/stripHtml.ts` (already used by `AuthorAboutSection.tsx`): after stripping HTML, collapse `\s+,` → `,` and `\s+\.` → `.` so future authors who paste in similar typos render cleanly. Low risk: only normalizes whitespace before punctuation.

### Files to change

- `src/pages/author-site/AuthorHeroSection.tsx` — relabel stat (Bug 19)
- `src/pages/author-site/types.ts` (or new `src/pages/author-site/node-price.ts`) — add `getNodePriceLabel` helper (Bug 20)
- `src/pages/author-site/AuthorLearnSection.tsx` — use helper (Bug 20)
- `src/pages/author-site/AuthorServicesSection.tsx` — use helper (Bug 20)
- `src/lib/stripHtml.ts` — collapse stray space-before-punctuation (Bug 21)
- New migration: one-off `bio_short` typo fix for Pauline (Bug 21)

### Out of scope (kept consistent with Core rules)

No prices added to public microsite product pages — only to the author profile cards that already show prices (where rule has always allowed inline pricing on the author profile, distinct from per-product microsites).
