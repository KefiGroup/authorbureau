

## Store Authors Bureau Platform Scope

I'll save a comprehensive reference document covering the full platform scope, feature statuses, architecture, and integration details as a persistent memory file. This will be available for all future conversations.

### What will be stored

**Platform Identity**: Authors Bureau — a platform for published authors to showcase their work, build their brand, and monetize their expertise through AI-powered business tools.

**Architecture**:
- Shared Supabase auth backend with PublishNow (`wuftdpnekscrsghqtssd.supabase.co`)
- Local database for platform-specific data (`tubpbslfrxyfhldkcyyq`)
- SSO proxy for cross-platform navigation
- All shared backend calls tagged with `"source_platform": "authorsbureau"`
- PublishNow is the single source of truth for author profiles and books

**Live Features**: Author profiles & sync, book management & Amazon scraping, public directory with 4-tier badge system, AI Build My Business (6-asset pipeline), Stripe premium gating, Reading Club, Admin Dashboard, SEO sitemap, service inquiry forms

**UI Built / Partially Functional**: Course Builder (schema ready, no enrollment/payment), Coaching CRM (UI only), Speaking Profile (UI only)

**Coming Soon (Placeholder Only)**: Workbooks, Webinars, Social Media Content, Memberships, Group Coaching, Big Ticket Packages, Podcast, Corporate Training, Retreats, Certification, Masterminds

**Database Tables**: `author_profiles`, `books`, `generated_assets`, `courses`, `course_modules`, `course_lessons`, `coaching_packages`, `speaking_topics`, `crm_contacts`, `crm_contact_tags`, `crm_activity_log`, `reading_club_members`, `reading_club_featured_books`, `reading_club_discussions`, `newsletter_signups`, `service_inquiries`, `author_applications`, `profiles`, `user_roles`

**Edge Functions**: `sync-author-profile`, `save-book`, `publish-book`, `get-book`, `list-my-books`, `upload-book-cover`, `update-book-cover`, `enrich-book-data`, `scrape-amazon-book`, `ai-author-tools`, `generate-author-bio`, `check-subscription`, `create-checkout`, `customer-portal`, `sso-proxy`, `dashboard-state`, `admin-books`, `list-directory-authors`, `generate-sitemap`, `send-service-inquiry-email`

**Key Integration Details**: Profile sync is manual (author-triggered), field mapping includes pen_name/bio_short/bio_long/tagline/photo_url/cover_photo_url, premium product ID is `prod_TyB48pNvpfAnf4`

