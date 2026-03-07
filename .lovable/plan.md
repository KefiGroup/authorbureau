

## Phase 1: CRM Foundation + Reading Club Enhancement (Weeks 1-4)

The roadmap says to build the CRM ("nervous system") and Reading Club ("demand engine") first, so every subsequent feature automatically captures contacts and drives conversions.

### Current State

- **CRM**: A basic `CRMDashboard.tsx` that reads from `profiles`, `reading_club_members`, and `newsletter_signups` as a unified contact list. Separate `crm_contacts`, `crm_contact_tags`, and `crm_activity_log` tables exist but are only used by the `CoachingCRM` component (which is actually a coaching package manager, not a CRM).
- **Reading Club**: A public page with featured books, member signup (email+name), and basic discussions. No book catalog browsing, no challenges, no CRM integration.

### What We Build

**Week 1-2: Full CRM Dashboard**

1. **Rebuild CRM Dashboard** to use the proper `crm_contacts` table (not the current hacky unified view from 3 tables):
   - Contact list with search, sort, and filter by source/tag
   - Add/edit contact form (name, email, phone, company, notes, source)
   - Tag management: add/remove tags per contact, filter by tag
   - Activity log panel: view and add notes, calls, emails per contact
   - Auto-capture: when someone joins Reading Club or signs up for newsletter, auto-create a `crm_contacts` entry

2. **CRM Auto-Capture Edge Function** (`crm-auto-capture`):
   - Called by Reading Club signup, newsletter signup, and service inquiry flows
   - Creates/updates `crm_contacts` record, adds source tag, logs activity
   - Deduplicates by email

3. **CRM Stats on Dashboard Overview**: Total contacts, contacts this week, top tags, recent activity

**Week 3-4: Reading Club Enhancement**

4. **Book Catalog**: Full browsable catalog of published books with genre filters, search, and cover images (not just featured books)

5. **Reading Challenges**: A simple "30-day reading challenge" feature — join a challenge tied to a featured book, track progress

6. **CRM Integration**: Every Reading Club signup triggers the CRM auto-capture, tagged as `reading_club`

### Technical Details

**Database Changes:**
- Add a `reading_club_challenges` table (id, book_id, title, description, duration_days, status, created_at)
- Add a `reading_club_challenge_participants` table (id, challenge_id, member_id, progress, joined_at)
- No changes needed for `crm_contacts`, `crm_contact_tags`, `crm_activity_log` — they already exist

**New Edge Function:**
- `crm-auto-capture`: receives `{ email, name, source, source_detail }`, upserts into `crm_contacts`, adds tag, logs activity

**Frontend Components (new or rewritten):**
- `src/components/dashboard/CRMDashboard.tsx` — full rewrite with proper contact management
- `src/components/dashboard/crm/ContactList.tsx` — already exists, may need updates
- `src/components/dashboard/crm/ContactForm.tsx` — already exists, may need updates
- `src/components/dashboard/crm/ActivityPanel.tsx` — already exists, may need updates
- Reading Club page enhancements — book catalog grid, challenge cards

**Files Modified:**
- `src/pages/ReadingClub.tsx` — add catalog browse + challenge section
- `src/components/dashboard/DashboardOverview.tsx` — add CRM stats card
- `src/pages/AuthorDashboard.tsx` — wire updated CRM section

### Implementation Order

1. CRM auto-capture edge function + database migration for challenge tables
2. Rewrite CRM Dashboard with full contact CRUD, tags, and activity log
3. Add CRM stats to Dashboard Overview
4. Enhance Reading Club with book catalog + challenges
5. Wire auto-capture into Reading Club and newsletter signup flows

