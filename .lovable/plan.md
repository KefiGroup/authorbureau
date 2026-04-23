

# Status Audit — Reader Page Renderer Fix

Here's the truth on each of your four points, verified against code + DB.

## Item 1 — Wire reader page to published content
**STATUS: ✅ DONE (was already done, you may have remembered the bug)**

This was never the issue. The `get-microsite-page` edge function has always queried `author_nodes` and returned the full `content_json`. `MicrositePage.tsx` calls it on every page load via `AuthorSubpageResolver`. I re-confirmed against the DB: all 10 YR nodes for Pauline are `status=live` with rich `content_json` (packages, offers, signature_talks, membership_tiers, retreat_options, etc.), and the resolver does fetch them.

**The real bug was downstream**: the data was arriving in the browser but no template knew how to render it. Calling this "not querying the database" is technically inaccurate — but the user-visible symptom (blank page / placeholder) was identical, so I agree the *outcome* is what matters.

**Agree with the fix:** Yes — already shipped.

---

## Item 2 — Replace "Coming Soon" with actual generated content
**STATUS: ✅ DONE in the previous turn**

10 dedicated reader templates were added to `MicrositePage.tsx` (lines 2186–2818), one per YR node, each reading the exact content shape its builder writes:

| Node | Template | Reads |
|------|----------|-------|
| YR-19 | `CoachingPage` | `practice_title`, `packages[]`, `coaching_philosophy`, `discovery_call_script` |
| YR-20 | `BigTicketPage` | `offers[]`, `sales_conversation_guide`, `abby_summary` |
| YR-21 | `SpeakingPage` | `speaker_brand`, `signature_talks[]`, `fee_schedule` |
| YR-22 | `CorporateTrainingPage` | `programme_title`, `training_formats[]`, `learning_outcomes[]` |
| YR-23 | `MastermindPage` | `mastermind_title`, `membership_tiers[]`, `programme_promise` |
| YR-24 | `RetreatPage` | `retreat_title`, `retreat_options[]`, `transformation_arc` |
| YR-25 | `CertificationPage` | `certification_promise`, `modules[]`, `levels[]`, `badge_concept` |
| YR-26 | `ConferencePage` | conference fields |
| YR-27 | `FundraisingPage` | fundraising fields |
| YR-28 | `SponsorsPage` | sponsor fields |

Routing is wired (lines 223–232) and `GenericPage` is excluded for all 10 ids.

**Agree with the fix:** Yes — this was the right architectural call. One reusable `YRLayout` + `YRRightCard` keeps the 10 components consistent, and `yrStr/yrArr/yrLines` defensive helpers prevent white-screens if AI shape drifts.

---

## Item 3 — Replace generic "Get in Touch" with node-specific CTA
**STATUS: 🟡 PARTIALLY DONE — needs polish**

`YRRightCard` already routes by `actionType`:
- YR-20, 23 → "Apply Now" application form
- YR-21, 22, 28 → enquiry form  
- YR-19, 24, 25, 26, 27 → enquiry/optin form

But the form labels and headings are still generic ("Get in Touch", "Apply Now"). They are **not** specialised per node ("Speaker Inquiry", "Sponsorship Inquiry", "Retreat Booking"). Fields are also **not pre-populated** with author details or pricing context from the generated content.

**Agree with the fix:** Yes — needs a small follow-up pass to inject node-specific form headings + carry pricing/package context into the submission payload.

---

## Item 4 — "Enrol / Apply / Book / Donate" commerce button
**STATUS: 🟡 PARTIALLY DONE — gap remains**

`<BuyNowButton>` is integrated for **BA-10, BA-13, BA-14** (lines 942, 1008) — those nodes have full Stripe checkout via `author_nodes` price registry. The 10 new YR templates use `YRRightCard` which renders a CTA button, but:
- Falls back to enquiry form when `payment_link` is null (which is the case for **all 10 YR nodes for Pauline** — confirmed in DB: `payment_link: <nil>` everywhere).
- Does **not** route through `<BuyNowButton>` / `create-checkout-session`, so even if a price is set in `author_nodes.price_usd`, no Stripe checkout fires.

**Agree with the fix:** Yes, and this is the most important gap. The Commerce Engine v1 (per `mem://architecture/commerce-engine-v1`) already has the infrastructure — `author_nodes.price_usd`, `BuyNowButton`, `create-checkout-session`, dual-webhook — but YR templates aren't wired to it. They should be.

---

## What's Done vs. What's Left

| # | Claim | Status |
|---|-------|--------|
| 1 | Query DB for published content | ✅ Done (always was) |
| 2 | Render real content (Overview, Packages, Tiers, Curriculum) | ✅ Done last turn |
| 3 | Node-specific inquiry form (labels + pre-filled context) | 🟡 Generic forms still show |
| 4 | Stripe / commerce CTA on YR pages | 🟡 BuyNowButton not wired into YR templates |

## Proposed Follow-up (one focused pass, ~120 lines)

1. **Specialise `YRRightCard` headings & form copy per node** — pass `inquiryHeading`, `inquiryIntro`, `submitLabel` props from each YR template ("Book Pauline to Speak", "Apply for the Mastermind", "Become a Sponsor", "Reserve Your Retreat Seat", "Donate Now").
2. **Pre-fill submission context** — when the author submits, include the package/tier/talk title they were viewing, plus the displayed price, in the `inquiry` payload so Pauline knows which offer triggered it.
3. **Wire `<BuyNowButton>` into YR templates that have a `price_usd` in `author_nodes`** — show "Enrol" / "Book" / "Apply" Stripe checkout for YR-19 packages, YR-23 tiers, YR-24 retreat options, YR-25 certification levels. Falls back to enquiry form only when price is zero/null.
4. **Add a "Donate" variant** of `YRRightCard` for YR-27 fundraising that opens a Stripe payment link (uses the same `BuyNowButton` infra).

## Files touched
- `src/pages/MicrositePage.tsx` — extend `YRRightCard` props (~30 lines), pass per-node copy from each of the 10 templates (~5 lines each), add `<BuyNowButton>` branch when `price_usd > 0` (~25 lines).

## Out of scope
- Builder UI, edge functions, DB schema, RLS — all unchanged.
- Stripe Connect onboarding for Pauline — separate concern (she'd need a connected account for live commerce; currently `payment_link` is null because no Stripe price has been set on these YR nodes).

## Verification
1. `/pauline-teo/coaching` → "Book a Discovery Call" (not "Get in Touch") + Stripe checkout for the $X package if price set.
2. `/pauline-teo/speaking` → "Book Pauline to Speak" form, submission includes which signature talk.
3. `/pauline-teo/mastermind` → "Apply for the Mastermind" + tier price, BuyNow when configured.
4. `/pauline-teo/sponsors` → "Become a Sponsor" form with sponsorship tier context.
5. `/pauline-teo/fundraising` → "Donate Now" Stripe button.

