CREATE POLICY "Anon can view listed profiles via view"
  ON public.author_profiles
  FOR SELECT
  TO anon
  USING (directory_status IN ('listed', 'featured', 'verified'));