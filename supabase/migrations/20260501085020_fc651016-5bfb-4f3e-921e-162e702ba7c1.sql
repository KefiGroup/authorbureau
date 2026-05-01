ALTER TABLE public.author_payout_settings
  DROP COLUMN IF EXISTS payout_method,
  DROP COLUMN IF EXISTS paypal_email,
  DROP COLUMN IF EXISTS paypal_email_v2;