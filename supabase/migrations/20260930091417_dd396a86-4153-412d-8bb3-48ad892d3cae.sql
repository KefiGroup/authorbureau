-- Public form inserts: real validation
DROP POLICY IF EXISTS "Anyone can insert messages" ON public.contact_messages;
CREATE POLICY "Anyone can send a valid contact message" ON public.contact_messages FOR INSERT TO anon, authenticated
WITH CHECK (sender_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(sender_email) <= 320
  AND length(coalesce(sender_name,'')) BETWEEN 1 AND 200 AND length(coalesce(message,'')) BETWEEN 1 AND 10000
  AND admin_notes IS NULL);

DROP POLICY IF EXISTS "Anyone can submit a service inquiry" ON public.service_inquiries;
CREATE POLICY "Anyone can submit a valid service inquiry" ON public.service_inquiries FOR INSERT TO anon, authenticated
WITH CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 320
  AND length(coalesce(full_name,'')) BETWEEN 1 AND 200 AND length(coalesce(message,'')) <= 10000
  AND length(coalesce(author_slug,'')) BETWEEN 1 AND 200);

DROP POLICY IF EXISTS "Anyone can submit an application" ON public.author_applications;
CREATE POLICY "Anyone can submit a valid application" ON public.author_applications FOR INSERT TO anon, authenticated
WITH CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 320
  AND length(coalesce(full_name,'')) BETWEEN 1 AND 200 AND length(coalesce(bio,'')) <= 10000
  AND coalesce(status,'pending') = 'pending');

DROP POLICY IF EXISTS "Anyone can insert bug reports" ON public.bug_reports;
CREATE POLICY "Anyone can submit a valid bug report" ON public.bug_reports FOR INSERT TO anon, authenticated
WITH CHECK (length(coalesce(description,'')) BETWEEN 1 AND 10000
  AND (user_id IS NULL OR user_id = auth.uid())
  AND admin_notes IS NULL AND assigned_to IS NULL AND resolved_at IS NULL);

DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.feedback;
CREATE POLICY "Anyone can submit valid feedback" ON public.feedback FOR INSERT TO anon, authenticated
WITH CHECK (length(coalesce(description,'')) BETWEEN 1 AND 10000
  AND (user_id IS NULL OR user_id = auth.uid())
  AND admin_notes IS NULL AND assigned_to IS NULL);

DROP POLICY IF EXISTS "Anyone can sign up" ON public.newsletter_signups;
CREATE POLICY "Anyone can sign up with a valid email" ON public.newsletter_signups FOR INSERT TO anon, authenticated
WITH CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 320);

DROP POLICY IF EXISTS "Anyone can register for a webinar" ON public.webinar_registrations;
CREATE POLICY "Anyone can register for a live webinar" ON public.webinar_registrations FOR INSERT TO anon, authenticated
WITH CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 320
  AND length(coalesce(name,'')) <= 200 AND coalesce(attended,false) = false
  AND EXISTS (SELECT 1 FROM public.webinars w WHERE w.id = webinar_id));

-- Public reads: scoped
DROP POLICY IF EXISTS "Testimonials are publicly viewable" ON public.testimonials;
CREATE POLICY "Testimonials for approved books are viewable" ON public.testimonials FOR SELECT
USING (book_id IS NULL OR EXISTS (SELECT 1 FROM public.books b WHERE b.id = testimonials.book_id AND b.published_at IS NOT NULL));

DROP POLICY IF EXISTS "Anyone can view testimonials" ON public.author_testimonials;
CREATE POLICY "Testimonials of listed authors are viewable" ON public.author_testimonials FOR SELECT
USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.author_profiles ap WHERE ap.user_id = author_testimonials.author_id
  AND ap.directory_status IN ('listed','featured','verified')));

DROP POLICY IF EXISTS "Anyone can view featured books" ON public.reading_club_featured_books;
CREATE POLICY "Featured approved books are viewable" ON public.reading_club_featured_books FOR SELECT
USING (EXISTS (SELECT 1 FROM public.books b WHERE b.id = reading_club_featured_books.book_id AND b.published_at IS NOT NULL));

DROP POLICY IF EXISTS "Anyone can view discussions" ON public.reading_club_discussions;
CREATE POLICY "Signed-in readers can view discussions" ON public.reading_club_discussions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.books b WHERE b.id = reading_club_discussions.book_id AND b.published_at IS NOT NULL));

DROP POLICY IF EXISTS "node_registry readable by all" ON public.node_registry;
CREATE POLICY "Signed-in users can read the module list" ON public.node_registry FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can read node gating" ON public.node_gating;
CREATE POLICY "Signed-in users can read module lock rules" ON public.node_gating FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can read platform_config" ON public.platform_config;
CREATE POLICY "Signed-in users can read the platform fee" ON public.platform_config FOR SELECT TO authenticated USING (key = 'platform_fee_percent');

-- Storage: public buckets serve by link; no folder browsing; owners keep access
DROP POLICY IF EXISTS "Author photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Book covers are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Email assets are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Social graphics are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "library-assets-public: anyone can read" ON storage.objects;
DROP POLICY IF EXISTS "Product covers are publicly readable" ON storage.objects;
CREATE POLICY "Owners can read their public-bucket files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('author-photos','book-covers','email-assets','social-media-graphics','library-assets-public','product-covers')
  AND (owner_id = (select auth.uid()::text) OR public.has_role(auth.uid(),'admin')));

DROP POLICY IF EXISTS "Free audiobook sample chapter is public" ON storage.objects;
CREATE POLICY "Signed-in users can play the free audiobook sample" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'audiobook-audio' AND storage.filename(name) ~ '^chapter-0[^0-9]' AND auth.uid() IS NOT NULL);