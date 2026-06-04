-- Revert the view to run with the caller's privileges (no SECURITY DEFINER).
ALTER VIEW public.membership_content_public SET (security_invoker = on);

-- Anonymous visitors: column-level access to marketing fields only.
REVOKE SELECT ON public.membership_content FROM anon;
GRANT SELECT (
  author_id, name, tagline, benefits, sales_copy, monthly_price, currency, status, created_at, updated_at
) ON public.membership_content TO anon;

-- Row access for anon to live memberships so the marketing view resolves.
DROP POLICY IF EXISTS "Anon reads live membership marketing" ON public.membership_content;
CREATE POLICY "Anon reads live membership marketing"
ON public.membership_content
FOR SELECT
TO anon
USING (status = 'live');
