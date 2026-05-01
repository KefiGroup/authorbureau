## Bug

The author bio renders as "Specialist,who previously served..." (missing space after the comma) on product microsite pages like `/pauline-teo/home-study`.

## Root Cause

The whitespace-around-punctuation normalization lives in `src/lib/stripHtml.ts` (lines 13–18). The hero page `/pauline-teo` was fixed because `AuthorAboutSection.tsx` calls `stripHtml(author.bio_long || author.bio_short)`. But several product/book microsite templates render the bio with a bare `.replace(/<[^>]+>/g, "")` (or read `bio_short` raw), which strips tags but does NOT normalize comma spacing.

## Files to Fix

All of these render an author bio without `stripHtml()`:

1. **`src/pages/AuthorProductPage.tsx`** (the page in the bug report — `/pauline-teo/home-study`, `/coaching`, `/consulting`, etc.)
   - Line 392: `const authorBio = author.bio_short || "";` → wrap in `stripHtml(...)`.

2. **`src/pages/MicrositePage.tsx`** (book microsite "About the author" sections)
   - Line 759: `(data.author.bio_long || data.author.bio || "").replace(/<[^>]+>/g, "")` → `stripHtml(data.author.bio_long || data.author.bio || "")`.
   - Line 1267: `const authorBio = author.bio || author.bio_long || "";` → wrap in `stripHtml(...)`.
   - Line 1526: same as 1267.

3. **`src/pages/AuthorBookPage.tsx`** (`/:authorSlug/:bookSlug` page, "About the Author" section ~line 982)
   - Line 497: `(book.author_bio || authorProfile?.bio_short || "").replace(/<[^>]+>/g, "")` → `stripHtml(book.author_bio || authorProfile?.bio_short || "")`.

Each file already imports from `@/lib/...`; we just add `import { stripHtml } from "@/lib/stripHtml";` where missing.

## Out of Scope (intentionally not changed)

- Builder previews (`BP04Builder.tsx`, `YR21Builder.tsx`, `ProfileEditor.tsx`) keep the bare regex — those are author-facing edit previews, not public product pages, and the user only reported public pages.
- Webinar pages (`WebinarRegistrationPage.tsx`, `WebinarIndexPage.tsx`) render `bio_short` as plain text without stripping; they're not in the reported bug. We can include them if you want full coverage — say the word.

## Verification

After the change, `/pauline-teo/home-study`, the book microsite, and `/pauline-teo/<book-slug>` should all show "Specialist, who previously served..." with the correct space. No DB migration, no edge-function change, no risk to counters.

## Why Not Fix at the Data Layer

The source bio text in the DB likely contains the missing-space artifact (an AI-generation quirk). Fixing it once in the read-side helper (`stripHtml`) means every renderer gets the fix automatically — but only if every renderer actually calls `stripHtml`. This plan completes that contract for the public pages.
