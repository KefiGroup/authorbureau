

## Plan

### Issue 1 — Testimonials section empty-state + seed for Pauline

**File: `src/pages/author-site/AuthorTestimonialsSection.tsx`**
- Remove the `if (testimonials.length === 0) return null` early return.
- When empty, render a subtle empty-state card: "No testimonials yet" with a friendly note. Owner-only callout is not needed (dashboard already prompts).
- Actually — to avoid showing an empty section to public visitors, render the empty placeholder ONLY if the viewer is the owner. Pass an `isOwner` boolean from `AuthorSite.tsx` (already computed locally — promote it to state).

**File: `src/pages/AuthorSite.tsx`**
- Promote the local `isOwner` flag to component state so it can be passed to `<AuthorTestimonialsSection isOwner={isOwner} />`.

**Database: Seed sample testimonials for Pauline**
- Insert 3 sample rows into `author_testimonials` for `author_id = ef23c521-9cce-4d86-9128-dc687748b65b` so the section renders publicly immediately.

**File: `src/components/dashboard/microsite/TestimonialsManager.tsx`** (already has "+ Add" — verify and add a clearer empty prompt: "Add your first testimonial to build trust on your author page.")

### Issue 2 — Fix BP-05 builder intro copy

**File: `src/components/dashboard/builders/shared/BuilderIntroBlock.tsx`** (lines 70–79)
- Replace the BP-05 block with the correct Webinar Engine copy:
  - `creates`: 
    - "3 signature webinar topics with public registration pages"
    - "6-email sequence (3 reminders + 3 follow-ups)"
    - "Promotional copy for social media"
    - "A registrant dashboard with live counts"
  - `livesAt`: "Public webinar registration pages at /your-slug/webinar/<topic> — registrants flow into your CRM with +15 ABBY score."
  - `editLater`: "Re-open Webinar Engine to edit topics, schedule dates, set Daily.co room URLs, or view registrants."
  - `estimate`: "60–90 seconds"

### QA
- Confirm `/pauline-teo` shows 3 seeded testimonial cards.
- Confirm BP-05 builder intro panel shows webinar copy (no more "book trailer").

