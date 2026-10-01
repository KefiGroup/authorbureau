# Live re-audit of authorsbureau.com (after publish)

The audit runs on the live site, signed in as Pauline, and covers all three of her books: Invest Like Buffett, Value Investing for Women and Be SUCKcessful. Every page load bypasses the browser cache so we see the new version. This is a look-only audit: nothing is published, regenerated, deleted or bought.

## What gets checked (the 8-point release gate)
1. **Modules:** all 28 module links for each book open on that book, name that book, and never mention another book. YR-28 now names the book.
2. **Counts:** the dashboard, Book Hub and book picker show the same number for each book (11, 27, 28 → 66/84).
3. **Review & Publish:** opens on the book you last opened and shows only that book's live links. "All books" appears only when you pick it.
4. **Funnels, CRM, Library, Marketing Hub and Revenue:** each one follows the selected book. Older items with no book show as "Unattributed". Social counts are labelled clearly.
5. **Live status:** every module marked Live opens a working public page, with no draft, "coming soon" or 404. This covers BP-05, BA-10, BA-13 and BA-11 (Audiobook must read "Ready to Build" for Invest Like Buffett).
6. **Policy wording:** speaking pages are enquiry-only with no fees. Social is copy-and-post-yourself with no auto-posting claims. Offers of $100 or more show "By application". Payment wording says Authors Bureau collects payments and the author keeps 92%.
7. **Public pages:** each book's public links open properly, with no prices and no other book's content.
8. **Admin side:** signed in as your admin account, the Daily Audit (including the new book check), Errors, Authors and Books tabs all load. I'll also run the daily audit on demand and confirm everything is green.

## If anything fails
I fix it straight away and recheck it in the preview, under the standing "clear ALL" rule. Then I'll ask you to publish again, and I re-run just the failed points on the live site.

## What you get
A pass/fail table per book and per point, with screenshots behind each result, written in plain language.

## Technical details
- Playwright against https://authorsbureau.com with `?cb=<timestamp>`. Sessions are minted for Pauline (ef23c521…) and the admin (5fd84779…) and restored through localStorage on the live origin.
- Text is checked for other books' titles on every builder route `/dashboard/book/{id}/build/{node}` × 3 books, which is 84 routes.
- Each live node's public URL is fetched and checked for a 200 response, plus a check for "coming soon", "draft" and "$" text.
- The daily audit is triggered from the admin session.
