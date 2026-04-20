
-- Lock down v_author_profiles_orphans: revoke from anon/authenticated; admin-only via RPC-style wrapper
REVOKE ALL ON public.v_author_profiles_orphans FROM anon, authenticated, public;

-- Recreate as security_invoker view (no auth.users exposure to PostgREST roles)
DROP VIEW IF EXISTS public.v_author_profiles_orphans;

CREATE OR REPLACE FUNCTION public.list_author_profile_orphans()
RETURNS TABLE(id uuid, user_id uuid, pen_name text, author_slug text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT ap.id, ap.user_id, ap.pen_name, ap.author_slug, ap.created_at
  FROM public.author_profiles ap
  LEFT JOIN auth.users u ON u.id = ap.user_id
  WHERE u.id IS NULL;
END;
$$;
