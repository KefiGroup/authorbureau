

# Plan — Per-node distribution + Stripe Connect Express payouts (8%)

## Audit of what already exists vs. what's missing

### Per-node delivery & purchase flow

| Node | What exists | Gap to close |
|---|---|---|
| BP-01 Email | Resend + GHL deploy, list-building only | None |
| BP-02 Lead Magnet/Quiz | Quiz microsite + email follow-up | None |
| BP-03 Social | Buffer scheduling | None |
| BP-04 Author Page | Public microsite | None |
| BP-05 Webinar | Register form + email reminders; Zoom link field | Optional paid registration via Stripe (deferred — leave free for now) |
| **BP-06 Workbook** | Stripe direct + PDF email delivery | **Add Amazon Paperback URL + Amazon Kindle URL fields; reader page shows 3 buttons** |
| BP-07 Home Study Course | Stripe + portal | None |
| BP-08 Special Editions | Stripe + Amazon link | Confirm both Amazon + direct PDF buttons render |
| BP-09 Book Sales | Amazon link + direct PDF Stripe | Add Kindle URL alongside paperback URL |
| BA-10 Online Course | Stripe + Thinkific deploy | None |
| BA-11 Audiobook | ACX + DistroKid distribute | None |
| BA-12 Membership | Stripe recurring | None |
| BA-13 Group Coaching | Stripe + Zoom | None |
| BA-14 Podcast | Transistor RSS | None |
| BA-15 Media/PR | Inquiry email | None |
| BA-16 Affiliate | Tracked links | None |
| BA-17 Upsells | Stripe one-time | None |
| BA-18 JV | Manual outreach | None |
| YR-19 Coaching | Stripe + Zoom | None |
| YR-20 Big Ticket | Stripe payment link | None |
| YR-21 Speaking | Inquiry → invoice | None |
| YR-22 Corporate Training | Inquiry → invoice + Zoom | None |
| YR-23 Mastermind | Stripe annual | None |
| YR-24 Retreats | Stripe deposit | None |
| YR-25 Certification | Stripe + portal + cert email | None |
| YR-26 Conference | Stripe ticket sales | None |
| **YR-27 Fundraising** | Currently has `deploy-yr27-to-stripe` (collects donations) | **Strip all Stripe; replace with External Donation Link + charity name; CTA opens external URL** |
| YR-28 Sponsors | Inquiry + Stripe sponsor pack | None |

### Payment & payout architecture

Already built (from prior approved sprint):
- `purchases`, `author_earnings`, `author_payouts_v2`, `payout_batches`, `author_payout_settings` tables
- `run-monthly-payouts` (CSV-based Wise/PayPal), `mark-payout-paid`, `generate-annual-statements`
- Author "My Earnings" UI + admin payouts page
- `platform_fee_percent = 0.05` in `platform_config`
- `create-checkout-session` charges AB master Stripe directly (Merchant of Record) — no `transfer_data`
- `verify-purchase` + `process-purchase` write `platform_fee_usd` and `net_usd` rows to `author_earnings`

Missing (this sprint):
- **Stripe Connect Express onboarding for payouts (not for collection)**
- Bump platform fee `0.05 → 0.08`
- Auto-transfer via Stripe on the 1st (replaces/augments the manual CSV flow for authors who choose Stripe payout)
- BP-06 three-option reader page
- YR-27 external donation only

## What we'll build

### 1. Platform fee → 8%
- Update `platform_config.platform_fee_percent` to `0.08`
- Update `DEFAULT_FEE` constants in `create-checkout-session`, `process-purchase`, `verify-purchase` to `0.08`
- All existing earnings calculations already read from config — no code restructure needed
- Tooltip copy updated in `MyEarnings` page

