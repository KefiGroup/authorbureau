ALTER TABLE public.author_nodes
  ADD COLUMN IF NOT EXISTS workbook_pdf_url text,
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS checkout_url text;