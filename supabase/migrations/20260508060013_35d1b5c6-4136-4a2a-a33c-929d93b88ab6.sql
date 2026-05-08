
ALTER TABLE public.author_nodes
  ADD COLUMN IF NOT EXISTS cover_image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-covers', 'product-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DO $$ BEGIN
  CREATE POLICY "Product covers are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'product-covers');
EXCEPTION WHEN duplicate_object THEN null; END $$;
