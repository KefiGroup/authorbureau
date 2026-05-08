
CREATE OR REPLACE FUNCTION public.admin_error_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v jsonb;
BEGIN
  -- Admin verification is performed by the calling edge function (admin-data),
  -- which uses the service-role client. auth.uid() is null in that context, so
  -- we cannot recheck here. Keep this RPC service-role-only via REVOKE below.
  SELECT jsonb_build_object(
    'h1',  jsonb_build_object(
      'critical', COUNT(*) FILTER (WHERE severity='critical' AND created_at > now() - interval '1 hour'),
      'error',    COUNT(*) FILTER (WHERE severity='error'    AND created_at > now() - interval '1 hour'),
      'warning',  COUNT(*) FILTER (WHERE severity='warning'  AND created_at > now() - interval '1 hour')
    ),
    'h24', jsonb_build_object(
      'critical', COUNT(*) FILTER (WHERE severity='critical' AND created_at > now() - interval '24 hours'),
      'error',    COUNT(*) FILTER (WHERE severity='error'    AND created_at > now() - interval '24 hours'),
      'warning',  COUNT(*) FILTER (WHERE severity='warning'  AND created_at > now() - interval '24 hours')
    ),
    'd7',  jsonb_build_object(
      'critical', COUNT(*) FILTER (WHERE severity='critical' AND created_at > now() - interval '7 days'),
      'error',    COUNT(*) FILTER (WHERE severity='error'    AND created_at > now() - interval '7 days'),
      'warning',  COUNT(*) FILTER (WHERE severity='warning'  AND created_at > now() - interval '7 days')
    ),
    'unresolved_critical', (SELECT COUNT(*) FROM public.system_error_log WHERE severity='critical' AND resolved_at IS NULL),
    'unresolved_total',    (SELECT COUNT(*) FROM public.system_error_log WHERE resolved_at IS NULL)
  )
  INTO v
  FROM public.system_error_log
  WHERE created_at > now() - interval '7 days';
  RETURN v;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_error_summary() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_acknowledge_errors(p_ids uuid[], p_actor uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
  v_actor uuid := COALESCE(p_actor, auth.uid());
BEGIN
  -- Admin gate: either called from edge fn with verified actor, or by an admin user.
  IF p_actor IS NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.system_error_log
     SET acknowledged_by = v_actor, acknowledged_at = now()
   WHERE id = ANY(p_ids) AND acknowledged_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_acknowledge_errors(uuid[], uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_resolve_errors(p_ids uuid[], p_actor uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
  v_actor uuid := COALESCE(p_actor, auth.uid());
BEGIN
  IF p_actor IS NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.system_error_log
     SET resolved_by = v_actor,
         resolved_at = now(),
         acknowledged_by = COALESCE(acknowledged_by, v_actor),
         acknowledged_at = COALESCE(acknowledged_at, now())
   WHERE id = ANY(p_ids) AND resolved_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  BEGIN
    INSERT INTO public.admin_audit_log(actor_id, event_key, target_type, payload)
    VALUES (v_actor, 'errors.resolved', 'system_error_log', jsonb_build_object('ids', p_ids, 'count', v_count));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_resolve_errors(uuid[], uuid) FROM PUBLIC, anon, authenticated;
