# 03 · AB Reader Journey Map

_Version: 2026-05-01 · Verified by Sprint 53 (audit + targeted rewrite)_

**Source(s) of truth:**
- `mem://features/readers-bureau-system-and-portal`
- `mem://features/lead-magnet-microsite-conversion-specs`
- `mem://architecture/commerce-engine-v1`

---

End-to-end flow from discovering an author to becoming a customer / fan.

## Stage 1 — Discovery

The reader finds the author via:

- **Search** → Authors Bureau microsite ranks for the book's keywords.
- **Social** → BP-03 post links to lead magnet OR microsite.
- **Podcast** → BA-14 episode in their feed (Spotify / Apple).
- **Press** → BA-15 placement.
- **Affiliate** → BA-16 referral link.
- **JV partner** → BA-18 cross-promo email.

## Stage 2 — Lead capture (Funnel Engine)

1. Reader lands on lead-magnet microsite (4 stages: Gate → Quiz → Results → Next Step).
2. Submits email → `enroll-subscriber` writes to `crm_contacts` + `email_lists` enrolment.
3. CRM score +10 (quiz completed).
4. Lead magnet result delivered immediately (HTML + email follow-up).

## Stage 3 — Nurture (Email Engine)

1. Reader receives BP-01 welcome sequence step 1 within minutes.
2. Subsequent steps deliver on cadence (typically 3–10 emails over 2–4 weeks).
3. Each open (+2) / click (+5) / sales-page visit (+5/+10) bumps the score.
4. ABBY may insert nudged sends based on behaviour (re-engagement, hot-lead alert).

## Stage 4 — First purchase

1. A sequence step OR microsite CTA points to a paid offer.
2. Reader clicks the Buy Now button → `create-checkout-session` → Stripe Checkout (platform Stripe account, MoR).
3. `verify-purchase` confirms synchronously; `process-purchase` completes async.
4. Reader receives confirmation email (author-branded From if author has set sender preferences).
5. CRM score +30; stage advances to Customer (≥ 81).

## Stage 5 — Onboarding into the product

Per node:

- **BP-06 / BP-07 / BA-10** → enrolled in Course Engine OR Thinkific.
- **BA-12** → recurring subscription begins; `membership_content` access.
- **YR-19 / YR-23 / YR-24** → Sessions Engine schedules calls / cohort.
- **BP-09 (book)** → download link OR shipping detail collection.

## Stage 6 — Reader Bureau (Teal experience)

1. Reader signs up for Readers Bureau account → switches from "purchase one book" to "track my reading life".
2. Joins reading clubs (`reading_club_members`), participates in challenges (`reading_challenges`), earns badges (`reader_badges`).
3. Discover other authors → loops back to Stage 1 for a new author.

## Stage 7 — Upsell / repeat

- Bundles (BA-17) shown at checkout for related products.
- Email sequences pitch next-tier offers based on score.
- VIP tier (score = 100) receives premium offers (YR-19 / YR-20).

## Pricing visibility rule

> Public microsites **never display prices**. The price appears only at checkout, after the reader clicks Buy. This protects the author's positioning and maintains the "browse → choose to buy" flow.

> Em-dashes never appear on public surfaces — DB trigger strips them.
