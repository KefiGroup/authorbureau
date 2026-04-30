-- 1. Annual statement email tracking
ALTER TABLE public.author_annual_statements
  ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ;

-- 2. Wipe Wise as a payout method (force re-pick)
UPDATE public.author_payout_settings
   SET payout_method = NULL
 WHERE payout_method = 'wise';

-- 3. Drop now-unused Wise columns
ALTER TABLE public.author_payout_settings
  DROP COLUMN IF EXISTS wise_recipient,
  DROP COLUMN IF EXISTS wise_email,
  DROP COLUMN IF EXISTS wise_account_number,
  DROP COLUMN IF EXISTS wise_routing_number,
  DROP COLUMN IF EXISTS wise_currency;

-- 4. Constrain payout_method to stripe | paypal | NULL
ALTER TABLE public.author_payout_settings
  DROP CONSTRAINT IF EXISTS author_payout_settings_payout_method_check;
ALTER TABLE public.author_payout_settings
  ADD CONSTRAINT author_payout_settings_payout_method_check
  CHECK (payout_method IS NULL OR payout_method IN ('stripe','paypal'));