ALTER TABLE public.author_profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean DEFAULT false;