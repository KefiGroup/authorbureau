CREATE TABLE public.author_node_skips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid NOT NULL,
  book_id uuid NULL,
  node_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (author_id, book_id, node_id)
);

CREATE INDEX idx_author_node_skips_author ON public.author_node_skips (author_id);

ALTER TABLE public.author_node_skips ENABLE ROW LEVEL SECURITY;

-- author_id stores author_profiles.id; an author may read/manage their own skips.
CREATE POLICY "Authors view own skips"
  ON public.author_node_skips FOR SELECT
  TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Authors insert own skips"
  ON public.author_node_skips FOR INSERT
  TO authenticated
  WITH CHECK (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Authors delete own skips"
  ON public.author_node_skips FOR DELETE
  TO authenticated
  USING (author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid()));