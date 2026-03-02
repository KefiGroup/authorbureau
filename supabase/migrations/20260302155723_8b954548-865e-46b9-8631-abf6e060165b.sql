
CREATE TABLE public.generated_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  asset_type text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, asset_type)
);

ALTER TABLE public.generated_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets"
ON public.generated_assets FOR SELECT
TO authenticated
USING (author_id = auth.uid());

CREATE POLICY "Users can insert own assets"
ON public.generated_assets FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update own assets"
ON public.generated_assets FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete own assets"
ON public.generated_assets FOR DELETE
TO authenticated
USING (author_id = auth.uid());
