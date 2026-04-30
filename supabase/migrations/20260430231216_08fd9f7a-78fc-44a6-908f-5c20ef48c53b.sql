
-- 1. Admin audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  event_key text NOT NULL,
  target_type text,
  target_id text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_event_key ON public.admin_audit_log(event_key);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON public.admin_audit_log(target_type, target_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert audit log"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (true);

-- 2. notify_users helper — inserts notification rows + audit log
CREATE OR REPLACE FUNCTION public.notify_users(
  p_user_ids uuid[],
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_event_key text DEFAULT 'system.notify',
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_uid uuid;
BEGIN
  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOREACH v_uid IN ARRAY p_user_ids LOOP
    IF v_uid IS NULL THEN CONTINUE; END IF;
    INSERT INTO public.notifications (user_id, title, message, link, read)
    VALUES (v_uid, p_title, p_message, p_link, false);
    v_count := v_count + 1;
  END LOOP;

  -- Single audit row for the whole event
  BEGIN
    INSERT INTO public.admin_audit_log (event_key, target_type, target_id, payload)
    VALUES (
      p_event_key,
      p_target_type,
      p_target_id,
      jsonb_build_object('recipient_count', v_count, 'title', p_title) || COALESCE(p_payload, '{}'::jsonb)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_count;
END;
$$;

-- 3. notify_all_admins helper — resolves admin user_ids and forwards to notify_users
CREATE OR REPLACE FUNCTION public.notify_all_admins(
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_event_key text DEFAULT 'admin.notify',
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admins uuid[];
BEGIN
  SELECT array_agg(DISTINCT user_id) INTO v_admins
  FROM public.user_roles
  WHERE role = 'admin';

  RETURN public.notify_users(v_admins, p_title, p_message, p_link, p_event_key, p_target_type, p_target_id, p_payload);
END;
$$;

-- 4. Books lifecycle columns
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_round int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_review_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 5. Trigger function: emits notifications + audit on approval_status changes
CREATE OR REPLACE FUNCTION public.books_after_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old text;
  v_new text;
  v_title text := COALESCE(NEW.title, 'Untitled');
  v_slug text := COALESCE(NEW.slug, NEW.id::text);
  v_author_uid uuid;
  v_admin_link text := '/admin?tab=books';
  v_author_link text := '/dashboard?section=books';
  v_event jsonb;
BEGIN
  v_old := COALESCE(OLD.approval_status, '');
  v_new := COALESCE(NEW.approval_status, '');

  IF v_old = v_new THEN
    RETURN NEW;
  END IF;

  -- Resolve author auth uid via author_profiles
  SELECT ap.user_id INTO v_author_uid
  FROM public.author_profiles ap
  WHERE ap.id = NEW.author_id
  LIMIT 1;

  -- Append history record
  v_event := jsonb_build_object(
    'at', now(),
    'from', v_old,
    'to', v_new,
    'note', NEW.rejection_note
  );
  NEW.review_history := COALESCE(OLD.review_history, '[]'::jsonb) || jsonb_build_array(v_event);
  NEW.last_review_action_at := now();

  -- SUBMITTED (any → pending)
  IF v_new = 'pending' AND v_old <> 'pending' THEN
    IF NEW.submitted_at IS NULL THEN
      NEW.submitted_at := now();
    END IF;
    -- If this is a resubmission (from rejected/changes_requested), bump round
    IF v_old IN ('rejected','changes_requested') THEN
      NEW.review_round := COALESCE(OLD.review_round, 1) + 1;
    END IF;

    PERFORM public.notify_all_admins(
      'New book pending review: ' || v_title,
      COALESCE(NEW.author_name, 'An author') || ' submitted "' || v_title || '" (round ' || NEW.review_round || ')',
      v_admin_link,
      'book.submitted',
      'book',
      NEW.id::text,
      jsonb_build_object('book_id', NEW.id, 'title', v_title, 'round', NEW.review_round)
    );
  END IF;

  -- APPROVED
  IF v_new = 'approved' AND v_old <> 'approved' AND v_author_uid IS NOT NULL THEN
    PERFORM public.notify_users(
      ARRAY[v_author_uid],
      'Your book is live 🎉',
      '"' || v_title || '" has been approved and your book page is now public.',
      '/books/' || v_slug,
      'book.approved',
      'book',
      NEW.id::text
    );
  END IF;

  -- REJECTED
  IF v_new = 'rejected' AND v_old <> 'rejected' AND v_author_uid IS NOT NULL THEN
    PERFORM public.notify_users(
      ARRAY[v_author_uid],
      'Submission not approved: ' || v_title,
      COALESCE('Reason: ' || NEW.rejection_note, 'Your submission was not approved. Please contact support for details.'),
      v_author_link,
      'book.rejected',
      'book',
      NEW.id::text,
      jsonb_build_object('reason', NEW.rejection_note)
    );
  END IF;

  -- CHANGES REQUESTED
  IF v_new = 'changes_requested' AND v_old <> 'changes_requested' AND v_author_uid IS NOT NULL THEN
    PERFORM public.notify_users(
      ARRAY[v_author_uid],
      'Changes requested on: ' || v_title,
      COALESCE('Admin note: ' || NEW.rejection_note, 'Please review the requested changes and resubmit.'),
      v_author_link,
      'book.changes_requested',
      'book',
      NEW.id::text,
      jsonb_build_object('note', NEW.rejection_note)
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the book update because of a notification failure
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS books_after_status_change_trg ON public.books;
CREATE TRIGGER books_after_status_change_trg
  BEFORE UPDATE OF approval_status ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.books_after_status_change();
