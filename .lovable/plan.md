# Full workflow audit: author sign-in to reader purchase

I walked the whole chain in code and against live data: sign in, Abby, adding a book, all 28 modules, publishing, and where each published module lands for a reader. Most of it works. Below is every place the chain breaks, and the fix for each.

## What is broken

### 1. Three modules can never go live (confirmed in live data)
Social Media, Special Editions and Book Sales show 0 live records across the whole platform. Publishing rejects them with an error before it gets a chance to attach their finished file, so the author clicks Publish and nothing happens. Two Social Media records are also stuck mid-generation forever.

### 2. Two modules are published but invisible to readers
Email Marketing has no public destination at all. Fundraising has a public page but no way for anyone to give.

### 3. Four modules have working pages that nothing links to
Media & PR, JV Partnerships, Sponsors and Author Website each have a real page, but no link anywhere on the author's site points to them. Only someone typing the address can find them.

### 4. Buttons that go nowhere when a field is empty
- Affiliates links to `#` (does nothing) when no link is saved.
- Podcast shows the title with no Listen button when no link is saved.
- Special Editions falls back to the author homepage instead of the product.
- Retreat and Conference fall back to the newsletter box instead of booking.

### 5. Social Media is sold as a product
It is documented as never-public, but it slips through the filters and renders as a buyable card with a checkout button.

### 6. Dead ends inside the portal
- A book awaiting approval shows a greyed-out "Pending Approval" button with no explanation and nowhere to go.
- If the analysis step loses the book reference, the author sees "please reload" and nothing else.
- Several dashboard loads fail silently: a blank list, no error, no retry. My Books already does this correctly and is the pattern to copy.
- A legitimate owner can be told "this book does not belong to this author" with no way to resolve it.

## What I will do

**Unblock publishing (highest priority)**
- Move the asset check so the file is built or derived first, and only then refuse if it genuinely does not exist. This alone unblocks Social Media, Special Editions and Book Sales.
- Return a plain-language reason on the button when publishing is refused, naming the missing piece and how to add it.
- Auto-clear generation records stuck longer than 5 minutes so the builder is usable again instead of spinning forever.

**Guarantee every live module has a reader destination**
- Add a single check that no module can be marked live unless it resolves to one of: a checkout, an enquiry form, or an external link the author supplied.
- Link the four orphaned pages from the author's site (Media & PR and JV Partnerships under a Press & Partners block; Sponsors under Events; Author Website from the top navigation).
- Give Fundraising a working give/enquire action.
- Decide Email Marketing explicitly: it is a behind-the-scenes engine, so it is excluded from the live-destination rule rather than given a page.

**Remove every empty-field dead end**
- Affiliates, Podcast, Special Editions, Retreat and Conference: when the author has not supplied a link, fall back to the enquiry form, never to `#`, and never to an unrelated section.
- Add Social Media to the non-public exclusion list so it stops rendering as a buyable product.

**Fix the portal dead ends**
- "Pending Approval" becomes an explanation plus a contact-support action.
- The analysis screen gets a Back to My Books action instead of "please reload".
- Ownership failures explain the mismatch and offer support.
- Replace silent failures in the dashboard and Abby loaders with the error-plus-retry pattern already used in My Books.

**Verify**
- Run a scripted pass that publishes each of the 28 modules on a test book and confirms each one lands on a page with a working buy or enquire action. Report the result per module.

## Technical notes

- `save-author-node/index.ts:401-410` — the `ADOPTER_NODES` 422 fires before `deriveLibraryAsset` at line 410; invert that order, then re-check.
- `author_nodes` rows with `status='generating'` older than 5 minutes get reset to `content_ready`.
- New shared helper `resolvePublicDestination(node)` used by both the publish gate and every public renderer, so the portal and the page can never disagree.
- `AuthorSite.tsx:81` `WORK_WITH_ME_EXCLUDED` gains `BP-03`; new sections for BA-15/BA-18/YR-28; `AuthorSubscribeSection.tsx:64`, `AuthorAboutSection.tsx:113-118`, `AuthorEventsSection.tsx:55`, `CollectorsEditionCard` fallbacks all route to the `author-site:enquire` event.
- Checkout itself is sound: `create-checkout-session` prices inline from `price_usd`, so the missing `stripe_price_id` values seen in the data are not a problem.
- `MyBooks.tsx:249-277` CTA map, `AnalyseBookGate.tsx:26-30`, `AuthorDashboard.tsx:332-357/392-394`, `BuildMyBusiness.tsx:118-120` for the dead-end and silent-failure fixes.
