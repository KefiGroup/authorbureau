-- Drop existing broken policies on author_email_settings
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'author_email_settings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.author_email_settings', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.author_email_settings ENABLE ROW LEVEL SECURITY;

-- Owner SELECT
CREATE POLICY "Authors can view their own email settings"
ON public.author_email_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.author_profiles ap
    WHERE ap.id = author_email_settings.author_id
      AND ap.user_id = auth.uid()
  )
);

-- Owner INSERT
CREATE POLICY "Authors can insert their own email settings"
ON public.author_email_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.author_profiles ap
    WHERE ap.id = author_email_settings.author_id
      AND ap.user_id = auth.uid()
  )
);

-- Owner UPDATE
CREATE POLICY "Authors can update their own email settings"
ON public.author_email_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.author_profiles ap
    WHERE ap.id = author_email_settings.author_id
      AND ap.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.author_profiles ap
    WHERE ap.id = author_email_settings.author_id
      AND ap.user_id = auth.uid()
  )
);

-- Owner DELETE (optional but consistent)
CREATE POLICY "Authors can delete their own email settings"
ON public.author_email_settings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.author_profiles ap
    WHERE ap.id = author_email_settings.author_id
      AND ap.user_id = auth.uid()
  )
);

-- Admin read access
CREATE POLICY "Admins can view all email settings"
ON public.author_email_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
