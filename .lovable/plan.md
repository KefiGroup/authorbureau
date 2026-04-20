
## Sprint 39 Phase 3 Commerce — Reconciled Build Plan

### 1. DB Migration
- New table `platform_config` (key text PK, value text, updated_at). Seed `('platform_fee_percent','0.05')`. RLS: read = authenticated; write = admin only.
- Alter `author_nodes`: add `price_usd numeric(10,2)`, `delivery_type text`, `delivery_url text`, `currency text default 'usd'`.

### 2. Revert Publish-time Stripe gate
Remove `RequireStripeConnected` wrapper from BP-06 → BP-09 builders (4 files). Authors publish freely; gating moves to reader Buy Now.

### 3. Edge function: `create-checkout-session` (NEW)
- Reader-facing (no auth required, guest checkout supported).
- Input: `{ author_node_id, customer_email? }`.
- Loads `author_nodes` row → resolves connected Stripe account, `price_usd`, `currency`, `product_title`, `author_slug`, `book_slug`.
- Reads platform fee from `platform_config`.
- Creates Stripe Checkout Session with destination charges (`payment_intent_data.application_fee_amount`, `transfer_data.destination = author_stripe_account_id`).
- Metadata: author_id, product_id (= author_node_id), product_type, product_title, author_slug, book_slug.
- Success URL: `/[author_slug]/thank-you?session_id={CHECKOUT_SESSION_ID}`.
- If author has no Stripe Connect → return `{ error: 'AUTHOR_PAYMENTS_NOT_SET_UP' }` (UI shows graceful modal).

### 4. Edge function: `verify-purchase` (PATCH)
- Replace hardcoded `0.08` with read from `platform_config.platform_fee_percent`.
- Keep all other logic (synchronous, idempotent insert, confirmation email).

### 5. Edge function: `process-purchase` (NEW — Stripe webhook)
- `verify_jwt = false`. Verifies `stripe-signature` header against `STRIPE_WEBHOOK_SECRET`.
- Handles `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`.
- Idempotent insert/update on `purchases` keyed by `stripe_checkout_session_id`.
- Reads platform fee from `platform_config`.
- Fulfilment dispatch by `product_type`: workbook (grant access), home_study (insert `course_enrolments`), special_editions (notify author for shipping), event_book_sales (mark fulfilled).
- ABBY notify: triggers nudge for first-sale, 5-sale milestone, fulfilment failure (reuse existing nudge engine).
- CRM update: push lead/customer to GHL via existing connector pattern.
- Always returns 200.

### 6. Reader Buy Now component
- New `<BuyNowButton authorNodeId>` invoking `create-checkout-session`.
- Wire into the 4 microsite pages: `Workbook.tsx`, `HomeStudy.tsx`, `SpecialEditions.tsx`, `OrderBook.tsx`.
- On `AUTHOR_PAYMENTS_NOT_SET_UP` → show "This author hasn't set up payments yet" modal + capture lead email + trigger ABBY nudge to author.

### 7. AuthorSubpageResolver routes (verify only)
Confirm `/[slug]/workbook/[bookSlug]`, `/home-study/[bookSlug]`, `/special-editions/[bookSlug]`, `/order/[bookSlug]` resolve. Add any missing mappings in `node-slug-map.ts` and resolver.

### 8. Stripe webhook URL
After `process-purchase` deploys, surface its URL in Account Settings → Connections → Stripe panel for the user to paste into Stripe dashboard (events: `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`).

### 9. Audit & docs
- Connect Stripe page copy: confirm "publish first, connect later" messaging.
- Revenue Dashboard empty state: confirm renders cleanly with 0 sales.
- Update `.lovable/sprint-tracker.md` → Sprint 39 Phase 3 COMPLETE.
- Save memory: `mem://architecture/commerce-engine-v1` (platform_fee from config, author_nodes as product registry, dual-webhook pattern).

### Files
**New (3 edge fns + 1 component + 1 migration):** `create-checkout-session/index.ts`, `process-purchase/index.ts`, migration SQL, `src/components/commerce/BuyNowButton.tsx`.
**Edited (~10):** `verify-purchase/index.ts`, BP-06/07/08/09 builders (revert gate), 4 microsite pages (wire BuyNow), `AuthorSubpageResolver.tsx` (if gaps), Account Settings Stripe panel (webhook URL).

### Verification
Test as Pauline: publish a workbook with price $19 → reader visits `/pauline-teo/workbook/[book]` → Buy Now → Stripe test checkout → webhook fires → `purchases` row created with 5% fee → `verify-purchase` confirms on thank-you page → confirmation email sent → ABBY first-sale nudge appears → Revenue Dashboard updates.
