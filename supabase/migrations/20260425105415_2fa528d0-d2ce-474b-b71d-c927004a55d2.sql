
-- Re-create helper without SECURITY DEFINER (it only reads public.author_profiles
-- which is already RLS-governed; no need to elevate).
CREATE OR REPLACE FUNCTION public.compute_node_microsite_url(
  p_author_id uuid,
  p_node_id text
) RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_author_slug text;
  v_origin text := 'https://authorsbureau.com';
BEGIN
  v_slug := CASE p_node_id
    WHEN 'BP-02' THEN 'free-gift'
    WHEN 'BP-04' THEN 'author-website'
    WHEN 'BP-05' THEN 'webinar'
    WHEN 'BP-06' THEN 'workbook'
    WHEN 'BP-07' THEN 'home-study'
    WHEN 'BP-08' THEN 'special-edition'
    WHEN 'BP-09' THEN 'book'
    WHEN 'BA-10' THEN 'online-course'
    WHEN 'BA-11' THEN 'audiobook'
    WHEN 'BA-12' THEN 'membership'
    WHEN 'BA-13' THEN 'group-coaching'
    WHEN 'BA-14' THEN 'podcast'
    WHEN 'BA-15' THEN 'press'
    WHEN 'BA-16' THEN 'affiliates'
    WHEN 'BA-17' THEN 'bundles'
    WHEN 'BA-18' THEN 'partners'
    WHEN 'YR-19' THEN 'coaching'
    WHEN 'YR-20' THEN 'vip'
    WHEN 'YR-21' THEN 'speaking'
    WHEN 'YR-22' THEN 'corporate-training'
    WHEN 'YR-23' THEN 'mastermind'
    WHEN 'YR-24' THEN 'retreat'
    WHEN 'YR-25' THEN 'certification'
    WHEN 'YR-26' THEN 'conference'
    WHEN 'YR-27' THEN 'fundraising'
    WHEN 'YR-28' THEN 'sponsors'
    ELSE NULL
  END;

  IF v_slug IS NULL THEN RETURN NULL; END IF;
  IF p_node_id IN ('BP-01','BP-03','BP-08','BP-09') THEN RETURN NULL; END IF;

  SELECT author_slug INTO v_author_slug
  FROM public.author_profiles
  WHERE id = p_author_id
  LIMIT 1;

  IF v_author_slug IS NULL THEN RETURN NULL; END IF;
  RETURN v_origin || '/' || v_author_slug || '/' || v_slug;
END;
$$;

-- Re-create view as security_invoker so it respects caller RLS.
DROP VIEW IF EXISTS public.link_audit_v;
CREATE VIEW public.link_audit_v
WITH (security_invoker = true) AS
SELECT
  n.id                AS author_node_id,
  n.author_id,
  ap.pen_name,
  ap.author_slug,
  n.node_id,
  n.node_name,
  n.archetype,
  n.status,
  n.price_usd,
  n.stripe_price_id,
  n.delivery_type,
  n.delivery_url,
  public.compute_node_microsite_url(n.author_id, n.node_id) AS expected_microsite_url,
  CASE
    WHEN n.status <> 'live' THEN 'not_live'
    WHEN n.delivery_url IS NULL OR n.delivery_url = '' THEN 'MISSING_DELIVERY_URL'
    WHEN n.archetype = 'A' AND COALESCE(n.price_usd, 0) > 0 AND n.stripe_price_id IS NULL THEN 'MISSING_STRIPE_PRICE'
    ELSE 'ok'
  END AS link_status
FROM public.author_nodes n
LEFT JOIN public.author_profiles ap ON ap.id = n.author_id;

GRANT SELECT ON public.link_audit_v TO authenticated;
