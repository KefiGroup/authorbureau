
-- Testimonials / reviews for products and books
CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  reviewer_name text NOT NULL,
  reviewer_title text,
  review_text text NOT NULL,
  rating integer DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Authors can manage their own testimonials
CREATE POLICY "Authors can manage their own testimonials"
  ON public.testimonials FOR ALL TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Published testimonials are public (all testimonials for now)
CREATE POLICY "Testimonials are publicly viewable"
  ON public.testimonials FOR SELECT TO public
  USING (true);
