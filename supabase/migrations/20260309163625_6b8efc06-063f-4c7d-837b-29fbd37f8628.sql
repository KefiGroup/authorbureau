
-- Bug reports table
CREATE TABLE public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  page_url text NOT NULL,
  description text NOT NULL,
  screenshot_url text NULL,
  priority text NOT NULL DEFAULT 'low',
  status text NOT NULL DEFAULT 'new',
  admin_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert bug reports" ON public.bug_reports FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can view their own bug reports" ON public.bug_reports FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all bug reports" ON public.bug_reports FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Feedback table
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  type text NOT NULL DEFAULT 'general',
  description text NOT NULL,
  importance text NOT NULL DEFAULT 'nice_to_have',
  status text NOT NULL DEFAULT 'new',
  admin_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback" ON public.feedback FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can view their own feedback" ON public.feedback FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all feedback" ON public.feedback FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Chat sessions table
CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  page_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own chat sessions" ON public.chat_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own chat sessions" ON public.chat_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can view their own chat sessions" ON public.chat_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all chat sessions" ON public.chat_sessions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
