-- Sprint 54: Library asset buckets for the uniform library_asset contract.
INSERT INTO storage.buckets (id, name, public)
VALUES ('library-assets', 'library-assets', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('library-assets-public', 'library-assets-public', true)
ON CONFLICT (id) DO NOTHING;

-- Helper: resolve the caller's author_profile id.
-- We compare to (storage.foldername(name))[1] which is the first path segment.

-- ===== library-assets (private) =====

CREATE POLICY "library-assets: author can read own folder"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'library-assets'
  AND (
    EXISTS (
      SELECT 1 FROM public.author_profiles ap
      WHERE ap.user_id = auth.uid()
        AND ap.id::text = (storage.foldername(name))[1]
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "library-assets: author can insert own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'library-assets'
  AND (
    EXISTS (
      SELECT 1 FROM public.author_profiles ap
      WHERE ap.user_id = auth.uid()
        AND ap.id::text = (storage.foldername(name))[1]
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "library-assets: author can update own folder"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'library-assets'
  AND (
    EXISTS (
      SELECT 1 FROM public.author_profiles ap
      WHERE ap.user_id = auth.uid()
        AND ap.id::text = (storage.foldername(name))[1]
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "library-assets: author can delete own folder"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'library-assets'
  AND (
    EXISTS (
      SELECT 1 FROM public.author_profiles ap
      WHERE ap.user_id = auth.uid()
        AND ap.id::text = (storage.foldername(name))[1]
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- ===== library-assets-public (public read) =====

CREATE POLICY "library-assets-public: anyone can read"
ON storage.objects FOR SELECT
USING (bucket_id = 'library-assets-public');

CREATE POLICY "library-assets-public: author can insert own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'library-assets-public'
  AND (
    EXISTS (
      SELECT 1 FROM public.author_profiles ap
      WHERE ap.user_id = auth.uid()
        AND ap.id::text = (storage.foldername(name))[1]
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "library-assets-public: author can update own folder"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'library-assets-public'
  AND (
    EXISTS (
      SELECT 1 FROM public.author_profiles ap
      WHERE ap.user_id = auth.uid()
        AND ap.id::text = (storage.foldername(name))[1]
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "library-assets-public: author can delete own folder"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'library-assets-public'
  AND (
    EXISTS (
      SELECT 1 FROM public.author_profiles ap
      WHERE ap.user_id = auth.uid()
        AND ap.id::text = (storage.foldername(name))[1]
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);