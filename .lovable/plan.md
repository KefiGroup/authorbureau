# Audit review + fix plan

## Verdict on the audit

I verified the highest-impact claims against the actual codebase and database. The audit is **substantially correct**. Confirmed in code/DB:

- **BUG-04 / BUG-05 (Stripe not connected)** — `author_profiles` for `pauline-teo` has empty `stripe_account_id`, `stripe_onboarding_complete=false`. The dashboard is telling the truth — Stripe Connect was never finished. This is a user action, not a code bug.
- **BUG-14 (sales funnels in Draft)** — Only the `BP-02 free-gift` funnel is `live`. `BP-01`, `BP-07`, `BP-09`, `BA-14` are all `draft`. Confirmed in `funnels` table.
- **BUG-21 (Workbook link skips Stripe)** — Confirmed in `src/pages/author-site/AuthorBookFormatsList.tsx`. The Workbook and Bundle rows use `microsite_url` as the link target. They never route through `ProductCTA` / `BuyNowButton`, so Stripe checkout is impossible from the author page formats list.
- **BUG-18 (Thank-you page has no Buy button)** — Confirmed in `src/pages/ThankYouPage.tsx`. It only renders an "Amazon" CTA, and only if `book.amazon_url` is set. No Workbook / Home Study upsell.
- **BUG-19 (Thank-you blank flash)** — Confirmed: full-screen spinner with no skeleton during initial fetch.
- **BUG-22 / BUG-23 (book slug and missing products)** — Confirmed `books` table has no row for `pauline-teo`. The trailing-hyphen slug and the "only Amazon button" symptoms are downstream of that.
- **BUG-11 / BUG-20 (email sender unverified)** — Platform/domain action by Pauline, not a code change.

I do **not** agree with one framing point: BUG-04 is described as possibly a "display bug." It is not — the DB confirms Stripe is not connected. The Connect Settings UI is correct.

## What I will fix in code (this sprint)

Five focused changes that unblock the revenue loop end-to-end:

### 1. Workbook + Bundle must open Stripe checkout (BUG-21)
**File:** `src/pages/author-site/AuthorBookFormatsList.tsx`

Replace the plain `<Link>` rows for `BP-06` (Workbook) and `BA-17` (Bundle) with `ProductCTA` so they go through the same 4-state matrix as the product cards (live → BuyNowButton → Stripe checkout). Keep Kindle / Paperback / Audiobook as-is.

This single change makes the $2.99 Workbook actually purchasable.

### 2. Thank-you page upsell (BUG-18)
**File:** `src/pages/ThankYouPage.tsx`

After opt-in, fetch the author's live `BP-06` (Workbook) and `BP-07` (Home Study) nodes and render a `ProductCTA` for the cheapest live one as the primary "next step." Keep the Amazon CTA as a secondary link if `amazon_url` exists. This gives every opt-in a direct path to a paid product.

### 3. Thank-you skeleton (BUG-19)
**File:** `src/pages/ThankYouPage.tsx`

Replace the full-screen spinner with an inline skeleton that matches the final layout (avatar, headline, CTA shape) so first paint is not blank.

### 4. Book detail page must surface products (BUG-23)
**File:** `src/pages/author-site/AuthorBookFormatsList.tsx` is already where formats render. I will additionally extend the book detail page (`AuthorSubpageResolver` book route) to render the same product strip used on the author home — Workbook, Home Study, Audiobook, Bundle — using `AuthorProductCard` so a reader landing on `/pauline-teo/be-suckcessful` sees and can buy every Be SUCKcessful product, not just Amazon.

### 5. Trailing-hyphen slug (BUG-22)
**File:** the slug-generation utility used when a book row is created.

Trim leading/trailing hyphens after slugifying. One-line fix in the slug helper. (Will also offer to backfill the existing bad slug once Pauline's book row exists in `books`.)

## What I will NOT change in code (and why)

These need Pauline / platform action, not a code edit:

- **BUG-11 / BUG-20** — Verify sender domain. This must be done in Marketing Hub → Settings; no code change will bypass the domain verification requirement.
- **BUG-04 / BUG-05** — Connect Stripe. The DB shows it isn't connected. Pauline must complete Stripe Connect onboarding from Connect Settings.
- **BUG-14** — Publish the sales funnels. They are deliberately in Draft; only the author can publish.
- **BUG-15 (view counter)**, **BUG-08 (CRM stage progression)**, **BUG-12 (0 leads despite Active)** — These are real but separate engine bugs. I will queue them as a follow-up sprint rather than bundle them here, because they each need their own investigation (analytics events, ABBY pipeline cron, opt-in form linkage). Including them in this sprint would dilute the revenue-loop fix.
- **BUG-03 / BUG-10 (wrong book attribution on products and Author's Page campaign)** — Real, but the root cause is data (which `book_id` is stamped on `author_nodes` / campaign rows), not UI logic. Needs a targeted data audit + a `book_id` reconciliation pass. Queued as a follow-up.
- **BUG-01, 02, 06, 07, 09, 13, 16, 17** — Medium/low priority counters, copy, and missing-stage prompts. Worth fixing, but not revenue blockers. Queued.

## Order of operations

1. Fix files 1–5 above.
2. Tell Pauline the exact 3 platform actions she must take (verify sender, finish Stripe Connect, publish the BP-07 funnel) — without those, the code fixes still won't transact money.
3. After she confirms Stripe + sender are done, run a live end-to-end test (opt-in → thank-you → buy Workbook) and report the result.

## Expected outcome

- Workbook and Bundle become buyable from the author page.
- Thank-you page becomes a real conversion surface, not a dead end.
- Book detail page stops being an Amazon-only page.
- Once Pauline finishes Stripe Connect and verifies her sender, the loop is end-to-end functional.
