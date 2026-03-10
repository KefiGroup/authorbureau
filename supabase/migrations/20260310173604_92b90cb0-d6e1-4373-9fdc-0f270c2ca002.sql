
-- Create a public view of books that excludes owner_email
CREATE OR REPLACE VIEW public.books_public
WITH (security_invoker = on) AS
SELECT 
  id, author_id, title, subtitle, slug, description, genre,
  cover_image_url, amazon_url, price, currency, kindle_price, paperback_price,
  pages, rating, review_count, badges, bestseller_proof_url,
  author_name, author_bio, author_photo_url, amazon_author_profile_url,
  published_at, created_at, updated_at, entry_mode, ai_enriched
FROM public.books;
-- owner_email is intentionally excluded from public view
