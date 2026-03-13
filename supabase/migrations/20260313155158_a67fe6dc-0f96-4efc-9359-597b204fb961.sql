
-- 1. Purchases table: tracks every customer purchase
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email text NOT NULL,
  customer_name text,
  author_id uuid NOT NULL,
  product_type text NOT NULL, -- 'home_study_course', 'online_course', 'workbook', 'audiobook', 'coaching', etc.
  product_id uuid NOT NULL,
  product_title text NOT NULL,
  amount numeric NOT NULL,
  platform_fee numeric NOT NULL DEFAULT 0, -- 8% platform fee
  author_earnings numeric NOT NULL DEFAULT 0, -- 92% author share
  currency text NOT NULL DEFAULT 'USD',
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  refund_status text NOT NULL DEFAULT 'none', -- 'none', 'requested', 'refunded'
  refunded_at timestamp with time zone,
  payout_status text NOT NULL DEFAULT 'pending', -- 'pending', 'eligible', 'processing', 'paid', 'held'
  payout_eligible_at timestamp with time zone, -- date after refund window
  payout_id uuid, -- reference to author_payouts when paid
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Authors can view purchases of their products
CREATE POLICY "Authors can view their own purchases" ON public.purchases
  FOR SELECT TO authenticated
  USING (auth.uid() = author_id);

-- Admins can view and manage all purchases
CREATE POLICY "Admins can manage all purchases" ON public.purchases
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert (from edge functions)
CREATE POLICY "Service can insert purchases" ON public.purchases
  FOR INSERT TO public
  WITH CHECK (true);

-- 2. Author payout settings: stores preferred payout method
CREATE TABLE public.author_payout_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL UNIQUE,
  payout_method text NOT NULL DEFAULT 'stripe', -- 'stripe', 'paypal', 'wise'
  paypal_email text,
  wise_email text,
  wise_account_number text,
  wise_routing_number text,
  wise_currency text DEFAULT 'USD',
  refund_window_days integer NOT NULL DEFAULT 14,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.author_payout_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own payout settings" ON public.author_payout_settings
  FOR ALL TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Admins can view all payout settings" ON public.author_payout_settings
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Author payouts: tracks payout history
CREATE TABLE public.author_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  payout_method text NOT NULL, -- 'stripe', 'paypal', 'wise'
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  purchase_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  stripe_transfer_id text,
  paypal_batch_id text,
  wise_transfer_id text,
  reference_note text,
  initiated_by uuid, -- admin who triggered it
  initiated_at timestamp with time zone,
  completed_at timestamp with time zone,
  failed_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.author_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view their own payouts" ON public.author_payouts
  FOR SELECT TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all payouts" ON public.author_payouts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_author_payout_settings_updated_at BEFORE UPDATE ON public.author_payout_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_author_payouts_updated_at BEFORE UPDATE ON public.author_payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
