ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.author_profiles ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.author_subscribers ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_books_is_test ON public.books (is_test) WHERE is_test = true;
CREATE INDEX IF NOT EXISTS idx_author_profiles_is_test ON public.author_profiles (is_test) WHERE is_test = true;
CREATE INDEX IF NOT EXISTS idx_author_subscribers_is_test ON public.author_subscribers (is_test) WHERE is_test = true;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_is_test ON public.crm_contacts (is_test) WHERE is_test = true;