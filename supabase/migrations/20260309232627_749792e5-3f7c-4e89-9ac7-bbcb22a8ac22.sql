
-- Cross-builder push tracking table
CREATE TABLE public.cross_builder_pushes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  source_builder TEXT NOT NULL,
  destination_builder TEXT NOT NULL,
  push_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  source_asset_id UUID REFERENCES public.generated_assets(id),
  destination_record_id UUID,
  destination_table TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

-- Index for fast lookups by destination builder
CREATE INDEX idx_cross_builder_pushes_dest ON public.cross_builder_pushes(author_id, destination_builder, status);
CREATE INDEX idx_cross_builder_pushes_source ON public.cross_builder_pushes(author_id, source_builder, book_id);

-- Enable RLS
ALTER TABLE public.cross_builder_pushes ENABLE ROW LEVEL SECURITY;

-- Authors can manage their own pushes
CREATE POLICY "Authors can manage their own pushes"
ON public.cross_builder_pushes
FOR ALL
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Admins can view all pushes
CREATE POLICY "Admins can view all pushes"
ON public.cross_builder_pushes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
