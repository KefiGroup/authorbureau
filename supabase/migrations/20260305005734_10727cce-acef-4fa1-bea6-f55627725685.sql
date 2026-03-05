-- Create manuscripts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('manuscripts', 'manuscripts', false);

-- RLS: Authors can upload their own manuscripts
CREATE POLICY "Authors can upload manuscripts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'manuscripts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Authors can view their own manuscripts
CREATE POLICY "Authors can view own manuscripts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'manuscripts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Authors can delete their own manuscripts
CREATE POLICY "Authors can delete own manuscripts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'manuscripts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Authors can update their own manuscripts
CREATE POLICY "Authors can update own manuscripts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'manuscripts' AND (storage.foldername(name))[1] = auth.uid()::text);