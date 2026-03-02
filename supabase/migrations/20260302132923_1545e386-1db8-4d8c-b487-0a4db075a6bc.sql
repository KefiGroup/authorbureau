
-- CRM Contacts table
CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  company text,
  notes text,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own contacts"
  ON public.crm_contacts FOR ALL
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can view all contacts"
  ON public.crm_contacts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- CRM Contact Tags
CREATE TABLE public.crm_contact_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_contact_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own contact tags"
  ON public.crm_contact_tags FOR ALL
  USING (auth.uid() = author_id);

-- CRM Activity Log
CREATE TABLE public.crm_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'note',
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage their own activity logs"
  ON public.crm_activity_log FOR ALL
  USING (auth.uid() = author_id);

-- Reading Club Members
CREATE TABLE public.reading_club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  display_name text,
  user_id uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  UNIQUE(email)
);

ALTER TABLE public.reading_club_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join reading club"
  ON public.reading_club_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Members can view their own membership"
  ON public.reading_club_members FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all members"
  ON public.reading_club_members FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage members"
  ON public.reading_club_members FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Reading Club Discussions
CREATE TABLE public.reading_club_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.reading_club_members(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES public.reading_club_discussions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reading_club_discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view discussions"
  ON public.reading_club_discussions FOR SELECT
  USING (true);

CREATE POLICY "Members can post discussions"
  ON public.reading_club_discussions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage discussions"
  ON public.reading_club_discussions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Reading Club Featured Books (curated by admins)
CREATE TABLE public.reading_club_featured_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  featured_month text NOT NULL,
  discussion_prompt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(book_id, featured_month)
);

ALTER TABLE public.reading_club_featured_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view featured books"
  ON public.reading_club_featured_books FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage featured books"
  ON public.reading_club_featured_books FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
