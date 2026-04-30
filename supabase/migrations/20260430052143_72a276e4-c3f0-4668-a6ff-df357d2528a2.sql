DROP POLICY IF EXISTS "Authors can manage their own payout settings" ON public.author_payout_settings;

CREATE POLICY "Authors can manage their own payout settings"
  ON public.author_payout_settings
  FOR ALL
  TO authenticated
  USING (
    author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
  );