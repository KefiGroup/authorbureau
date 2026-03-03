
-- Reader-driven challenge entries: a user picks a book and starts their 100-day challenge
CREATE TABLE public.reading_challenge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

ALTER TABLE public.reading_challenge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entries"
  ON public.reading_challenge_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own entries"
  ON public.reading_challenge_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries"
  ON public.reading_challenge_entries FOR UPDATE
  USING (auth.uid() = user_id);

-- Daily reading logs
CREATE TABLE public.reading_challenge_daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.reading_challenge_entries(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  minutes_read integer NOT NULL DEFAULT 2,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(entry_id, log_date)
);

ALTER TABLE public.reading_challenge_daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own logs"
  ON public.reading_challenge_daily_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.reading_challenge_entries
    WHERE id = reading_challenge_daily_logs.entry_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own logs"
  ON public.reading_challenge_daily_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.reading_challenge_entries
    WHERE id = reading_challenge_daily_logs.entry_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own logs"
  ON public.reading_challenge_daily_logs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.reading_challenge_entries
    WHERE id = reading_challenge_daily_logs.entry_id AND user_id = auth.uid()
  ));

-- Admins can view all for reporting
CREATE POLICY "Admins can view all entries"
  ON public.reading_challenge_entries FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all logs"
  ON public.reading_challenge_daily_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.reading_challenge_entries e
    WHERE e.id = reading_challenge_daily_logs.entry_id
    AND public.has_role(auth.uid(), 'admin')
  ));