### 2. Stripe Connect Express as a 3rd payout method
- Repurpose existing `stripe-connect` edge function: rename action to "payout onboarding" (clearly labelled), creates an Express account with `capabilities: { transfers: { requested: true } }` only (no `card_payments`). Existing `stripe_account_id` + `stripe_onboarding_complete` columns reused.
- Add `payout_method = 'stripe'` option to `author_payout_settings` (already in default!) alongside existing `'wise'` and `'paypal'`
- Update `ConnectStripePage` (currently misleadingly says "you keep ~92%") → rebrand as **"Connect Payout Account (Stripe)"**:
  - Three tabs / methods: Stripe Express, Wise, PayPal — author picks one
  - Removes "this is required to publish paid products" framing (publishing is already ungated)
- Banner on My Earnings if no payout method connected: *"Connect a payout account to receive your earnings on the 1st of each month"*

### 3. Auto-transfers on the 1st (Stripe payout method)
- Extend `run-monthly-payouts`:
  - For authors with `payout_method='stripe'` AND `stripe_onboarding_complete=true` AND net ≥ minimum: call `stripe.transfers.create({ amount, currency:'usd', destination: account_id, transfer_group: 'PAYOUT_YYYY-MM_<author_id>' })`
  - On success → `author_payouts_v2.status='paid'`, `external_reference=transfer.id`, `paid_at=now()`; mark `author_earnings.paid_out=true`
  - On failure → status `'failed'`, notify owner email
  - Wise/PayPal authors continue using the existing CSV flow (admin clicks "Mark paid")
- Reminder email to authors with pending earnings but no connected payout method (uses existing `send-transactional-email`)

### 4. BP-06 Workbook — three purchase options
- Builder (`BP06Builder.tsx`) Activate step gains 2 new optional URL fields:
  - `amazon_paperback_url`
  - `amazon_kindle_url`
  - Stored in `author_nodes.content_json` (JSON, no schema change)
  - Helper note about publishing on KDP first
- Reader page `/[slug]/workbook` renders side-by-side cards for any options that are populated:
  - **Buy Direct (PDF)** — existing Stripe checkout, badge "Instant Download"
  - **Amazon Paperback** — opens KDP URL, badge "Ships Worldwide"
  - **Amazon Kindle** — opens Kindle URL, badge "Read Instantly"
- Same pattern is reused by **BP-09 Book Sales** (already has paperback URL → add `amazon_kindle_url`)

### 5. YR-27 Fundraising — external donation only
- `YR27Builder.tsx` Activate step replaces Stripe price field with:
  - `charity_name` (text)
  - `external_donation_url` (URL)
- Delete `deploy-yr27-to-stripe` edge function (or no-op it)
- Reader page `/[slug]/fundraising`:
  - CTA becomes "Donate to {charity_name}" → opens external URL in new tab
  - Footnote: *"Donations go directly to {charity_name}. Authors Bureau does not process or hold donation funds."*
  - Empty-state if URL missing: *"Campaign coming soon — donation link will be added shortly."*

### 6. Database / data migrations
- `UPDATE platform_config SET value='0.08' WHERE key='platform_fee_percent'`
- No schema changes — `author_payout_settings.payout_method` already accepts text; `author_profiles.stripe_account_id` + `stripe_onboarding_complete` already exist; `author_payouts_v2` already records transfer references in `external_reference`

### 7. Acceptance tests
1. Reader buys $100 product → `purchases.platform_fee=8`, `author_earnings.net_usd=92`
2. Author connects Stripe Express → `stripe_onboarding_complete=true`, badge shows
3. Admin runs monthly payouts → for Stripe authors a real `tr_…` transfer is created and reflected in `author_payouts_v2`
4. Author with no payout method gets reminder email
5. BP-06 reader page shows 1, 2, or 3 buttons depending on which URLs are filled
6. YR-27 reader page has no Stripe checkout; CTA opens external URL
7. Pauline test: existing $0 SUCK100 promo flow still completes end-to-end

## Out of scope / deferred
- Paid BP-05 webinars (leave free for now)
- Replacing the Wise/PayPal CSV flow — it remains for authors who don't want Stripe Express
- Currency conversion at payout time (Stripe handles to author's bank automatically)
- Refund-driven payout deductions (already handled in existing logic via `refunded` flag on `author_earnings`)

