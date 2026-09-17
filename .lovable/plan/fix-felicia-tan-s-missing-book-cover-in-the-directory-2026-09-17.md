# Fix Felicia Tan's missing book cover in the directory

## What's wrong

Felicia Tan's directory card shows a broken image where her book cover should be. Her three books are listed in the site's built-in author data with picture paths that don't exist any more (they point at `.jpg` files, while the real covers are `.png`). Her author photo entry has the same problem, but a separate lookup already rescues the photo, so only the book cover shows as broken.

The actual cover images are fine: all three covers ("To Baby With Love", "Lost And Found", "A Gift From Heaven") exist both in the project and in storage and load correctly elsewhere on the site.

## The fix

1. Point Felicia's three book covers and her photo in the built-in author data at the real image files that already ship with the project, instead of the broken paths.
2. On the directory page, use the same cover lookup the book cards already use, so a stale entry can never produce a broken image there again.

No design or layout changes; the card keeps its current look, just with the cover showing.

## Technical notes

- `src/data/authors.ts` lines 40, 51, 65, 78 use literal `/src/assets/...` strings which Vite does not resolve at runtime; replace with ES imports of `src/assets/to-baby-with-love-cover.png`, `lost-and-found-cover.png`, `gift-from-heaven-cover.png`, and `felicia-tan.png`.
- `src/pages/Directory.tsx`: add a `staticCoverMap` keyed by book slug (mirroring `coverMap` in `src/components/BookCard.tsx`) and use `staticCoverMap[b.slug] || b.coverImage` when mapping static authors' books.
