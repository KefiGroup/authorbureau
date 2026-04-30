-- ============================================================
-- Wave 3: Admin lifecycle, support workflow, broadcasts
-- ============================================================

-- 1. Author suspension + tier-override fields
ALTER TABLE public.author_profiles
  ADD COLUMN IF NOT EXISTS suspended_at        timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason    text,
  ADD COLUMN IF NOT EXISTS suspended_by        uuid,
  ADD COLUMN IF NOT EXISTS tier_expires_at     timestamptz,
  ADD COLUMN IF NOT EXISTS tier_override_by    uuid,
  ADD COLUMN IF NOT EXISTS tier_override_at    timestamptz;

CREATE INDEX IF NOT EXISTS idx_author_profiles_suspended
  ON public.author_profiles (suspended_at)
  WHERE suspended_at IS NOT NULL;

-- 2. Bug-report workflow + SLA
ALTER TABLE public.bug_reports
  ADD COLUMN IF NOT EXISTS assigned_to             uuid,
  ADD COLUMN IF NOT EXISTS first_response_at       timestamptz,
  ADD COLUMN IF NOT EXISTS first_response_due_at   timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_due_at       timestamptz;

-- 3. Feedback workflow
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS assigned_to             uuid,
  ADD COLUMN IF NOT EXISTS first_response_at       timestamptz;

-- 4. SLA trigger for bug_reports based on priority
CREATE OR REPLACE FUNCTION public.bug_reports_set_sla()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first int;  -- hours
  v_res int;
BEGIN
  IF NEW.first_response_due_at IS NULL OR NEW.resolution_due_at IS NULL THEN
    CASE COALESCE(NEW.priority, 'medium')
      WHEN 'critical' THEN v_first := 4;  v_res := 24;
      WHEN 'medium'   THEN v_first := 8;  v_res := 48;
      ELSE                  v_first := 24; v_res := 120;
    END CASE;
    IF NEW.first_response_due_at IS NULL THEN
      NEW.first_response_due_at := COALESCE(NEW.created_at, now()) + (v_first || ' hours')::interval;
    END IF;
    IF NEW.resolution_due_at IS NULL THEN
      NEW.resolution_due_at := COALESCE(NEW.created_at, now()) + (v_res || ' hours')::interval;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bug_reports_set_sla_trg ON public.bug_reports;
CREATE TRIGGER bug_reports_set_sla_trg
  BEFORE INSERT ON public.bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.bug_reports_set_sla();

-- Backfill existing rows that were created before SLA columns existed
UPDATE public.bug_reports
   SET first_response_due_at = created_at + CASE priority
                                              WHEN 'critical' THEN interval '4 hours'
                                              WHEN 'medium'   THEN interval '8 hours'
                                              ELSE                interval '24 hours'
                                            END,
       resolution_due_at     = created_at + CASE priority
                                              WHEN 'critical' THEN interval '24 hours'
                                              WHEN 'medium'   THEN interval '48 hours'
                                              ELSE                interval '120 hours'
                                            END
 WHERE first_response_due_at IS NULL;

