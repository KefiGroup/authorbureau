

# Rebuild My Contacts into ABBY-Powered CRM & Sales Funnel

## Current State
- `crm_contacts` table has: id, author_id, full_name, email, phone, company, notes, source, created_at, updated_at
- `crm_activity_log` table has: id, author_id, contact_id, type, content, created_at
- `crm_contact_tags` table for tags
- All CRM data flows through `author-crm-data` edge function (service role bypass, shared-backend JWT auth)
- Sidebar entry is `author-crm` -> "My Contacts"
- 2 existing contacts in DB

## Database Changes (Migration)

Add columns to `crm_contacts`:
```sql
ALTER TABLE crm_contacts 
  ADD COLUMN stage text NOT NULL DEFAULT 'new_lead',
  ADD COLUMN abby_score integer NOT NULL DEFAULT 0,
  ADD COLUMN last_activity_at timestamptz DEFAULT now();
```

No new tables needed. The existing `crm_activity_log` serves as the activity/event log. We add `stage_change` as a valid `type` value.

## Edge Function Updates: `author-crm-data`

Add new actions:
- **`update-stage`**: Updates contact's `stage`, logs a `stage_change` event to `crm_activity_log`, recalculates `last_activity_at`
- **`bulk-move-stage`**: Move multiple contacts to a new stage
- **`bulk-delete`**: Delete multiple contacts
- **`abby-intelligence`**: Calls Lovable AI Gateway (gemini-3-flash-preview) with contact summary data to generate: action list, funnel health, segment insights, predicted conversions. Returns structured JSON.
- **`abby-contact-recommendation`**: Single-contact AI recommendation for the detail panel.

Update **`list`** action to return the new `stage`, `abby_score`, `last_activity_at` fields.

## Frontend: New Components

### 1. `src/components/dashboard/AuthorCRMPage.tsx` (rewrite)
- Rename header to "My CRM"
- Stats bar: Total Contacts, Active This Week, Conversion Rate (customers/total), Pipeline Value
- Three tabs: Pipeline (default), Contacts, ABBY Intelligence
- Shared `crmFetch` utility stays the same

### 2. `src/components/crm/PipelineView.tsx`
- 7-column Kanban: New Lead, Engaged, Warm, Hot, Customer, VIP, Cold
- Stage colors: blue, teal, amber, orange, green, gold, grey (left border)
- Contact cards show: name, email, source badge, last activity date, ABBY Score badge
- Drag-and-drop using HTML5 drag API (no library needed for 7 columns)
- On drop: call `update-stage` action
- Empty state per column with ABBY messaging

### 3. `src/components/crm/ContactListView.tsx`
- Sortable table: Name, Email, Stage, Source, Last Activity, ABBY Score, Tags
- Search + filter (by stage, source)
- Checkbox selection for bulk actions: Add Tag, Move Stage, Delete

### 4. `src/components/crm/AbbyIntelligenceView.tsx`
- ABBY avatar (gold star icon) header
- 4 cards with loading states:
  1. Today's Action List (top 5 contacts + reason)
  2. Funnel Health Score (% per stage + commentary)
  3. Segment Insights (behaviour groups + next action)
  4. Predicted Conversions (likely buyers in 7 days)
- Each card has "Take Action" button
- Calls `abby-intelligence` edge function action

### 5. `src/components/crm/ContactDetailPanel.tsx`
- Right slide-in panel (Sheet component)
- Shows: name, email, stage badge, ABBY score, activity timeline, tags
- ABBY personalised recommendation (LLM call on open)
- Quick actions: Add Note, Move Stage, Add Tag, Delete

## Sidebar Change

In `DashboardSidebar.tsx`: Change label from "My Contacts" to "My CRM", add subtitle "Sales Funnel & Contacts".

## ABBY Score

Calculated server-side in the edge function when activities are logged. For now, contacts start at score 0 and the score adjusts based on activity type logged in `crm_activity_log`:
- opt_in: +2, email_open: +1 (max +3), link_click: +2, quiz_completed: +2, page_visit: +1, purchase: +3
- Decay: -1 per 7 days inactivity (applied on list fetch)

## Files Changed
- `supabase/migrations/new.sql` (add stage, abby_score, last_activity_at columns)
- `supabase/functions/author-crm-data/index.ts` (add actions + AI calls)
- `src/components/dashboard/AuthorCRMPage.tsx` (full rewrite with tabs)
- `src/components/crm/PipelineView.tsx` (new)
- `src/components/crm/ContactListView.tsx` (new)
- `src/components/crm/AbbyIntelligenceView.tsx` (new)
- `src/components/crm/ContactDetailPanel.tsx` (new)
- `src/components/dashboard/DashboardSidebar.tsx` (label change)

## What We Do NOT Touch
- No BP node builders
- No Marketing Hub
- No existing `crm_contacts` columns removed
- No existing leads table (there is none; we use `crm_contacts`)

