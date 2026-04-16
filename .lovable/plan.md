

# Sprint 30c — My CRM: Three Critical Fixes

## Fix 1: Source Label Utility
Create a shared `getSourceLabel()` function in a new `src/lib/crm-utils.ts` file. Apply it in `PipelineView.tsx`, `ContactListView.tsx`, and `ContactDetailPanel.tsx` wherever `contact.source` is displayed.

## Fix 2: Scale Fixes

### Edge function (`author-crm-data/index.ts`)
- Update `list` action to accept `page`, `pageSize`, `search`, `stage` params
- Use `{ count: "exact" }` with `.range()` for pagination (not the aggregate column approach from the spec)
- Sanitize search input before PostgREST interpolation
- Replace `bulk-delete` and `bulk-move-stage` for-loops with `.in()` batch queries

### Frontend (`ContactListView.tsx`)
- Add debounced search input, stage filter dropdown, source filter dropdown
- Add pagination controls with "Showing X of Y" and Previous/Next buttons
- Component now calls `crmFetch` directly (receives it as prop) instead of filtering in-memory
- Pass `initialStageFilter` still works from Pipeline "View all" clicks

### Frontend (`AuthorCRMPage.tsx`)
- Remove the shared search bar idea from the spec (Pipeline uses a separate action and doesn't support search). Search stays on the Contacts tab only.

## Fix 3: Pipeline Summary Mode

### Edge function (`author-crm-data/index.ts`)
- Add new `pipeline-summary` action that returns `{ summary: [{ stage, count, top3 }] }` for all 7 stages
- Uses `Promise.all` for parallel queries — fast regardless of contact count

### Frontend (`PipelineView.tsx`)
- Rewrite to call `pipeline-summary` instead of receiving all contacts as props
- Each column: stage header + count badge, top 3 compact rows (avatar, name, score, click arrow), "View all N →" button
- Remove drag-and-drop entirely
- Accepts `crmFetch` as prop for data loading

## Files Changed
| File | Change |
|------|--------|
| `src/lib/crm-utils.ts` | New — `getSourceLabel()` utility |
| `supabase/functions/author-crm-data/index.ts` | Update `list` (pagination/search), batch bulk ops, add `pipeline-summary` action |
| `src/components/crm/PipelineView.tsx` | Rewrite for summary mode with own data fetching |
| `src/components/crm/ContactListView.tsx` | Add search, filters, pagination, server-side data fetching |
| `src/components/crm/ContactDetailPanel.tsx` | Apply `getSourceLabel()` |
| `src/components/dashboard/AuthorCRMPage.tsx` | Pass `crmFetch` to children, remove all-contacts preload for Pipeline |

## What Does NOT Change
- No database migrations
- No visual design changes
- No changes to ABBY Intelligence, Contact Detail Panel logic, or Add Contact
- No sidebar, routing, or other page changes

