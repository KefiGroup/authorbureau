-- 1. Extend author_payout_settings
ALTER TABLE public.author_payout_settings ADD COLUMN IF NOT EXISTS payout_method text;
ALTER TABLE public.author_payout_settings ADD COLUMN IF NOT EXISTS wise_recipient jsonb;
ALTER TABLE public.author_payout_settings ADD COLUMN IF NOT EXISTS paypal_email_v2 text;
ALTER TABLE public.author_payout_settings ADD COLUMN IF NOT EXISTS tax_self_declared_at timestamptz;
ALTER TABLE public.author_payout_settings ADD COLUMN IF NOT EXISTS minimum_payout_usd numeric DEFAULT 50;

-- 2. payout_batches (created first; referenced by author_payouts)
CREATE TABLE IF NOT EXISTS public.payout_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  csv_storage_path text NOT NULL,
  total_authors int NOT NULL DEFAULT 0,
  total_amount_usd numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- 3. author_payouts
CREATE TABLE IF NOT EXISTS public.author_payouts_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.author_profiles(id) ON DELETE RESTRICT,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_usd numeric NOT NULL DEFAULT 0,
  total_stripe_fees_usd numeric NOT NULL DEFAULT 0,
  total_platform_fees_usd numeric NOT NULL DEFAULT 0,
  payout_fee_usd numeric NOT NULL DEFAULT 0,
  net_usd numeric NOT NULL DEFAULT 0,
  payout_method text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  external_reference text,
  csv_batch_id uuid REFERENCES public.payout_batches(id),
  queued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  notes text
);
CREATE INDEX IF NOT EXISTS idx_author_payouts_v2_author ON public.author_payouts_v2(author_id, status);

-- 4. author_earnings
CREATE TABLE IF NOT EXISTS public.author_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.author_profiles(id) ON DELETE RESTRICT,
  purchase_id uuid NOT NULL,
  gross_usd numeric NOT NULL,
  stripe_fee_usd numeric NOT NULL DEFAULT 0,
  platform_fee_usd numeric NOT NULL DEFAULT 0,
  net_usd numeric NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  payout_id uuid REFERENCES public.author_payouts_v2(id),
  paid_out boolean NOT NULL DEFAULT false,
  refunded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_author_earnings_author_paid ON public.author_earnings(author_id, paid_out);
CREATE INDEX IF NOT EXISTS idx_author_earnings_purchase ON public.author_earnings(purchase_id);

-- 5. author_annual_statements
CREATE TABLE IF NOT EXISTS public.author_annual_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.author_profiles(id) ON DELETE CASCADE,
  tax_year int NOT NULL,
  total_gross_usd numeric NOT NULL DEFAULT 0,
  total_net_paid_usd numeric NOT NULL DEFAULT 0,
  pdf_storage_path text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(author_id, tax_year)
);

-- 6. RLS
ALTER TABLE public.author_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.author_payouts_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.author_annual_statements ENABLE ROW LEVEL SECURITY;

-- Authors view their own earnings
CREATE POLICY "Authors view own earnings" ON public.author_earnings
  FOR SELECT USING (
    author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins view all earnings" ON public.author_earnings
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authors view own payouts" ON public.author_payouts_v2
  FOR SELECT USING (
    author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins view all payouts" ON public.author_payouts_v2
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update payouts" ON public.author_payouts_v2
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view payout batches" ON public.payout_batches
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage payout batches" ON public.payout_batches
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authors view own statements" ON public.author_annual_statements
  FOR SELECT USING (
    author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins view all statements" ON public.author_annual_statements
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for payout CSVs and annual statements (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('payouts', 'payouts', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read payout files" ON storage.objects
  FOR SELECT USING (bucket_id = 'payouts' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authors read own statement files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payouts'
    AND (storage.foldername(name))[1] = 'statements'
    AND (storage.foldername(name))[2] IN (
      SELECT id::text FROM public.author_profiles WHERE user_id = auth.uid()
    )
  );