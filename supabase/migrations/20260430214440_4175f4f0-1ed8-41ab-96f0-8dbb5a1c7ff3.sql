UPDATE public.books
   SET slug = regexp_replace(slug, '-+$', '')
 WHERE slug ~ '-$';