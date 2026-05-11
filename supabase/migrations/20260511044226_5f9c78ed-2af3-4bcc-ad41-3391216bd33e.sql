
-- Trigger: when a new auth user is created with metadata.claim_author_profile_id,
-- attach that author_profile to the new user (only if the profile is currently
-- pointing at a non-existent auth.users row).

CREATE OR REPLACE FUNCTION public.handle_claim_author_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim_id uuid;
BEGIN
  BEGIN
    v_claim_id := NULLIF(NEW.raw_user_meta_data->>'claim_author_profile_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_claim_id := NULL;
  END;

  IF v_claim_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.author_profiles ap
     SET user_id = NEW.id,
         updated_at = now()
   WHERE ap.id = v_claim_id
     AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ap.user_id);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_claim_author_profile ON auth.users;
CREATE TRIGGER on_auth_user_claim_author_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_claim_author_profile();

-- Admin-only RPC: list ghost author profiles with their best-known email
-- (resolved via books.owner_email). Service-role callers (edge fns) bypass auth.uid().
CREATE OR REPLACE FUNCTION public.admin_list_ghost_authors()
RETURNS TABLE(
  author_profile_id uuid,
  pen_name text,
  author_slug text,
  ghost_user_id uuid,
  best_email text,
  book_count int,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin required';
  END IF;

  RETURN QUERY
  SELECT
    ap.id,
    ap.pen_name,
    ap.author_slug,
    ap.user_id,
    (SELECT lower(b.owner_email)
       FROM public.books b
      WHERE b.author_id = ap.id AND b.owner_email IS NOT NULL
      ORDER BY b.created_at DESC LIMIT 1) AS best_email,
    (SELECT count(*)::int FROM public.books b WHERE b.author_id = ap.id),
    ap.created_at
  FROM public.author_profiles ap
  LEFT JOIN auth.users u ON u.id = ap.user_id
  WHERE u.id IS NULL;
END;
$$;
