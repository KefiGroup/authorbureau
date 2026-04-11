-- Add anon SELECT policy for published books so public visitors can view book pages
CREATE POLICY "Published books viewable by anon"
ON public.books
FOR SELECT
TO anon
USING (published_at IS NOT NULL);