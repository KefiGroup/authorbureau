-- Helper: does the signed-in user own this author folder?
create or replace function public.owns_author_folder(_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    _folder = coalesce(auth.uid()::text, '~none~')
    or exists (select 1 from public.author_profiles ap where ap.id::text = _folder and ap.user_id = auth.uid())
    or public.has_role(auth.uid(), 'admin'::app_role);
$$;

-- Helper: has the signed-in user bought an audiobook for this book?
create or replace function public.purchased_audiobook_for_book(_book_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.purchases p
    join public.audiobooks a on a.id = p.product_id
    where a.book_id::text = _book_folder
      and lower(p.customer_email) = lower(coalesce(auth.jwt() ->> 'email', '~none~'))
      and coalesce(p.refund_status, '') <> 'refunded'
  );
$$;

-- Helper: has the signed-in user access to this course folder?
create or replace function public.can_access_course_folder(_folder text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.owns_author_folder(_folder)
    or exists (
      select 1 from public.courses c
      where c.author_id::text = _folder and public.can_access_course(c.id)
    );
$$;

drop policy if exists "Public can read audiobook audio" on storage.objects;
drop policy if exists "Public can view course videos" on storage.objects;

-- Free sample: the first chapter of any audiobook stays open.
create policy "Free audiobook sample chapter is public"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'audiobook-audio'
  and storage.filename(name) ~ '^chapter-0[^0-9]'
);

create policy "Audiobook audio for owners, admins and buyers"
on storage.objects for select to authenticated
using (
  bucket_id = 'audiobook-audio'
  and (
    public.owns_author_folder((storage.foldername(name))[1])
    or public.purchased_audiobook_for_book((storage.foldername(name))[2])
  )
);

create policy "Course videos for owners, admins and enrolled students"
on storage.objects for select to authenticated
using (
  bucket_id = 'course-videos'
  and public.can_access_course_folder((storage.foldername(name))[1])
);