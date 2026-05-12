-- 1) MEMBERSHIP CONTENT
CREATE OR REPLACE FUNCTION public.viewer_is_member(p_author_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.author_id = p_author_id
      AND s.status IN ('active','trialing','cancelling')
      AND (
        s.subscriber_user_id = auth.uid()
        OR ((auth.jwt() ->> 'email') IS NOT NULL
            AND lower(s.subscriber_email) = lower(auth.jwt() ->> 'email'))
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.viewer_is_member(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.viewer_is_member(uuid) TO authenticated, anon;

DROP POLICY IF EXISTS "Public can read membership content" ON public.membership_content;
DROP POLICY IF EXISTS "Owner reads own membership_content" ON public.membership_content;
DROP POLICY IF EXISTS "Public reads live membership rows" ON public.membership_content;

-- Owner / admin / active member can read full row
CREATE POLICY "Owner or member reads membership_content"
ON public.membership_content FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.author_profiles ap
    WHERE ap.id = membership_content.author_id
      AND ap.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.viewer_is_member(membership_content.author_id)
);

-- Public can read live rows (column privileges below restrict which columns)
CREATE POLICY "Public reads live membership rows"
ON public.membership_content FOR SELECT
TO anon, authenticated
USING (status = 'live');

-- Public marketing view (no Stripe IDs, no email templates)
DROP VIEW IF EXISTS public.membership_content_public;
CREATE VIEW public.membership_content_public
WITH (security_invoker = on) AS
SELECT author_id, name, tagline, benefits, sales_copy,
       monthly_price, currency, status, created_at, updated_at
FROM public.membership_content
WHERE status = 'live';

GRANT SELECT ON public.membership_content_public TO anon, authenticated;

-- Block anon from sensitive columns entirely
REVOKE SELECT (stripe_product_id, stripe_price_id, welcome_emails, monthly_newsletter_template)
  ON public.membership_content FROM anon;

-- 2) REALTIME — remove system_error_log from publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'system_error_log'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.system_error_log';
  END IF;
END $$;

-- 3) REALTIME.MESSAGES topic-scoped policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'messages' AND relnamespace = 'realtime'::regnamespace) THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "auth users read own user topic" ON realtime.messages';
    EXECUTE 'DROP POLICY IF EXISTS "auth users write own user topic" ON realtime.messages';

    EXECUTE $p$
      CREATE POLICY "auth users read own user topic"
      ON realtime.messages FOR SELECT
      TO authenticated
      USING (
        realtime.topic() LIKE 'user:' || auth.uid()::text || '%'
        OR realtime.topic() NOT LIKE 'user:%'
      )
    $p$;

    EXECUTE $p$
      CREATE POLICY "auth users write own user topic"
      ON realtime.messages FOR INSERT
      TO authenticated
      WITH CHECK (
        realtime.topic() LIKE 'user:' || auth.uid()::text || '%'
        OR realtime.topic() NOT LIKE 'user:%'
      )
    $p$;
  END IF;
END $$;