-- 5. Suspension RPC (admins only)
CREATE OR REPLACE FUNCTION public.admin_set_author_suspension(
  p_author_id uuid,
  p_suspend boolean,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_user_id uuid;
  v_pen text;
BEGIN
  IF NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'admin required';
  END IF;

  SELECT user_id, pen_name INTO v_user_id, v_pen
  FROM public.author_profiles WHERE id = p_author_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'author not found';
  END IF;

  IF p_suspend THEN
    UPDATE public.author_profiles
       SET suspended_at = now(),
           suspended_reason = p_reason,
           suspended_by = v_actor
     WHERE id = p_author_id;

    PERFORM public.notify_users(
      ARRAY[v_user_id],
      'Account paused',
      COALESCE('Your Authors Bureau dashboard access has been paused. Reason: ' || p_reason,
               'Your Authors Bureau dashboard access has been paused. Please contact support@authorsbureau.com.'),
      '/dashboard',
      'account.suspended', 'author', p_author_id::text,
      jsonb_build_object('reason', p_reason)
    );

    INSERT INTO public.admin_audit_log (actor_id, event_key, target_type, target_id, payload)
    VALUES (v_actor, 'author.suspended', 'author', p_author_id::text,
            jsonb_build_object('reason', p_reason, 'pen_name', v_pen));
  ELSE
    UPDATE public.author_profiles
       SET suspended_at = NULL,
           suspended_reason = NULL,
           suspended_by = NULL
     WHERE id = p_author_id;

    PERFORM public.notify_users(
      ARRAY[v_user_id],
      'Account reinstated',
      'Welcome back. Your Authors Bureau dashboard access has been restored.',
      '/dashboard',
      'account.reinstated', 'author', p_author_id::text
    );

    INSERT INTO public.admin_audit_log (actor_id, event_key, target_type, target_id, payload)
    VALUES (v_actor, 'author.reinstated', 'author', p_author_id::text,
            jsonb_build_object('pen_name', v_pen));
  END IF;

  RETURN jsonb_build_object('success', true, 'suspended', p_suspend);
END;
$$;

-- 6. Tier override RPC (admins only)
CREATE OR REPLACE FUNCTION public.admin_set_author_tier(
  p_author_id uuid,
  p_tier text,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_user_id uuid;
BEGIN
  IF NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'admin required';
  END IF;
  IF p_tier NOT IN ('free','brand','build','yield') THEN
    RAISE EXCEPTION 'invalid tier';
  END IF;

  SELECT user_id INTO v_user_id FROM public.author_profiles WHERE id = p_author_id;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'author not found'; END IF;

  UPDATE public.author_profiles
     SET subscription_tier = p_tier,
         tier_expires_at = p_expires_at,
         tier_override_by = v_actor,
         tier_override_at = now()
   WHERE id = p_author_id;

  PERFORM public.notify_users(
    ARRAY[v_user_id],
    'Plan updated by admin',
    'Your plan has been set to ' || p_tier || COALESCE(' (until ' || to_char(p_expires_at, 'YYYY-MM-DD') || ')', '') || '.',
    '/dashboard',
    'account.tier_changed', 'author', p_author_id::text,
    jsonb_build_object('tier', p_tier, 'expires_at', p_expires_at)
  );

  INSERT INTO public.admin_audit_log (actor_id, event_key, target_type, target_id, payload)
  VALUES (v_actor, 'author.tier_override', 'author', p_author_id::text,
          jsonb_build_object('tier', p_tier, 'expires_at', p_expires_at));

  RETURN jsonb_build_object('success', true, 'tier', p_tier);
END;
$$;

-- 7. Broadcast RPC (admins only) — fans out to filtered audience
CREATE OR REPLACE FUNCTION public.admin_send_broadcast(
  p_title text,
  p_message text,
  p_link text DEFAULT NULL,
  p_audience text DEFAULT 'all'   -- 'all' | 'tier:brand' | 'tier:build' | 'tier:yield' | 'published'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_uids uuid[];
  v_count int := 0;
BEGIN
  IF NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'admin required';
  END IF;

  IF p_audience = 'all' THEN
    SELECT array_agg(DISTINCT user_id) INTO v_uids
      FROM public.author_profiles
     WHERE user_id IS NOT NULL AND suspended_at IS NULL;
  ELSIF p_audience LIKE 'tier:%' THEN
    SELECT array_agg(DISTINCT user_id) INTO v_uids
      FROM public.author_profiles
     WHERE user_id IS NOT NULL AND suspended_at IS NULL
       AND subscription_tier = split_part(p_audience, ':', 2);
  ELSIF p_audience = 'published' THEN
    SELECT array_agg(DISTINCT ap.user_id) INTO v_uids
      FROM public.author_profiles ap
     WHERE ap.user_id IS NOT NULL
       AND ap.suspended_at IS NULL
       AND EXISTS (SELECT 1 FROM public.books b WHERE b.author_id = ap.id AND b.published_at IS NOT NULL);
  ELSE
    RAISE EXCEPTION 'invalid audience: %', p_audience;
  END IF;

  v_count := public.notify_users(
    v_uids, p_title, p_message, p_link,
    'admin.broadcast', 'broadcast', NULL,
    jsonb_build_object('audience', p_audience)
  );

  INSERT INTO public.admin_audit_log (actor_id, event_key, target_type, target_id, payload)
  VALUES (v_actor, 'admin.broadcast', 'broadcast', NULL,
          jsonb_build_object('audience', p_audience, 'recipient_count', v_count, 'title', p_title));

  RETURN jsonb_build_object('success', true, 'recipient_count', v_count);
END;
$$;