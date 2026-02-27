
CREATE TABLE public.newsletter_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can sign up" ON public.newsletter_signups
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authors can view their book signups" ON public.newsletter_signups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.books WHERE books.id = newsletter_signups.book_id AND books.author_id = auth.uid())
  );

CREATE POLICY "Admins can view all signups" ON public.newsletter_signups
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
