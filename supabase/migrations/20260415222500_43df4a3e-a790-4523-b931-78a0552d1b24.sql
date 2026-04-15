CREATE POLICY "Public can read live nodes"
ON public.author_nodes FOR SELECT
TO anon, authenticated
USING (status = 'live');