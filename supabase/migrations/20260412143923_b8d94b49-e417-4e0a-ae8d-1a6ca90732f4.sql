
-- Allow authenticated users to insert their own assets
CREATE POLICY "Users can insert their own generated assets"
ON public.generated_assets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

-- Allow authenticated users to select their own assets
CREATE POLICY "Users can view their own generated assets"
ON public.generated_assets
FOR SELECT
TO authenticated
USING (auth.uid() = author_id);

-- Allow authenticated users to update their own assets
CREATE POLICY "Users can update their own generated assets"
ON public.generated_assets
FOR UPDATE
TO authenticated
USING (auth.uid() = author_id);
