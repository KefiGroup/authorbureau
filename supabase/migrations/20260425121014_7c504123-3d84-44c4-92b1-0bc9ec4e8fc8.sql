create or replace function public.get_author_curated_book_id(_author_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select book_id
  from public.author_context
  where author_id = _author_id
    and book_id is not null
  order by created_at desc
  limit 1
$$;

grant execute on function public.get_author_curated_book_id(uuid) to anon, authenticated;