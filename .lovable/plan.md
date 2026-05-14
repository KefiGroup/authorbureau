## Problems on `/pauline-teo/be-suckcessful` and its product pages

1. **"Be SUCKcessful Product Ladder" appears as a buyable card.** BA-17 (Bundles) is a back-office value-ladder map, not a SKU.
2. **"Work With Me" nav link is dead** on the book page — `/pauline-teo#services` anchor doesn't exist on book routes.
3. **No navigation on microsite/product pages** (e.g. `/audiobook`). Reader hits a dead-end with no header, no breadcrumb, no way back to the book or author.
4. **Free Workbook ($0)** shows "Coming Soon — Notify Me" because no Stripe price. Should be "Get Free", not a payment block.
5. **Services are all treated as buyable.** Coaching, Speaking, Mastermind, Retreats etc. are not self-serve checkouts — they're inquiries.

---

## Plan — UX-only changes (no DB / commerce edits)

### A. Split the book page into 3 reader sections

File: `src/pages/AuthorBookPage.tsx`

**1. Available Formats** (self-serve, instant delivery)
- Kindle, Hardcover, Paperback (Amazon links, unchanged)
- BA-11 Audiobook → Buy Now
- BP-06 Workbook → Buy Now if priced > $0, else **"Get Free"** CTA (routes to microsite, no Stripe call)
- BP-07 Home Study → Buy Now

**2. Courses & Membership** (self-serve, recurring/digital products)
- BA-10 Online Course → Buy Now
- BA-12 Membership → Buy Now / Subscribe

**3. Work With Pauline** (high-touch, inquiry-based — never Buy Now)
- YR-19 1-on-1 Coaching
- BA-13 Group Coaching
- YR-20 Big Ticket Consulting
- YR-21 Speaking
- YR-22 Corporate Training
- YR-23 Mastermind
- YR-24 Retreat
- YR-26 Conference
- YR-27 Fundraising

Each card shows title, 1–2 line description, and a single **"Contact Pauline"** button that opens `<ServiceInquiryForm>` (already exists, used on author page) prefilled with `serviceType` = the node label. No price, no waitlist modal, no Stripe.

**4. Hide entirely from reader view** (author-facing nodes):
- BA-15 Media & PR, BA-16 Affiliates, BA-17 Bundles, BA-18 JV Partnerships, YR-25 Certification, YR-28 Sponsors

Implementation: replace the current single `buyableNodes` filter with three explicit groups (`FORMATS`, `COURSES_MEMBERSHIP`, `WORK_WITH`) keyed by `node_id`. Render three labelled sections in that order. Free items use a small `<GetFreeCTA>` instead of `<BuyNowButton>`. Inquiry items use a new `<InquireCTA>` wrapper that opens `ServiceInquiryForm`.

### B. Fix the "Work With Me" nav link

File: `src/components/public/AuthorBrandedNav.tsx`

- When rendered on a book or microsite route (detect via `useLocation`), point "Work With Me" to `/{authorSlug}/{bookSlug}#work-with-me` and ensure the new section in (A) carries `id="work-with-me"`. On the author page, keep `/{authorSlug}#services` unchanged.
- Same treatment for "Free Quiz".

### C. Add nav + breadcrumb to every microsite/product page

This intentionally **overrides the old "no nav header on microsites" rule**, which was written for cold-traffic landing pages. Cross-browse from the book page now demands orientation.

Files: `src/pages/MicrositePage.tsx`, `src/pages/microsite/AudiobookPage.tsx`

- Mount `<AuthorBrandedNav>` at the top of every microsite (with the same gold "Get the Book — $X" CTA used on the book page).
- Add a slim breadcrumb strip: `Pauline Teo › Be SUCKcessful › Audiobook` — each segment a link. (`AuthorBreadcrumbs` already exists in `src/components/public/`.)
- Keep `MicrositePoweredByFooter` as-is.
- Remove the "no nav header per brand rules" comment in `MicrositePage.tsx`.

### D. Update the design rule

- `mem://ux/public-microsite-rendering-standards` and the Core line in `mem://index.md` ("Public Microsites: No nav header") → replace with: **"Microsites carry the author-branded nav + breadcrumb back to the book page. Footer always shows 'Powered by Authors Bureau'."**

---

## Out of scope

- No DB / Stripe / commerce code changes. BA-17 etc. stay "live" in the registry — we just don't render them as reader products.
- No re-design of the audiobook microsite body (Sprint 65 already shipped that).
- No change to the author page layout.

## Files touched

- `src/pages/AuthorBookPage.tsx` — three-section split, free-CTA, inquiry-CTA, hidden author nodes
- `src/components/public/AuthorBrandedNav.tsx` — context-aware Work-With-Me anchor
- `src/pages/MicrositePage.tsx` + `src/pages/microsite/AudiobookPage.tsx` — author nav + breadcrumb
- `mem://ux/public-microsite-rendering-standards` + `mem://index.md` — rule update
