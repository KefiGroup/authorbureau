

## Root Cause Analysis

The lead capture flow from the BP-02 quiz gate has **3 gaps**:

1. **No CRM capture for optins**: `microsite-action` only saves leads to `crm_contacts` for `enquiry`/`application` action types. For `optin` (which BP-02 uses), it only saves to `author_subscribers` — the author's CRM never gets the lead.

2. **No platform-level CRM**: There is no second-level capture for Authors Bureau admin. The admin CRM tab (`AdminCRMTab`) reads from `crm_contacts`, but optin leads never land there. There's also no concept of a "platform lead" that's separate from individual author leads.

3. **No email notification on optin**: `microsite-action` doesn't send any Resend email. The Resend email logic exists in `crm-auto-capture` but that function is never called from the optin flow. `RESEND_API_KEY` is configured and available.

## Plan

### 1. Update `microsite-action` edge function to capture leads at 2 levels

For ALL action types (not just enquiry/application):

- **Author-level CRM**: Insert into `crm_contacts` with `author_id = profile.user_id` and appropriate source/tag
- **Platform-level CRM**: Insert into `crm_contacts` with `author_id` set to the platform admin's user ID (first admin from `user_roles`), tagged with the author's name so the platform can see all leads across all authors
- **Add CRM tags** via `crm_contact_tags` for both levels (e.g., `lead-magnet-optin`, `quiz-funnel`)
- **Log activity** in `crm_activity_log` for the author
- **Send Resend email notification** to the author (replicating the logic from `crm-auto-capture`)

### 2. Deploy the updated edge function

Redeploy `microsite-action` so the changes take effect on the live site.

### 3. Files changed

- `supabase/functions/microsite-action/index.ts` — Add CRM capture for all action types at both author and platform levels, add Resend email notification

No new tables or migrations needed — the existing `crm_contacts`, `crm_contact_tags`, and `crm_activity_log` tables already support multi-author entries and the admin CRM tab already reads all contacts platform-wide.

