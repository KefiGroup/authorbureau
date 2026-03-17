-- Create course-videos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-videos', 'course-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated authors to upload videos
CREATE POLICY "Authors can upload course videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-videos');

-- Allow authenticated authors to update their uploads
CREATE POLICY "Authors can update course videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course-videos');

-- Allow authenticated authors to delete their uploads
CREATE POLICY "Authors can delete course videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-videos');

-- Allow public read access for course videos
CREATE POLICY "Public can view course videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-videos');