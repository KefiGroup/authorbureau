-- Chat persistence for Consult Abby sessions
CREATE TABLE public.consultation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Each user can have one active session per book
CREATE UNIQUE INDEX idx_consultation_active_session 
  ON public.consultation_sessions (user_id, book_id) 
  WHERE is_active = true;

ALTER TABLE public.consultation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sessions"
  ON public.consultation_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_consultation_sessions_updated_at
  BEFORE UPDATE ON public.consultation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();