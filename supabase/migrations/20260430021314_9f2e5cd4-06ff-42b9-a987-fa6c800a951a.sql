CREATE TABLE public.content_quality_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  node_id text NOT NULL,
  rule text NOT NULL,
  sample text,
  field_path text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_quality_log_node ON public.content_quality_log (node_id, created_at DESC);
CREATE INDEX idx_content_quality_log_author ON public.content_quality_log (author_id, created_at DESC);
CREATE INDEX idx_content_quality_log_rule ON public.content_quality_log (rule, created_at DESC);

ALTER TABLE public.content_quality_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view content quality log"
  ON public.content_quality_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role bypasses RLS for inserts; no INSERT policy needed for end users.