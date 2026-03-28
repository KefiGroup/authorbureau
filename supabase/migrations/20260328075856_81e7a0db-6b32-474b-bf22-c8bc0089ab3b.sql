CREATE POLICY "Users can read own book"
ON public.books FOR SELECT
TO authenticated
USING (auth.uid() = author_id);