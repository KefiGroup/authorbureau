# Fixing Pauline Teo's author page (and every author page)

## What is actually broken

I opened the live page as a visitor and checked the data behind it.

**1. The books are invisible to visitors — a permissions bug, not missing data.**
Pauline has two published books in the system (Be SUCKcessful, Invest Like Buffett: Value Investing for Parents), both with covers. But when a visitor's browser asks for them it gets a "permission denied" error, because one recently added field (the second bestseller-proof image) was never opened up for public reading. One bad field makes the whole request fail, so the page silently shows zero books.

That single bug explains most of what you saw: no book section, no book heading, no covers, no bestseller screenshots, no "Get the Book" button, and a stats strip that has lost its "Books Published" number. **This affects every author page and the directory, not just Pauline's.**

**2. The page opens with nothing to buy.**
With books gone, the only thing above the fold is a free quiz. A visitor who came to buy a book or join a class has no path.

**3. The hero photo frame is a short rectangle** that crops tall portraits at the head.

**4. The stats strip speaks to authors, not readers.** "Revenue Streams Built: 18" is internal jargon and, worse, tells a buyer the author is selling 18 things.

**5. "Work With Me" dumps 26 cards in one wall,** many near-duplicates ("Be SUCKcessful Collective" twice, "Author Website", "Affiliate Programme"), several of them back-office items no customer should see, with prices attached. That is the "prices scare people off" problem: a stranger meets a price before they have any reason to care.

## The fix

**Restore the books (root cause)**
- Grant public read on the missing field so the books query succeeds again; verify Pauline, Felicia, Bob, Veronica and the directory all show covers again.

**Rebuild the top of the page to sell the book**
- Hero: book cover beside the author, book title, one-line promise, primary button "Get the Book", secondary "Get the Free Starter Kit".
- Show the Amazon bestseller screenshots as proof right under the hero where they are persuasive, not buried.
- Fix the photo frame so heads are never cropped (taller frame, top-anchored).
- Replace the stats strip with reader-facing proof: Books Published, Readers Served / Testimonials, Bestseller badge. Drop "Revenue Streams Built".

**Calm the offers down**
- Curate "Work With Me" to at most 3 to 4 headline offers, ordered free to paid, with the rest moved under a "More ways to work with Pauline" expander.
- Hide internal and duplicate entries (author website, affiliate programme, duplicate collective cards) from the public page.
- Lead each card with the outcome and the audience, not the price. Keep prices only on the self-serve, low-priced items; high-touch offers stay enquiry-only, as already agreed.
- Add clear section headings so the page reads: who she is, the book, the proof, what you get, how to work with her.

## Technical notes

- Root cause: `books.bestseller_proof_url_2` has no `anon` SELECT grant, so `BOOK_PUBLIC_COLUMNS` selects return `42501 permission denied` for anonymous visitors. Fix with a column grant migration; re-check every column in `src/lib/book-columns.ts`.
- `AuthorSite.tsx` `loadAuthorSite()` swallows the query error (`booksRes.data || []`) — add error surfacing so a failed books read is visible instead of rendering an empty page.
- Hero changes in `src/pages/author-site/AuthorHeroSection.tsx` (photo classes `w-40 h-48 md:w-52 md:h-64 object-cover`, CTA block, stats strip).
- Offer curation in `AuthorWorkWithMe` / the live-node list, respecting the enquiry-only node rules (YR-20/21/22/23/24/26 enquiry, YR-19 and BA-13 priced).
