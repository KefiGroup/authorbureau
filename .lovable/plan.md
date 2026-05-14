# Bulk-delete CRM contacts (admin)

Add the ability for admins to select one or more CRM contacts in the admin panel and delete them.

## UX
- Add a checkbox column to the CRM table (`AdminCRMTab`).
- Header checkbox = select all currently filtered rows.
- When ≥1 row is selected, show a red **Delete N selected** button next to Refresh.
- Clicking it opens a confirmation dialog (AlertDialog) listing the count; on confirm, contacts and their related rows are deleted.
- Toast on success, list refreshes, selection clears.

## Backend
Add a new `delete-crm-contacts` action to the existing `admin-data` edge function (already admin-gated):
- Input: `{ contact_ids: string[] }` (validate non-empty, max 500).
- Uses service-role client to delete from:
  - `crm_contact_tags` where `contact_id` in ids
  - `crm_activity_log` where `contact_id` in ids
  - `crm_contacts` where `id` in ids
- Writes one `admin_audit_log` row (`event_key = 'crm.contacts_deleted'`, payload = count + ids).
- Returns `{ success: true, deleted: N }`.

No schema change. No migration needed.

## Files
- `supabase/functions/admin-data/index.ts` — add new action handler.
- `src/components/admin/AdminCRMTab.tsx` — add selection state, checkbox column, delete button + confirm dialog, call `adminDataFetch("delete-crm-contacts", { contact_ids })`.

## Out of scope
- Per-row delete icon, "wipe entire CRM" button, soft-delete/undo, audit-tab UI for the new event.
