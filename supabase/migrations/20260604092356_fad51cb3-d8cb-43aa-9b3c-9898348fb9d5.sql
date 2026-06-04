-- FIX 1: books.owner_email must not be readable by anon.
REVOKE SELECT ON public.books FROM anon;

GRANT SELECT (
  id, author_id, title, subtitle, description, slug, pages, rating,
  review_count, genre, badges, price, currency, kindle_price, paperback_price,
  amazon_url, cover_image_url, ai_enriched, entry_mode, amazon_author_profile_url,
  author_name, author_bio, author_photo_url, created_at, updated_at, published_at,
  bestseller_proof_url, approval_status, rejection_note, amazon_kindle_url,
  submitted_at, review_round, last_review_action_at, review_history
) ON public.books TO anon;

-- FIX 2: route public membership reads through the marketing-only view and
-- drop the permissive policy that exposed stripe IDs and email templates.
ALTER VIEW public.membership_content_public SET (security_invoker = off);

DROP POLICY IF EXISTS "Public reads live membership rows" ON public.membership_content;
