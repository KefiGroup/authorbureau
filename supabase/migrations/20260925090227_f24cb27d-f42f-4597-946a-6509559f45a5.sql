CREATE OR REPLACE FUNCTION public.reset_stuck_generating_nodes()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n integer;
BEGIN
  UPDATE public.author_nodes
  SET status = CASE
    WHEN node_id = 'BP-03' AND NOT (
      jsonb_typeof(content_json->'posts') = 'array' AND jsonb_array_length(content_json->'posts') > 0
    ) THEN 'failed'
    ELSE 'content_ready' END
  WHERE status = 'generating' AND updated_at < now() - interval '5 minutes';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;

UPDATE public.author_nodes SET status='failed'
WHERE node_id='BP-03' AND status IN ('content_ready','generating')
  AND NOT (jsonb_typeof(content_json->'posts')='array' AND jsonb_array_length(content_json->'posts')>0);