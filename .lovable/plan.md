# Sprint B Queue — fix B-05 through B-08

All four are frontend/presentation issues. Root causes confirmed in code.

## B-05 — Author hero "Get the Book" price wrong ($4.99 vs nav $0.99)
**Cause:** In `src/pages/AuthorSite.tsx` the sticky nav CTA is built from a resolved `heroBook` (`booksWithProducts.find(b => b.id === whatsInsideSourceBookId) || booksWithProducts[0]`), but `AuthorHeroSection` independently uses `booksWithProducts[0]`. When those differ, the two prices diverge.

**Fix:**
- In `AuthorSite.tsx`, compute `heroBook` once and pass it to `AuthorHeroSection` (new `heroBook` prop).
- In `src/pages/author-site/AuthorHeroSection.tsx`, use the passed `heroBook` for the CTA instead of `booksWithProducts[0]`, so the hero and nav always show the same book + price.

## B-06 — $10,000 work card reads generic "Membership" with no real title
**Cause:** In `AuthorBookPage.tsx` `renderWorkCard` falls back to the hardcoded label `"Membership"` when a work node has no `personalised_name`/`node_name`. A generic high-ticket YR node then shows "Membership" with a `$10,000 / Join for $10,000` button.

**Fix:** Replace the hardcoded `"Membership"` fallback with a node-type-aware label from `NODE_TO_PRODUCT[n.node_id]?.label` (e.g. "Big Ticket Consulting", "Mastermind"), falling back to a neutral "Programme" — so the card is always named meaningfully.

## B-07 — Fundraising node shown as a purchasable "$100 Join" product
**Cause:** `YR-27` (Fundraising) is in `WORK_WITH_NODE_IDS`, so a priced fundraising node renders through `renderWorkCard` with a `Join for $100` BuyNowButton — a donation surface presented as a checkout product with no context.

**Fix:** Remove `YR-27` from `WORK_WITH_NODE_IDS` and add it to `HIDDEN_NODE_IDS`, consistent with the other outbound/B2B nodes already hidden on the reader book page (sponsors YR-28, certification YR-25, etc.). Fundraising is not a reader "Work With Me" product.

## B-08 — Speaking page breadcrumb last crumb is the stale "Author | Book" artifact
**Cause:** In `src/pages/MicrositePage.tsx`, `pageTitle = data?.node?.personalised_name || nodeName` passes the raw `personalised_name` ("Pauline Teo | Be SUCKcessful", a page-title artifact) straight into the breadcrumb.

**Fix:** Wrap it with the existing `formatPublicLabel(data?.node?.personalised_name, nodeName)` helper (already used elsewhere for exactly this), which strips the `Author | Book` pipe artifact and falls back to the canonical node name ("Speaking"). This also cleans the document/meta title.

## Verification
- Confirm hero CTA price equals nav CTA price on an author page.
- Confirm no work card renders the literal fallback "Membership"; confirm no fundraising card appears on the book page.
- Confirm the Speaking microsite breadcrumb ends in "Speaking" (no pipe artifact).
