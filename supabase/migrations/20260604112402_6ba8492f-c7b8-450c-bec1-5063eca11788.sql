-- author_nodes: hide Stripe internal identifiers from anon + authenticated
REVOKE SELECT ON public.author_nodes FROM anon, authenticated;
GRANT SELECT (id, author_id, node_id, node_name, personalised_name, status, content_json, activated_at, revenue_to_date, created_at, microsite_url, third_party_url, payment_link, marketing_activated_at, current_step, workbook_pdf_url, price_usd, delivery_type, delivery_url, currency, book_id, archetype, updated_at, cover_image_url, cover_image_history) ON public.author_nodes TO anon, authenticated;

-- courses: hide Stripe internal identifiers from anon + authenticated
REVOKE SELECT ON public.courses FROM anon, authenticated;
GRANT SELECT (id, author_id, title, description, cover_image_url, price, currency, status, created_at, updated_at, book_id, source_asset_id, course_format, target_student, transformation_promises, workshop_schedule, subtitle, course_slug, delivery_url, tagline) ON public.courses TO anon, authenticated;

-- subscriptions: hide Stripe internal identifiers from subscribers/authors
REVOKE SELECT ON public.subscriptions FROM anon, authenticated;
GRANT SELECT (id, author_id, subscriber_email, subscriber_name, subscriber_user_id, status, price_usd, currency, current_period_start, current_period_end, cancelled_at, created_at, updated_at) ON public.subscriptions TO anon, authenticated;

-- reading_club_members: validate email format on public insert
DROP POLICY IF EXISTS "Anyone can join reading club" ON public.reading_club_members;
CREATE POLICY "Anyone can join reading club"
  ON public.reading_club_members
  FOR INSERT
  TO public
  WITH CHECK (email IS NOT NULL AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- generated_assets: stop cross-author realtime broadcast
ALTER PUBLICATION supabase_realtime DROP TABLE public.generated_assets;