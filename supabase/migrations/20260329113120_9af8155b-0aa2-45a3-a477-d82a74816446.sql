
ALTER TABLE public.author_profiles
ADD COLUMN IF NOT EXISTS consultation_promo_codes jsonb DEFAULT null,
ADD COLUMN IF NOT EXISTS consultation_promo_expires_at timestamptz DEFAULT null;

COMMENT ON COLUMN public.author_profiles.consultation_promo_codes IS 'JSON object with tier keys mapping to unique Stripe promo code strings';
COMMENT ON COLUMN public.author_profiles.consultation_promo_expires_at IS 'When the consultation promo codes expire (60 min after generation)';
