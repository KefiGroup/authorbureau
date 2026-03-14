ALTER TABLE public.reader_progress ADD COLUMN IF NOT EXISTS start_date date;

-- Add a separate table to track reader start dates per purchase
CREATE TABLE IF NOT EXISTS public.reader_start_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL,
  user_email text NOT NULL,
  start_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(purchase_id)
);

ALTER TABLE public.reader_start_dates ENABLE ROW LEVEL SECURITY;

-- Allow public insert/select (edge function uses service role, but just in case)
CREATE POLICY "Anyone can read start dates" ON public.reader_start_dates FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert start dates" ON public.reader_start_dates FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update start dates" ON public.reader_start_dates FOR UPDATE TO public USING (true);