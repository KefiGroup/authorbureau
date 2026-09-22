# Author Journey Audit — Part 3: Admin Approval and Beyond

Understood: waiting for admin approval is a legitimate step, not a fault. The only real problem in finding 6 is how it is explained to the author, not that the gate exists. This part audits the approval step itself and then continues the author journey on an approved book.

## Reframed finding 6

The gate stays. What gets rewritten is the message: today Lead Magnets, Social Media, Online Course and Media and PR say "complete your book profile first" and send the author to a page where nothing can be done. It should say the book is awaiting review, show when it was submitted, and offer a way to contact support instead of a dead-end button.

## Step A — Admin approval path (new)

Signed in as an admin, walk the Books area:

1. The new book "Value Investing for Women" appears in the Pending list with a submitted date.
2. Approve it. Confirm the badge turns Approved, the book goes live, and the approval is recorded in the audit log.
3. Check the author's side: does Pauline get any notification or email that the book was approved?
4. Try "Request changes" on a second pass to see what the author sees.
5. Note anything missing for a real reviewer: no way to see the manuscript, cover or Abby's plan from the review screen, no reason field, unclear what approving actually unlocks.

## Step B — Author journey resumed on the approved book

With the book approved, continue where part 2 stopped:

1. Abby's plan regenerates and maps the 28 streams for the new book.
2. Open each of the 28 modules in turn: generate, edit, save, publish.
3. Check every published module on the public site: buy under $100, enquire at $100 and above, no dead ends.
4. Confirm the "1 of 28 products built" count and the "your book" placeholder now read correctly.

## Step C — Remaining part 2 items

Re-test after approval to see which were only side effects of the pending state:

- "Analyse this book" doing nothing
- Abby's plan saved as roughly 1,000 characters so the card reads "0 sections"
- Earnings page failing behind the scenes
- Blank CRM, Email Hub and Payout Settings pages

## Output

Findings appended to the same report at /mnt/documents/author-journey-audit-findings.md, split into blocking, confusing and working. No code changes until you have read them, apart from the finding 6 wording if you want that done in the same pass.

## Technical notes

- Approval is `books.approval_status` plus `published_at`; the admin screen is `src/components/admin/BooksTab.tsx`. Approval will be done through the admin UI, not by editing the database, so the real path is exercised.
- Author-side gating reads `hasBook`, which is false until `published_at` is set; that is the source of the misleading copy in `BP02Builder.tsx` and the sibling builders.
- Test book 45e945ae-5542-409c-a9c1-47a60981fd7f stays until you say otherwise.
