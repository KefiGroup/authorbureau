
-- Drop existing policies that don't work
DROP POLICY IF EXISTS "Users can insert their own generated assets" ON public.generated_assets;
DROP POLICY IF EXISTS "Users can view their own generated assets" ON public.generated_assets;
DROP POLICY IF EXISTS "Users can update their own generated assets" ON public.generated_assets;
DROP POLICY IF EXISTS "Anon can view sales page assets" ON public.generated_assets;

-- New policies that check author_profiles.user_id
CREATE POLICY "Users can view their own generated assets"
ON public.generated_assets FOR SELECT TO authenticated
USING (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert their own generated assets"
ON public.generated_assets FOR INSERT TO authenticated
WITH CHECK (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their own generated assets"
ON public.generated_assets FOR UPDATE TO authenticated
USING (
  author_id IN (SELECT id FROM public.author_profiles WHERE user_id = auth.uid())
);

-- Keep anon access for public sales pages
CREATE POLICY "Anon can view sales page assets"
ON public.generated_assets FOR SELECT TO anon
USING (asset_type LIKE 'builder_sales_page_%');
