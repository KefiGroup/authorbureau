
CREATE TABLE public.author_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  website_url TEXT,
  amazon_book_url TEXT NOT NULL,
  bio TEXT,
  genres TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.author_applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public application form)
CREATE POLICY "Anyone can submit an application"
ON public.author_applications
FOR INSERT
WITH CHECK (true);

-- No one can read/update/delete via the client (admin only via dashboard)
