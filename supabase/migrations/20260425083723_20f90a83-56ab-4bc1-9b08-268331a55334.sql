-- 1. Drop the old unique index that prevented per-node asset rows
DROP INDEX IF EXISTS public.idx_marketing_assets_unique_type;

-- New uniqueness: one asset per (book, author, asset_type) where asset_type now embeds the node id
-- e.g. "sales_copy:BA-15", "social_pack:BA-15", "email_announcement:BA-15", "bonus:BA-15"
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_assets_unique_type
  ON public.marketing_assets (
    COALESCE(book_id, '00000000-0000-0000-0000-000000000000'::uuid),
    author_id,
    asset_type
  );

-- 2. Safety-net trigger: when an author_node flips to status='live', enqueue asset-pack generation
CREATE OR REPLACE FUNCTION public.trigger_generate_asset_pack()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

    IF v_key IS NULL THEN
      -- Fall back to anon-callable invocation; the function itself uses service-role internally
      v_key := current_setting('app.settings.service_role_key', true);
    END IF;

    v_url := 'https://tubpbslfrxyfhldkcyyq.supabase.co/functions/v1/generate-asset-pack';

    BEGIN
      PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(v_key, '')
        ),
        body := jsonb_build_object(
          'author_id', NEW.author_id,
          'node_id', NEW.node_id,
          'book_id', NEW.book_id,
          'source', 'db_trigger'
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Never block the status update if the HTTP call fails
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS author_nodes_asset_pack_trigger ON public.author_nodes;
CREATE TRIGGER author_nodes_asset_pack_trigger
AFTER INSERT OR UPDATE OF status ON public.author_nodes
FOR EACH ROW
EXECUTE FUNCTION public.trigger_generate_asset_pack();