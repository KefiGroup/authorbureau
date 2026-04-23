

# Plan — Platform-collected payments + automated payouts (Wise + PayPal)

## Decisions locked in
- **Merchant of Record**: For Multiplier Pte Ltd (Authors Bureau), Singapore. All checkouts hit AB's existing Stripe.
- **Currency**: charge readers in **USD**, pay authors in their local currency (Wise FX) or PayPal.
- **Payout cadence**: monthly, 1st of month, 09:00 SGT.
- **Minimum payout**: US$50. Below threshold rolls to next month.
- **Tax**: authors self-declare. No W-9/W-8. AB issues an annual earnings statement only.
- **Payout fees**: deducted from author balance (transparent line item), not absorbed by AB.
- **Phase 1**: Wise + PayPal *batch CSV* generated automatically, admin clicks "Mark as paid" after uploading. **Phase 2 (next sprint)**: full Wise/PayPal API auto-execution.

## Architecture

```text
Reader checkout
   └─ create-checkout-session → AB Stripe (USD) → success
        └─ verify-purchase / process-purchase webhook
             └─ purchases row + author_earnings row (gross, fee, net)

Monthly cron (1st @ 09:00 SGT)
   └─ run-monthly-payouts edge fn
        ├─ Aggregate author_earnings WHERE paid_out=false, period=last month
        ├─ Per author: net ≥ $50 → create author_payouts row (status=queued)
        ├─ Generate Wise CSV + PayPal CSV → upload to storage
        ├─ Email admin: "X payouts ready, $Y total" + CSV links
        └─ Email each author: "Your $Z payout is being processed"

Admin marks payouts paid (Phase 1)
   └─ Admin dashboard → Payouts → bulk "Mark paid" → status=paid, paid_at=now
        └─ Email author: "Payout sent via Wise/PayPal, ref ABC123"

Annual (Jan 1)
   └─ generate-annual-statements cron
        └─ Per author: PDF earnings statement → storage → email link
```

## Database changes

```sql
-- 1. Author payout settings (extend existing)
ALTER TABLE author_payout_settings ADD COLUMN IF NOT EXISTS payout_method text;        -- 'wise' | 'paypal'
ALTER TABLE author_payout_settings ADD COLUMN IF NOT EXISTS wise_recipient jsonb;      -- {legal_name, country, bank_account|wise_email}
ALTER TABLE author_payout_settings ADD COLUMN IF NOT EXISTS paypal_email text;
ALTER TABLE author_payout_settings ADD COLUMN IF NOT EXISTS tax_self_declared_at timestamptz;
ALTER TABLE author_payout_settings ADD COLUMN IF NOT EXISTS minimum_payout_usd numeric DEFAULT 50;

-- 2. Per-sale earnings ledger (the source of truth for what AB owes)
CREATE TABLE author_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES author_profiles(id) ON DELETE RESTRICT,
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE RESTRICT,
  gross_usd numeric NOT NULL,
  stripe_fee_usd numeric NOT NULL,
  platform_fee_usd numeric NOT NULL,         -- 5%
  net_usd numeric NOT NULL,                  -- gross - stripe - platform
  earned_at timestamptz NOT NULL DEFAULT now(),
  payout_id uuid REFERENCES author_payouts(id),
  paid_out boolean NOT NULL DEFAULT false,
  refunded boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON author_earnings (author_id, paid_out);

-- 3. Monthly payout batches
CREATE TABLE author_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES author_profiles(id),
  period_start date NOT NULL,                -- e.g. 2026-03-01
  period_end date NOT NULL,                  -- 2026-03-31
  gross_usd numeric NOT NULL,
  total_stripe_fees_usd numeric NOT NULL,
  total_platform_fees_usd numeric NOT NULL,
  payout_fee_usd numeric NOT NULL DEFAULT 0, -- Wise/PayPal fee
  net_usd numeric NOT NULL,                  -- what author actually receives
  payout_method text NOT NULL,               -- 'wise' | 'paypal'
  status text NOT NULL DEFAULT 'queued',     -- queued | processing | paid | failed | held
  external_reference text,                   -- Wise/PayPal txn ID
  csv_batch_id uuid REFERENCES payout_batches(id),
  queued_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  notes text
);

-- 4. CSV batches (one per month per provider)
CREATE TABLE payout_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,                    -- 'wise' | 'paypal'
  period_start date NOT NULL,
  period_end date NOT NULL,
  csv_storage_path text NOT NULL,
  total_authors int NOT NULL,
  total_amount_usd numeric NOT NULL,
  status text DEFAULT 'pending',             -- pending | uploaded | completed
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- 5. Annual earnings statements
CREATE TABLE author_annual_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES author_profiles(id),
  tax_year int NOT NULL,
  total_gross_usd numeric NOT NULL,
  total_net_paid_usd numeric NOT NULL,
  pdf_storage_path text NOT NULL,
  generated_at timestamptz DEFAULT now(),
  UNIQUE(author_id, tax_year)
);

-- RLS: authors see own rows, admins see all (standard has_role pattern)
```

