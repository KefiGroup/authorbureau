-- Modules stuck in 'generating' block their builder forever. Reset stale ones
-- and keep them from sticking again.
UPDATE public.author_nodes
SET status = 'content_ready'
WHERE status = 'generating'
  AND updated_at < now() - interval '5 minutes';

CREATE OR REPLACE FUNCTION public.reset_stuck_generating_nodes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.author_nodes
  SET status = 'content_ready'
  WHERE status = 'generating'
    AND updated_at < now() - interval '5 minutes';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_stuck_generating_nodes() TO authenticated, service_role;