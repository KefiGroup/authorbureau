-- Layered overrides for funnel stages.
-- The base `funnels` row holds ABBY's generated copy; this table holds per-stage author edits.
CREATE TABLE public.funnel_stage_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  stage_id text NOT NULL,
  field_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (funnel_id, stage_id)
);

CREATE INDEX idx_funnel_stage_overrides_funnel ON public.funnel_stage_overrides(funnel_id);
CREATE INDEX idx_funnel_stage_overrides_author ON public.funnel_stage_overrides(author_id);

ALTER TABLE public.funnel_stage_overrides ENABLE ROW LEVEL SECURITY;

-- Author owns the override if the funnel's author_id maps to their author_profiles row.
CREATE POLICY "Authors can view own funnel overrides"
ON public.funnel_stage_overrides
FOR SELECT
USING (
  author_id IN (
    SELECT id FROM public.author_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Authors can insert own funnel overrides"
ON public.funnel_stage_overrides
FOR INSERT
WITH CHECK (
  author_id IN (
    SELECT id FROM public.author_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Authors can update own funnel overrides"
ON public.funnel_stage_overrides
FOR UPDATE
USING (
  author_id IN (
    SELECT id FROM public.author_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Authors can delete own funnel overrides"
ON public.funnel_stage_overrides
FOR DELETE
USING (
  author_id IN (
    SELECT id FROM public.author_profiles WHERE user_id = auth.uid()
  )
);

CREATE TRIGGER update_funnel_stage_overrides_updated_at
BEFORE UPDATE ON public.funnel_stage_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();