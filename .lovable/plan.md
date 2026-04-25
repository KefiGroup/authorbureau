## Diagnosis (verified against DB + code)

I queried the database and read the relevant code. Each "Critical" / "Content" / "Missing" issue maps to a concrete root cause, not a guess.

### C1 — All products show "Coming Soon — Notify Me"
- `ProductCTA` decides "live vs coming-soon" using `stripeReady`, which `AuthorWorkWithMe` computes from `author.stripe_connected_account_id && stripe_onboarding_complete`.
- Pauline's row: `stripe_connected_account_id = NULL`, `stripe_onboarding_complete = false`.
- **But** per the `commerce-engine-v1` memory and `RequireStripeConnected.tsx`, Authors Bureau is now **Merchant of Record** — authors don't connect Stripe; the platform's `STRIPE_SECRET_KEY` does all charges. The old gate is stale and now blocks 100% of revenue.

### C2 — "What's inside" says wrong book
- `AuthorWhatsInsideSection` always receives `primaryBook={booksWithProducts[0]}` (hard-coded first book) regardless of which book the highlights actually belong to. With two books published, the label points at index 0 even when content was sourced from the other book.

### C3 — "Be SUCKcessful Workbook" appears under "Invest Like Buffett for Parents"
- `AuthorBooksSection` filters formats per-book via `getFormatsForBook` → `nodeBelongsToBook`, which checks `content_json.book_id` / `content_json.book_slug`. **If neither is present, it returns `true` for every book** (line 152 of `types.ts`).
- The `author_nodes` table has a real `book_id` column (set correctly: `e5b857ac…` = Be SUCKcessful), but the query in `AuthorSite.tsx` line 140 doesn't `SELECT book_id` and the matcher never reads it. Net effect: every workbook/audiobook/bundle whose `content_json` lacks book metadata is rendered under **all** books.

### P1 — Bio shows Amazon breadcrumb
- DB check: `bio_long` and `bio_short` on `author_profiles` are correct, professional bios. The breadcrumb text is coming from `books.author_bio` (per-book column), which `AuthorAboutSection` likely prefers when the book record has it. Need to verify which field the About section reads and prefer `author_profiles.bio_long` → `bio_short` first; fall back to `books.author_bio` only when both are blank. Also overwrite the contaminated `books.author_bio` value for Pauline's two books.

### P2 — "Email Marketing" card on Work With Me
- BP-01 (Email Marketing) is `status='live'` on Pauline's account. `AuthorWorkWithMe`'s filter on `AuthorSite.tsx:266` excludes only `BP-08, BA-11, BP-06, BA-17`. BP-01 is internal automation infrastructure, not a reader product → must be added to the exclusion list.

### P3 — "Quiz Funnel" shows as paid product
- BP-02 (Lead Magnet) is `status='live'` and falls through the same filter. Lead magnets are already rendered in their dedicated `AuthorLeadMagnetsSection`; they must not also appear in Work With Me.

### P4 — Stats only show "2 Books Published"
- `AuthorHeroSection` only renders `totalBooks` and `totalProducts`. No reader / testimonial / social-proof counters exist. Need to surface real counts: live products, testimonials count, optional newsletter subscribers.

### M1 — No Privacy / ToS in microsite footer
- The site-wide `Footer.tsx` already has these, but the public author microsite uses `AuthorPageLayout` whose footer is just "Powered by Authors Bureau" with no legal links.

### M2 — No social follow links in footer
- Same root cause as M1 — microsite footer has no socials.
- DB schema check: there is **no `facebook_url` column** on `author_profiles` (only website / linkedin / twitter / instagram / youtube / amazon). Adding Facebook requires a column.

### M3 — Podcast section has no episode list / Spotify / Apple links
- `AuthorAboutSection` renders `podcastNodes` but doesn't expose Spotify / Apple URLs or episode listings. Need to add those fields and a small render block.

### M4 — Hero missing Instagram icon
- `AuthorHeroSection` already loops `SOCIAL_LINKS` including Instagram and YouTube — they only hide because Pauline's `instagram_url` and `youtube_url` are `NULL`. Pure data problem; we should also add a Facebook icon once the column exists.

---

## Plan

### Step 1 — Unblock revenue (C1)
- Treat the platform as Merchant of Record. Force `stripeReady = true` everywhere reader-facing (`AuthorWorkWithMe`, `AuthorServicesSection`, `AuthorLearnSection`, `AuthorEventsSection`, etc.).
- Keep the owner-no-stripe state inside `ProductCTA` only as a safety net for when no `STRIPE_SECRET_KEY` is configured platform-wide (rare).
- Verify `BuyNowButton` → `create-checkout-session` edge function uses the platform key (it does, per memory). No edge-function changes required.
- Result: every live node with a price renders a working "Buy Now" / "Enroll Now" button.

