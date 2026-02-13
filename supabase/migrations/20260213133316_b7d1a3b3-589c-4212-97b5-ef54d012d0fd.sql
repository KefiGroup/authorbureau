-- Create storage bucket for author profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('author-photos', 'author-photos', true);

-- Allow authenticated users to upload their own photos
CREATE POLICY "Authors can upload their own photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'author-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own photos
CREATE POLICY "Authors can update their own photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'author-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own photos
CREATE POLICY "Authors can delete their own photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'author-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public read access for author photos
CREATE POLICY "Author photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'author-photos');