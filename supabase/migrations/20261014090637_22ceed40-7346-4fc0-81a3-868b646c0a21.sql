insert into public.notifications (user_id, title, message, link)
select distinct on (ap.user_id, an.book_id) ap.user_id,
  'Update available: Social Media (BP-03)',
  'Your social posts for "' || coalesce(b.title,'your book') || '" now have better designs: a layout per post type, your face framed properly, and a clear call to action. Open BP-03 to review and re-download.',
  '/node-builder/BP-03?bookId=' || an.book_id::text
from public.author_nodes an
join public.author_profiles ap on ap.id = an.author_id
left join public.books b on b.id = an.book_id
where an.node_id = 'BP-03' and an.book_id is not null and ap.user_id is not null
  and coalesce((an.content_json->>'_engineVersion')::int, 1) < 2
  and an.content_json ? 'posts';