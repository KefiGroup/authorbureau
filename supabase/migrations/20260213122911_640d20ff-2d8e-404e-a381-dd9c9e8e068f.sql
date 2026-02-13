
-- Create books table with fields for both Amazon scraping + manual entry modes
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  
  -- Core metadata
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  
  -- Book details
  pages INTEGER,
  rating NUMERIC(3, 1),
  review_count INTEGER,
  genre TEXT,
  badges TEXT[] DEFAULT '{}',
  
  -- Pricing
  price TEXT,
  currency TEXT DEFAULT 'USD',
  kindle_price TEXT,
  paperback_price TEXT,
  
  -- URLs & Assets
  amazon_url TEXT,
  cover_image_url TEXT,
  
  -- AI enrichment flag
  ai_enriched BOOLEAN DEFAULT false,
  
  -- Mode tracking: 'amazon' (scraped) | 'manual' (user-entered)
  entry_mode TEXT DEFAULT 'manual',
  
  -- Amazon source data (for scraping mode)
  amazon_author_profile_url TEXT,
  
  -- Author profile data (populated from author_profiles or scraped)
  author_name TEXT,
  author_bio TEXT,
  author_photo_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authors can create and manage their own books"
ON public.books
FOR ALL
USING (auth.uid() = author_id);

CREATE POLICY "Published books are publicly viewable"
ON public.books
FOR SELECT
USING (published_at IS NOT NULL);

CREATE POLICY "Admins can view all books"
ON public.books
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for slug lookups
CREATE INDEX idx_books_slug ON public.books(slug);

-- Create index for author lookups
CREATE INDEX idx_books_author_id ON public.books(author_id);

-- Create index for published books
CREATE INDEX idx_books_published ON public.books(published_at) WHERE published_at IS NOT NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_books_updated_at
BEFORE UPDATE ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
