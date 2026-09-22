REVOKE EXECUTE ON FUNCTION public.reset_stuck_generating_nodes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_stuck_generating_nodes() TO service_role;