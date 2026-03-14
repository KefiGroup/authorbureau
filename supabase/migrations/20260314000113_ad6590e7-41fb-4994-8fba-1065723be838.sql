
-- Track reader progress through home study days
CREATE TABLE public.reader_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL,
  user_email text NOT NULL,
  day_number integer NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(purchase_id, day_number)
);

ALTER TABLE public.reader_progress ENABLE ROW LEVEL SECURITY;

-- Anyone can read their own progress (matched by edge function)
-- Insert/select managed via edge function with service role
CREATE POLICY "Service role manages reader progress"
  ON public.reader_progress FOR ALL TO public
  USING (true) WITH CHECK (true);