## Edge functions to build

| Function | Trigger | Job |
|---|---|---|
| `create-checkout-session` *(modify)* | Reader Buy Now | Drop Connect, charge AB Stripe, write metadata |
| `process-purchase` *(modify)* | Stripe webhook | Insert `purchases` + `author_earnings` rows with computed fees |
| `run-monthly-payouts` | pg_cron 1st @ 09:00 SGT | Aggregate earnings → create `author_payouts` + Wise/PayPal CSVs → notify |
| `mark-payout-paid` | Admin button | Flip status, set external_reference, email author |
| `generate-annual-statements` | pg_cron Jan 1 | Build PDFs, store, email |
| `download-payout-csv` | Admin click | Service-role signed URL to CSV |

## Frontend changes

### Author side
1. **Account Settings → "Payouts" tab** *(new, replaces Stripe Connect UI)*
   - Choose Wise or PayPal
   - Wise: legal name, country dropdown, bank account OR Wise email
   - PayPal: email + confirm
   - Tax self-declaration checkbox: *"I'm responsible for declaring this income in my country."*
   - Status pills: Method set ✅ · Tax acknowledged ✅
2. **Earnings Dashboard** *(new page `/earnings`)*
   - Pending payout (current month, real-time)
   - Next payout date + minimum threshold progress bar
   - Lifetime totals
   - Payout history table (period, gross, fees, net, status, ref)
   - Per-sale ledger (drill-down)
   - Download annual statement PDF
3. **Publish gate** *(swap)*
   - `RequirePayoutSetup` replaces `RequireStripeConnected`
   - Modal: "Set up payouts to publish paid products" → links to `/account-settings?tab=payouts`
   - "Make this free instead" still works
4. **Sidebar nav**: "Earnings" item under Account
5. **Cleanup**: remove Stripe Connect UI from `ConnectSettings`, neuter `useStripeConnect` hook (keeps export for backward compat, returns `{ ready: true }`)

### Admin side (`/admin/payouts` — new)
1. **Monthly batch view**: current month progress, ranked author list
2. **Pending payouts table**: author, method, amount, "Download CSV" + "Mark paid" buttons
3. **Per-author drill**: ledger entries, edit notes, hold payout
4. **Reports tab**:
   - Monthly P&L (gross sales, Stripe fees, platform fees collected, payouts owed, payouts paid)
   - Author leaderboard (top earners)
   - Failed/held payouts queue
   - Export CSV for accounting
5. **Annual statement trigger**: button to manually re-run for an author

## Restoration & cleanup

- **Pauline's BP-06**: promote back to `live`, regenerate microsite URL. Buy Now will work immediately because checkout uses AB Stripe.
- **All other demoted nodes** from the previous sweep: re-promote to `live` (the prior gate was wrong).
- **Old Stripe Connect columns** on `author_profiles` (`stripe_connected_account_id`, `stripe_onboarding_complete`): leave in DB, stop reading.
- **Files to delete**: `RequireStripeConnected.tsx`, `StripeRequiredModal.tsx`, `StripeConnectBanner.tsx` UI, `ConnectStripePage.tsx`. Keep `stripe-connect` edge fn but return `{ deprecated: true }`.
- **Memory update**: rewrite `mem://architecture/commerce-engine-v1` → "Platform as MoR, monthly Wise+PayPal payouts."

## Automation summary (what runs without human input)

| Event | Automated action |
|---|---|
| Reader buys | Stripe charge → ledger row → author sees pending balance instantly |
| Refund | `author_earnings.refunded=true`, deducted from next payout |
| 1st of month 09:00 SGT | Aggregate, create payouts, generate CSVs, email admin + authors |
| Author hits $50 threshold | Auto-included in next batch |
| Below $50 | Rolls to next month automatically |
| Jan 1 | Annual PDF statement generated + emailed |
| Failed Wise/PayPal entry | Marked `failed`, admin alerted, balance preserved |

## Out of scope (later)
- Phase-2 Wise/PayPal API auto-execution (replaces "Mark paid" click)
- 1099/SG tax filings (none required)
- Multi-currency reader checkout
- Refund initiation from admin UI (use Stripe dashboard for now)
- Subscription products

## Verification
1. Pauline's BP-06 restored to `live`; reader checkout completes; `author_earnings` row appears.
2. Author with $0 → publishes free → publishes paid: blocked until Payouts tab filled. After fill: publishes successfully.
3. Force-run `run-monthly-payouts` for March → CSV downloads cleanly with valid Wise/PayPal columns.
4. Admin clicks "Mark paid" → author gets email, payout shows `paid` with reference.
5. Author at $30 doesn't get a payout that month; rolls into next.
6. Refund a sale → next payout reflects deduction.
7. Annual statement PDF renders with correct totals.

