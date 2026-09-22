-- Entitlement helper: did the current signed-in user buy this product?
create or replace function public.has_purchased(_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.purchases p
    where p.product_id = _product_id
      and lower(p.customer_email) = lower(coalesce(auth.jwt() ->> 'email', '~none~'))
      and coalesce(p.refund_status, '') <> 'refunded'
  );
$$;

create or replace function public.can_access_course(_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_purchased(_course_id)
    or exists (select 1 from public.course_enrollments e where e.course_id = _course_id and e.user_id = auth.uid())
    or exists (select 1 from public.courses c where c.id = _course_id and c.author_id = auth.uid())
    or public.has_role(auth.uid(), 'admin'::app_role);
$$;

revoke execute on function public.has_purchased(uuid) from anon;
revoke execute on function public.can_access_course(uuid) from anon;

-- ── Lock the paid-content tables ──
drop policy if exists "Published courses are public" on public.courses;
create policy "Course content for buyers, authors and admins"
on public.courses for select to authenticated
using (public.can_access_course(id));

drop policy if exists "Published course modules are public" on public.course_modules;
create policy "Course modules for buyers, authors and admins"
on public.course_modules for select to authenticated
using (public.can_access_course(course_id));

drop policy if exists "Published course lessons are public" on public.course_lessons;
create policy "Course lessons for buyers, authors and admins"
on public.course_lessons for select to authenticated
using (exists (
  select 1 from public.course_modules cm
  where cm.id = course_lessons.module_id and public.can_access_course(cm.course_id)
));

drop policy if exists "Published course quizzes are public" on public.course_quizzes;
create policy "Course quizzes for buyers, authors and admins"
on public.course_quizzes for select to authenticated
using (exists (
  select 1 from public.course_lessons cl
  join public.course_modules cm on cm.id = cl.module_id
  where cl.id = course_quizzes.lesson_id and public.can_access_course(cm.course_id)
));

drop policy if exists "Published course deliverables are public" on public.course_deliverables;
create policy "Course deliverables for buyers, authors and admins"
on public.course_deliverables for select to authenticated
using (public.can_access_course(course_id));

drop policy if exists "Published audiobooks are public" on public.audiobooks;
create policy "Audiobook content for buyers, authors and admins"
on public.audiobooks for select to authenticated
using (
  public.has_purchased(id)
  or author_id in (select ap.id from public.author_profiles ap where ap.user_id = auth.uid())
  or public.has_role(auth.uid(), 'admin'::app_role)
);

drop policy if exists "Published home study courses are public" on public.home_study_courses;
create policy "Home study content for buyers, authors and admins"
on public.home_study_courses for select to authenticated
using (
  public.has_purchased(id)
  or author_id in (select ap.id from public.author_profiles ap where ap.user_id = auth.uid())
  or public.has_role(auth.uid(), 'admin'::app_role)
);

drop policy if exists "Published workbooks are public" on public.workbooks;
drop policy if exists "Published training programs are public" on public.training_programs;
drop policy if exists "Published training modules are public" on public.training_modules;
drop policy if exists "Published training deliverables are public" on public.training_deliverables;

-- ── Marketing-only listings that stay browsable by everyone ──
create or replace view public.courses_public as
select id, author_id, book_id, title, subtitle, tagline, description, cover_image_url,
       price, currency, status, course_slug, course_format, target_student,
       transformation_promises, workshop_schedule, created_at, updated_at
from public.courses where status = 'published';

create or replace view public.home_study_courses_public as
select id, author_id, book_id, title, description, cover_image_url,
       price, currency, duration_days, status, created_at, updated_at
from public.home_study_courses where status = 'published';

create or replace view public.audiobooks_public as
select id, author_id, book_id, title, description, price, currency, duration_minutes,
       narrator_type, narrator_credit, preview_chapter_index, status,
       distribution_status, created_at, updated_at
from public.audiobooks where status = 'published';

create or replace view public.course_modules_public as
select cm.id, cm.course_id, cm.title, cm.description, cm.position, cm.module_number, cm.duration_minutes
from public.course_modules cm
join public.courses c on c.id = cm.course_id
where c.status = 'published';

create or replace view public.course_lessons_public as
select cl.id, cl.module_id, cl.title, cl.position
from public.course_lessons cl
join public.course_modules cm on cm.id = cl.module_id
join public.courses c on c.id = cm.course_id
where c.status = 'published';

grant select on public.courses_public to anon, authenticated;
grant select on public.home_study_courses_public to anon, authenticated;
grant select on public.audiobooks_public to anon, authenticated;
grant select on public.course_modules_public to anon, authenticated;
grant select on public.course_lessons_public to anon, authenticated;

-- ── Internal config: admins only ──
drop policy if exists "Authenticated users can read platform config" on public.platform_config;
drop policy if exists "platform_config readable by authenticated" on public.platform_config;
create policy "Admins can read platform config"
on public.platform_config for select to authenticated
using (public.has_role(auth.uid(), 'admin'::app_role));