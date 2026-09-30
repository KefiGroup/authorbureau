DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.proname NOT IN ('has_role','can_access_course','can_access_course_folder','has_purchased',
        'owns_author_folder','purchased_audiobook_for_book','viewer_is_member',
        'get_reading_leaderboard','get_author_curated_book_id')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

ALTER VIEW public.author_profiles_admin SET (security_invoker = on);
REVOKE ALL ON public.author_profiles_admin FROM anon;