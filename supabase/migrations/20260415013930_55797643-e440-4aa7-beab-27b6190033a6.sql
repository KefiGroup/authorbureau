
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_assets_unique_type
  ON public.marketing_assets (book_id, author_id, asset_type);
