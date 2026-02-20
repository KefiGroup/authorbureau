
-- Create book-covers storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true);

-- Allow authenticated users to upload their own book covers
CREATE POLICY "Authors can upload book covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'book-covers'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own book covers
CREATE POLICY "Authors can update their book covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'book-covers'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access for book covers
CREATE POLICY "Book covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-covers');
