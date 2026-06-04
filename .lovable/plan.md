# Close Remaining Public Audit Items

## Re-verification result (32 findings)
A full code re-check against the audit confirms **26 findings already fixed**. After DB inspection, two more are effectively resolved already, leaving **4 small code fixes**.

### Already resolved during this review (no work needed)
- **D-01 — "Entreprenuer" typo:** A full DB sweep (`author_profiles`, `books`) finds zero instances of the misspelling. Veronica Tan's tagline already reads "Entrepreneur". Nothing to fix.
- **H-04 — Homepage pricing:** Per your decision, the section stays hidden (it is deliberately commented out as `{/* PRICING SECTION HIDDEN */}`). Accepted as an intentional exception.

### Remaining work (4 items)

**1. S-03 — Speaking page talk titles render as "Signature Talk"**
The real, well-written talk titles already exist in the database (`content_json.signature_talks[].talk_title`), e.g. "Be SUCKcessful: Every Master Was Once a Disaster". The public Speaking page just reads the wrong key.
- File: `src/pages/MicrositePage.tsx` line 3385
- Change `const name = yrStr(t?.title || t?.name, "Signature Talk");` to also check `talk_title`: `yrStr(t?.talk_title || t?.title || t?.name, "Signature Talk")`.
- No DB change needed — the data is already correct and richer than the audit's suggestions.

**2. H-03 — 28-stream diagram appears too far down the homepage**
Currently the "One Book. 28 Revenue Streams" section is the 3rd block, after the comparison table.
- File: `src/pages/Index.tsx`
- Move the 28-stream diagram section (≈ lines 213–248) up so it appears right after the Hero / Reality-Check, before the "Why Authors Bureau" comparison table (≈ line 167). Pure JSX reorder, no logic change.

**3. D-04 — Author with no published books shows a blank books area**
The `ComingSoonScreen` component exists but is never used.
- File: `src/pages/AuthorProfile.tsx` (≈ line 313, the `author.books.length > 0 &&` books section)
- Add an `else` branch rendering a clean empty-state ("Coming Soon") block when the author has zero books, so the page never looks broken. Reuse the existing visual language (clock icon + message) consistent with `ComingSoonScreen.tsx`.

**4. A-03 — "18 Products & Services" hero stat is meaningless to readers**
- File: `src/pages/author-site/AuthorHeroSection.tsx` (≈ lines 202–206)
- Replace the raw product-count stat with a reader-meaningful label. Preferred: show the average reader rating / review count when available, otherwise fall back to "Revenue Streams Built" or simply drop the count and keep the other hero stats. Keep it within the existing stat-strip styling.

## Technical notes
- All four are frontend/content-layer changes except they touch only presentation logic; no schema, RLS, or edge-function changes.
- S-03 fix is a one-line key addition; verify on Pauline's `/pauline-teo/be-suckcessful/speaking` page that the three real titles render.
- After changes, the only outstanding audit item is H-04 (intentionally deferred by your decision).

## Out of scope
- H-04 homepage pricing (kept hidden by decision).
- S-04/S-06 image-based speaker hero photo and real client logos — current text/placeholder slots satisfy the audit; uploading real assets is a separate content task.
