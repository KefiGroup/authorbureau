ALTER TABLE public.email_sync_log
ADD COLUMN IF NOT EXISTS stripe_customers_updated_count INTEGER NOT NULL DEFAULT 0;