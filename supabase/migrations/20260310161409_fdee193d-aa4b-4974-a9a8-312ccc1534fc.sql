
-- AI usage tracking table for cost control
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  feature text NOT NULL,
  model text NOT NULL DEFAULT 'unknown',
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  cost_estimate numeric DEFAULT 0,
  book_id uuid REFERENCES public.books(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authors can view their own usage" ON public.ai_usage_logs FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "Service role inserts usage" ON public.ai_usage_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all usage" ON public.ai_usage_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Index for admin analytics queries
CREATE INDEX idx_ai_usage_logs_created ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_author ON public.ai_usage_logs(author_id);
