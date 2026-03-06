INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media-graphics', 'social-media-graphics', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authors can upload social graphics"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'social-media-graphics');

CREATE POLICY "Social graphics are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'social-media-graphics');

CREATE POLICY "Authors can delete their own social graphics"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'social-media-graphics' AND (storage.foldername(name))[1] = auth.uid()::text);