-- 1. platform_config table
CREATE TABLE IF NOT EXISTS public.platform_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read platform_config"
  ON public.platform_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert platform_config"
  ON public.platform_config FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update platform_config"
  ON public.platform_config FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete platform_config"
  ON public.platform_config FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed platform fee
INSERT INTO public.platform_config (key, value)
VALUES ('platform_fee_percent', '0.05')
ON CONFLICT (key) DO NOTHING;

-- 2. Extend author_nodes with product columns
ALTER TABLE public.author_nodes
  ADD COLUMN IF NOT EXISTS price_usd numeric(10,2),
  ADD COLUMN IF NOT EXISTS delivery_type text,
  ADD COLUMN IF NOT EXISTS delivery_url text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'usd';