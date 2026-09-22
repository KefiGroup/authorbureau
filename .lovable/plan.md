# Fine-tune Pauline's author page

## What I found

Pauline has exactly **two** books saved in the system right now:

| Book | Price | Amazon link | Bestseller badges | Proof screenshot |
|---|---|---|---|---|
| Be SUCKcessful | $8.99 | yes | #1 Top New Release, #1 Amazon Best Seller | yes |
| Invest Like Buffett: Value Investing for Parents | none | none | none | none |

"Value Investing for Women" does not exist in the system at all. You'll add it through the portal, so this plan does not create it.

That explains what looks wrong on the page:

- The top of the page features **Invest Like Buffett** as "The Book", even though the bestseller with the proof, badges and Amazon link is **Be SUCKcessful**.
- The top bar still shows a price (**$4.99**) that doesn't match the $8.99 on the book itself, and it contradicts the price-free button we just put in the hero.
- Only 2 books show because only 2 exist.

## What I'll change

1. **Feature the bestseller.** The book shown at the top becomes the author's strongest book: the one with bestseller badges and proof, falling back to one with a price and an Amazon link, then to the newest. For Pauline that makes Be SUCKcessful the headline book.
2. **One consistent price story.** The sticky top bar button becomes plain "Get the Book", matching the hero, so no mismatched price ($4.99 vs $8.99) is ever shown.
3. **Show the other books clearly.** Under the featured book, a small "Also by Pauline Teo" line lists her other titles as links, so a second or third book is visible from the top of the page without scrolling.
4. **Ready for the third book.** Because the featured book is chosen by quality signals rather than by position, adding "Value Investing for Women" in the portal will slot it in automatically, appear in the books section and in the "Also by" line, with no further code change.

## Technical notes

- `src/pages/AuthorSite.tsx`: replace the `heroBook` resolution (currently `whatsInsideSourceBookId` or the first book) with a scoring pick (badges/proof > price + amazon_url > newest `published_at`), keeping the curated `author_context` book as an override when one is explicitly set. Drop the price from `buyCta`, keeping the link to the hero book's page.
- `src/pages/author-site/AuthorHeroSection.tsx`: add the "Also by" list beneath the featured-book block, linking to `/{authorSlug}/{book.slug}`; hidden when the author has only one book.
- No database or schema changes; the third book is entered through the portal.
