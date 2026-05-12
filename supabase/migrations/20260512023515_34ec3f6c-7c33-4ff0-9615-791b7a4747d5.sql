
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert audit log" ON public.admin_audit_log;
CREATE POLICY "Service role can insert audit log" ON public.admin_audit_log
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role inserts lead activities" ON public.lead_activities;
CREATE POLICY "Service role inserts lead activities" ON public.lead_activities
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role inserts usage" ON public.ai_usage_logs;
CREATE POLICY "Service role inserts usage" ON public.ai_usage_logs
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert snapshots" ON public.author_revenue_snapshots;
CREATE POLICY "Service role can insert snapshots" ON public.author_revenue_snapshots
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update view counts on live funnels" ON public.funnels;

CREATE OR REPLACE FUNCTION public.increment_funnel_counter(p_funnel_id uuid, p_field text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_field NOT IN ('page_views', 'conversions') THEN
    RAISE EXCEPTION 'invalid counter field';
  END IF;
  IF p_field = 'page_views' THEN
    UPDATE public.funnels SET page_views = COALESCE(page_views, 0) + 1
     WHERE id = p_funnel_id AND status = 'live';
  ELSE
    UPDATE public.funnels SET conversions = COALESCE(conversions, 0) + 1
     WHERE id = p_funnel_id AND status = 'live';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_funnel_counter(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_funnel_counter(uuid, text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Members can view their own membership" ON public.reading_club_members;
CREATE POLICY "Members can view their own membership" ON public.reading_club_members
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP VIEW IF EXISTS public.books_public CASCADE;
CREATE VIEW public.books_public AS
  SELECT
    id, author_id, title, subtitle, description, slug,
    pages, rating, review_count, genre, badges,
    price, currency, kindle_price, paperback_price,
    amazon_url, amazon_kindle_url, cover_image_url,
    author_name, author_bio, author_photo_url,
    bestseller_proof_url, published_at, approval_status,
    created_at, updated_at
  FROM public.books
  WHERE published_at IS NOT NULL;

GRANT SELECT ON public.books_public TO anon, authenticated;
