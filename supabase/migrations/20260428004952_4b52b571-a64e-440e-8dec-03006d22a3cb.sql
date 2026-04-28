-- Auto-sync downstream tables whenever auth.users.email changes,
-- regardless of who initiated the change (PublishNow webhook, admin, SQL, etc.)
CREATE OR REPLACE FUNCTION public.sync_email_change_to_downstream()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_books_count INT := 0;
  v_settings_updated BOOLEAN := FALSE;
  v_old_email TEXT;
  v_new_email TEXT;
BEGIN
  v_old_email := lower(coalesce(OLD.email, ''));
  v_new_email := lower(coalesce(NEW.email, ''));

  IF v_old_email = v_new_email OR v_new_email = '' THEN
    RETURN NEW;
  END IF;

  -- Update books linked by stale owner_email
  WITH updated AS (
    UPDATE public.books
       SET owner_email = v_new_email
     WHERE lower(coalesce(owner_email, '')) = v_old_email
        OR (author_id = NEW.id AND lower(coalesce(owner_email, '')) <> v_new_email)
    RETURNING id
  )
  SELECT count(*) INTO v_books_count FROM updated;

  -- Update reply-to only if it still matches the old email
  UPDATE public.author_email_settings
     SET reply_to_email = v_new_email
   WHERE author_id = NEW.id
     AND lower(coalesce(reply_to_email, '')) = v_old_email;
  GET DIAGNOSTICS v_settings_updated = ROW_COUNT;

  INSERT INTO public.email_sync_log (
    user_id, old_email, new_email, source,
    auth_updated, books_updated_count, settings_updated
  ) VALUES (
    NEW.id, v_old_email, v_new_email, 'auth_trigger',
    TRUE, v_books_count, v_settings_updated
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the auth update if the audit/sync side fails
  INSERT INTO public.email_sync_log (
    user_id, old_email, new_email, source, error_message
  ) VALUES (
    NEW.id, v_old_email, v_new_email, 'auth_trigger',
    'trigger error: ' || SQLERRM
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.sync_email_change_to_downstream();