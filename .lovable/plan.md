

# Revised Plan: Newsletter Signup + SEO + Subscription Gating

## 1. Database Migration

**One new table: `newsletter_signups`**

```sql
CREATE TABLE public.newsletter_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_signups ENABLE ROW LEVEL SECURITY;

-- Public insert (anyone can subscribe)
CREATE POLICY "Anyone can sign up" ON public.newsletter_signups
  FOR INSERT WITH CHECK (true);

-- Authors see signups for their own books
CREATE POLICY "Authors can view their book signups" ON public.newsletter_signups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.books WHERE books.id = newsletter_signups.book_id AND books.author_id = auth.uid())
  );

-- Admins see all
CREATE POLICY "Admins can view all signups" ON public.newsletter_signups
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
```

No JSONB columns added to books. No other new tables.

## 2. Book Microsite: Newsletter Signup Section Only

Add one new section to `DynamicBookMicrosite.tsx` — an email capture form positioned before the "Ready to Read?" CTA block. Uses Supabase client to insert directly into `newsletter_signups` (public INSERT policy, no auth needed). Shows toast on success.

No Chapter Framework, Testimonials, or FAQ sections.

## 3. SEO Foundations

- **`useDocumentMeta` hook** — sets `document.title`, meta description, og:title/description/image/url, twitter:card, and injects JSON-LD `<script>` tag. Cleans up on unmount.
- **Apply to `DynamicBookMicrosite.tsx`** — Book schema (`@type: Book`)
- **Apply to `AuthorProfile.tsx`** — Person schema (`@type: Person`)
- **`generate-sitemap` edge function** — queries published books + listed author profiles, returns XML sitemap

## 4. Subscription Gating (Free + Premium $29/mo)

- **`PremiumGate` component** — wraps premium sections; shows upgrade card with CTA if `!isPremium`
- **Gate in `AuthorDashboard.tsx`**: CourseBuilder, CoachingCRM, SpeakingProfile, AIToolkit wrapped in PremiumGate
- **Lock icons in `DashboardSidebar`** for gated items when not premium
- Uses existing Stripe price `price_1T0EiXL6NAuEbKmpWFRCxYaV` via `create-checkout`

## 5. Implementation Order

1. Database migration (newsletter_signups table)
2. Newsletter signup section in DynamicBookMicrosite
3. useDocumentMeta hook + apply to Book/Author pages
4. generate-sitemap edge function
5. PremiumGate component + dashboard gating + sidebar lock icons

