

# Fix: "Build My Business" Doesn't Detect Uploaded Manuscripts

## Why This Keeps Happening (Architectural Root Cause)

This is the **same class of bug** as the manuscript upload failure — an RLS identity mismatch:

- **Edge functions** store `generated_assets` records with `author_id` = the shared backend UUID (e.g., `ffbc179a-...`)
- **Frontend** queries `generated_assets` via `cloudSupabase` (local Cloud client), where `auth.uid()` is a **different** UUID
- RLS policy: `author_id = auth.uid()` → SELECT returns zero rows → UI thinks no manuscript exists

## Is This a Band-Aid or a Permanent Fix?

**This is a permanent architectural fix.** It follows the same proven pattern already used by `ManuscriptUpload` (which correctly calls the edge function to check status via `service_role`) and `consultation-session` (which resolves identity server-side). The fix eliminates the last direct `cloudSupabase` query against `generated_assets` in `BuildMyBusiness.tsx`, routing it through an edge function that bypasses RLS with `service_role`.

No data is degraded or deleted. The only change is **how** we read — not what we read or write.

## Changes

### 1. `supabase/functions/parse-manuscript/index.ts` — Add `batch-status` action

New JSON action accepting `{ action: "batch-status", bookIds: string[] }`. Uses `adminClient` (service_role) to query `generated_assets` for all matching book IDs with `asset_type IN ('source_material', 'business_plan')`. Returns:

```json
{
  "manuscripts": ["book-id-1"],
  "analyzed": ["book-id-1"],
  "summaries": { "book-id-1": { "products": [...] } }
}
```

No new tables, no schema changes, no RLS modifications.

### 2. `src/components/dashboard/BuildMyBusiness.tsx` — Replace direct query (lines 112-136)

Replace the `cloudSupabase.from("generated_assets")` query with a fetch to the new `batch-status` edge function action. The response populates `manuscriptBookIds`, `analyzedBookIds`, and `planSummaries` identically to the current code — just sourced from a reliable path.

**Before** (broken):
```typescript
const { data: assets } = await cloudSupabase
  .from("generated_assets")
  .select("book_id, asset_type, content")
  .in("book_id", bookIds)
  .in("asset_type", ["business_plan", "source_material"]);
```

**After** (stable):
```typescript
const resp = await fetch(`${PARSE_MANUSCRIPT_URL}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ action: "batch-status", bookIds }),
});
const result = await resp.json();
// result.manuscripts, result.analyzed, result.summaries
```

### What's NOT Changed
- No tables modified or dropped
- No RLS policies altered
- No data deleted or migrated
- `ManuscriptUpload.tsx` untouched (already uses edge function correctly)
- `BookHubOverview.tsx` already fixed in prior commit
- All existing write paths remain identical