### Step 2 — Stop book cross-contamination (C2 + C3)
- `AuthorSite.tsx` line 140: add `book_id` to the `author_nodes` SELECT.
- `types.ts` `nodeBelongsToBook`: check the new top-level `book_id` field first, fall back to `content_json.book_id` / `book_slug`. **Stop returning `true` when no book identifier exists** — return `false` so unscoped nodes simply don't render under any specific book card. (They'll still show in author-level sections like Work With Me.)
- `AuthorWhatsInsideSection`: pass the book whose `content_json.highlights` was actually used (compute it in `AuthorSite.tsx` instead of always sending `[0]`). Hide section if highlights came from no specific book.
- Backfill: one-line UPDATE to set `content_json -> 'book_id'` from the row's `book_id` column for any live node where it's missing (defensive, helps any other reader of the field).

### Step 3 — Clean up "Work With Me" (P2 + P3)
- Extend the exclusion list on `AuthorSite.tsx:266` to `["BP-01","BP-02","BP-08","BA-11","BP-06","BA-17"]` and pull it into a named constant `WORK_WITH_ME_EXCLUDED_NODES` for clarity.

### Step 4 — Real bio (P1)
- `AuthorAboutSection`: prefer `author_profiles.bio_long` → `bio_short` → only fall back to `books.author_bio` when both are empty.
- Run a one-shot UPDATE clearing the contaminated `books.author_bio` strings for Pauline's two books so any other surface reading them also self-heals.

### Step 5 — Stats credibility (P4)
- Compute and pass to `AuthorHeroSection`: `totalProducts` (already present), `testimonialsCount` (length of testimonials array already loaded), `subscribersCount` (count from `email_subscribers` for this `author_id`, fallback hidden if 0).
- Render up to 4 stats: Books / Products / Testimonials / Readers (only show the ones > 0).

### Step 6 — Microsite footer (M1 + M2)
- Build a new `AuthorMicrositeFooter` rendered inside `AuthorPageLayout`, replacing the bare "Powered by" line. It contains:
  - Author social icons (Website, LinkedIn, Instagram, Facebook, YouTube, Twitter, Amazon) — same `SOCIAL_LINKS` pattern as the hero.
  - Legal links: Privacy Policy, Terms of Service, Terms of Sale (already-existing routes `/privacy`, `/terms`, `/terms-of-sale`).
  - Existing "Powered by Authors Bureau" line.
- Keep Authors Bureau's brand minimal so the author's identity stays primary.

### Step 7 — Add Facebook + podcast streaming fields
- Migration: add columns `facebook_url text`, `podcast_spotify_url text`, `podcast_apple_url text`, `podcast_rss_url text` to `author_profiles`.
- Add a `Facebook` icon to `SOCIAL_LINKS` in `AuthorHeroSection` and the new microsite footer.
- Surface the new podcast fields in `AuthorAboutSection`'s podcast block (Spotify + Apple buttons; if `podcast_rss_url` is provided, optionally show "Subscribe via RSS").
- Expose all four new fields in the Account Settings → Profile editor so authors can populate them.

### Step 8 — Verify & document
- Re-query Pauline's microsite end-to-end via DB after Step 1–7 lands; confirm:
  - Buy buttons live on BP-06 ($2.99), BA-11 ($14.99), YR-19, YR-20, YR-21, YR-22, YR-23, YR-25.
  - Workbook only under "Be SUCKcessful".
  - "What's inside the book — From Be SUCKcessful".
  - Footer shows Privacy + ToS + ToS-Sale + socials.
  - Email Marketing + Quiz Funnel no longer in Work With Me.
- Update `mem://architecture/commerce-engine-v1` to record that `stripeReady` is now derived from platform readiness, not author Stripe Connect.

---

## Files to touch

```text
src/pages/AuthorSite.tsx                 # SELECT book_id; new exclusion list; pass real primaryBook; pass stats
src/pages/author-site/types.ts           # nodeBelongsToBook hardening; book_id field
src/pages/author-site/AuthorAboutSection.tsx   # prefer profile bio; podcast streaming buttons
src/pages/author-site/AuthorHeroSection.tsx    # Facebook icon; expanded stats grid
src/pages/author-site/AuthorWhatsInsideSection.tsx  # already accepts primaryBook prop, no change beyond data
src/components/public/AuthorPageLayout.tsx     # render new footer
src/components/public/AuthorMicrositeFooter.tsx (new)  # socials + legal links
src/components/public/AuthorWorkWithMe.tsx     # always treat platform as stripeReady (remove gate)
src/components/commerce/ProductCTA.tsx         # treat stripeReady=true as default; reserve owner-no-stripe for true platform-key absence
src/components/commerce/BuyNowButton.tsx       # no change beyond Step 1 verification
src/pages/AccountSettings.tsx (and profile form) # surface facebook/podcast fields
supabase/migrations/<ts>_microsite_polish.sql  # new columns + content_json.book_id backfill + bio cleanup
```

## Out of scope
- No changes to Stripe products, prices, or checkout edge functions (already correct under the MoR model).
- No design freeze violations — additions reuse existing tokens.
- No new third-party connectors — RSS / Spotify links are plain URLs the author pastes.

Once approved I'll execute Steps 1–8 in one sprint.