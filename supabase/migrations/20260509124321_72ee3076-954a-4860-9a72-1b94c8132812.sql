CREATE OR REPLACE FUNCTION public.trigger_abby_gate_engine()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'live')
     OR (TG_OP = 'INSERT' AND NEW.status = 'live') THEN
    BEGIN
      SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_key := NULL;
    END;

    v_url := 'https://tubpbslfrxyfhldkcyyq.supabase.co/functions/v1/abby-gate-engine';

    BEGIN
      PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(v_key, '')
        ),
        body := jsonb_build_object(
          'author_id', NEW.author_id,
          'book_id', NEW.book_id,
          'source', 'db_trigger'
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL; -- never block status update
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS author_nodes_gate_engine_trigger ON public.author_nodes;
CREATE TRIGGER author_nodes_gate_engine_trigger
AFTER INSERT OR UPDATE OF status ON public.author_nodes
FOR EACH ROW
EXECUTE FUNCTION public.trigger_abby_gate_engine();