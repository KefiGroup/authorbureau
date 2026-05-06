# Align BP-05, BP-09, BA-10, BA-12 with the Working Node Pattern

## Goal
All four nodes should follow the same contract as BP-02/07/08:
`status='live'` + missing required assets → 60% Building badge
`status='live'` + assets present → 100% Live badge

## Changes

### 1. Builder publish handlers — write `status: 'live'`
Update the save/publish handlers in:
- `src/components/dashboard/builders/` for **BP-05 Webinars**
- `src/components/dashboard/builders/` for **BP-09 Book Sales**
- `src/components/dashboard/builders/` for **BA-10 Online Course**
- `src/components/dashboard/builders/` for **BA-12 Memberships**

Replace the current `status: 'content_ready'` write with `status: 'live'`. The downgrade path in `useNodeLiveStats` will automatically render them as 60% Building until the readiness gate passes.

### 2. Readiness gate — add BP-05
In `supabase/functions/_shared/node-readiness.ts`, add:
```ts
case "BP-05": {
  if (!nonEmptyString(content.title)) return false;
  if (nonEmptyString(content.slides_url) || nonEmptyString(content.registration_url)) return true;
  return hasCommerceSignal(content);
}
```
BP-09, BA-10, BA-12 already have gates — verify and leave intact.

### 3. Backfill existing rows
Migration to update legacy rows:
```sql
UPDATE author_nodes
   SET status = 'live'
 WHERE node_id IN ('BP-05','BP-09','BA-10','BA-12')
   AND status = 'content_ready';
```

### 4. QA
- Confirm Webinars/Book Sales/Online Course/Memberships now show 60% Building badges on the dashboard for existing authors.
- Confirm completing the assets (e.g. attaching a course, adding commerce signal) flips them to 100% Live.
- Confirm `useBookNodeProgress` totals reflect the new state.

## Files
- `src/components/dashboard/builders/...` (4 builder files — BP-05, BP-09, BA-10, BA-12 publish handlers)
- `supabase/functions/_shared/node-readiness.ts`
- New migration for the backfill UPDATE
