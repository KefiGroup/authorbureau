-- system_error_log: centralized error tracking for admin visibility
CREATE TABLE IF NOT EXISTS public.system_error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('edge_function','webhook','cron','email_queue','stripe','client','other')),
  function_name text,
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('critical','error','warning')),
  message text NOT NULL,
  stack text,
  context jsonb,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_error_log_created ON public.system_error_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_error_log_severity ON public.system_error_log(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_error_log_source ON public.system_error_log(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_error_log_unresolved ON public.system_error_log(resolved_at) WHERE resolved_at IS NULL;

ALTER TABLE public.system_error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system errors"
  ON public.system_error_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update system errors"
  ON public.system_error_log FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert system errors"
  ON public.system_error_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Realtime
ALTER TABLE public.system_error_log REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'system_error_log';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.system_error_log';
  END IF;
END $$;

-- RPC: acknowledge errors (admin)
CREATE OR REPLACE FUNCTION public.admin_acknowledge_errors(p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.system_error_log
     SET acknowledged_by = auth.uid(), acknowledged_at = now()
   WHERE id = ANY(p_ids) AND acknowledged_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- RPC: resolve errors (admin)
CREATE OR REPLACE FUNCTION public.admin_resolve_errors(p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.system_error_log
     SET resolved_by = auth.uid(),
         resolved_at = now(),
         acknowledged_by = COALESCE(acknowledged_by, auth.uid()),
         acknowledged_at = COALESCE(acknowledged_at, now())
   WHERE id = ANY(p_ids) AND resolved_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Audit log if available
  BEGIN
    INSERT INTO public.admin_audit_log(actor_id, event_key, target_type, payload)
    VALUES (auth.uid(), 'errors.resolved', 'system_error_log', jsonb_build_object('ids', p_ids, 'count', v_count));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_count;
END;
$$;

-- Helper: severity-bucketed counts
CREATE OR REPLACE FUNCTION public.admin_error_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
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
$$;