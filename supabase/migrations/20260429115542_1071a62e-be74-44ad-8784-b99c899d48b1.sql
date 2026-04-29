
-- =============================================================
-- TIER 3 — BACKEND HARDENING
-- 1. Fix function search_path (mutable -> public)
-- 2. Add missing RLS policies on quiz_responses
-- =============================================================

-- ---------- 1. Pin search_path on 6 functions ----------

ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.generate_account_id() SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.validate_reading_challenge_status() SET search_path = public;

-- ---------- 2. quiz_responses RLS policies ----------
-- Edge functions use service_role (bypasses RLS), so this table currently
-- has RLS enabled with NO policies => fully locked from client SDK, which
-- is the intended behavior. Add explicit policies to:
--   * Allow admins to read quiz responses (for analytics / support)
--   * Block all client-side writes / reads for everyone else
-- (Service role continues to bypass RLS for inserts from edge functions.)

DROP POLICY IF EXISTS "Admins can view quiz responses" ON public.quiz_responses;
CREATE POLICY "Admins can view quiz responses"
ON public.quiz_responses
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
