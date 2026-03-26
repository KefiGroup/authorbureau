
-- Table 1: abby_conversations
CREATE TABLE public.abby_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.author_profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'abby')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.abby_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authors can manage own conversations" ON public.abby_conversations
  FOR ALL USING (author_id = (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));
CREATE INDEX idx_abby_conversations_author_created ON public.abby_conversations(author_id, created_at DESC);

-- Table 2: abby_nudges
CREATE TABLE public.abby_nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.author_profiles(id) ON DELETE CASCADE,
  nudge_type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  action_label text,
  action_url text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.abby_nudges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authors can manage own nudges" ON public.abby_nudges
  FOR ALL USING (author_id = (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));
CREATE INDEX idx_abby_nudges_author_read_created ON public.abby_nudges(author_id, is_read, created_at DESC);

-- Enable realtime for nudges
ALTER PUBLICATION supabase_realtime ADD TABLE public.abby_nudges;
