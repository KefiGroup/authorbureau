CREATE POLICY "Published sales pages are publicly viewable"
ON public.generated_assets
FOR SELECT
TO public
USING (asset_type LIKE 'builder_sales_page_%');