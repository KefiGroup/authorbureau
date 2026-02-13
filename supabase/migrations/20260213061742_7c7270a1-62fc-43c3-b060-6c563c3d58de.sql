
-- Create a table for service inquiries/bookings
CREATE TABLE public.service_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_slug TEXT NOT NULL,
  service_type TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an inquiry
CREATE POLICY "Anyone can submit a service inquiry"
ON public.service_inquiries
FOR INSERT
WITH CHECK (true);

-- Admins can view all inquiries
CREATE POLICY "Admins can view all inquiries"
ON public.service_inquiries
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update inquiry status
CREATE POLICY "Admins can update inquiries"
ON public.service_inquiries
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
