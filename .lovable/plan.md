## Fix the BP-08 / BP-09 silent-publish bug (root cause for Pauline's stuck nodes)

The audit caught a real defect, not just bad data. Two builders silently publish a node `live` even when their `library_asset` upload fails, and the audit's adopter contract is out of sync with what the builders actually upload. Fixing it prevents the same trap on every other author who publishes BP-08 or BP-09.

### 1. Stop the silent fall-through in the two builders
- `src/components/dashboard/builders/bp09/BP09Builder.tsx` `handlePublish`: remove the swallowed `catch` around `uploadAndRegisterLibraryAsset`. If the upload throws, surface a toast and stay on step 2 (do **not** call `publishNodeToSite`). Mirror the existing error-handling style at the bottom of the function.
- `src/components/dashboard/builders/bp08/BP08Builder.tsx` `handlePublish`: same change at lines 285-294.
- Net effect: a transient upload error now blocks publish (correct) instead of leaving the node live without a deliverable.

### 2. Align the canonical adopter contract with reality
Sprint 55 memory currently says: adopters = BP-01, BP-03, BP-04, BP-06, BP-09 (kind=external_url). The codebase says:
- BP-08 is **also** an adopter and uploads `kind: "txt"`.
- BP-09 uploads `kind: "txt"` (not `external_url`).

Update both sides so they match:
- `supabase/functions/daily-audit/index.ts` `REQUIRED_KIND`: `BP-08: "txt"`, `BP-09: "txt"` (BP-01/03/04/06 unchanged).
- Update memory `mem://architecture/library-asset-adoption` to: adopters = **BP-01, BP-03, BP-04, BP-06, BP-08, BP-09** with their actual `kind` values.

### 3. Server-side guard rail in `save-author-node:publish`
Add a final check inside the publish branch of `supabase/functions/save-author-node/index.ts`: for adopter nodes, refuse to write `status='live'` if neither the caller-supplied `libraryAsset` nor the existing row has a non-empty `library_asset.url`. Return `{ success: false, status: 422, message: "library_asset required for <node_id>" }`. This stops any future builder regression from re-introducing the same bug.

### 4. Repair Pauline's two stuck rows
After the fix is deployed:
- `BP-09` (`8b6d54da…`): set `status='draft'` and clear `delivery_url` so she re-publishes through the corrected builder.
- `BP-08` (`e0a33228…`): same treatment.

I'll do this via a one-off `supabase--insert` UPDATE (it's a status reset, not a schema change).

### 5. Re-run the audit
Call `/daily-audit-cron` once more; expect green / amber (errors_24h still warns from historic entries until the 24h window rolls).

### Files touched
- `src/components/dashboard/builders/bp08/BP08Builder.tsx` (publish error handling)
- `src/components/dashboard/builders/bp09/BP09Builder.tsx` (publish error handling)
- `supabase/functions/daily-audit/index.ts` (REQUIRED_KIND adopter map)
- `supabase/functions/save-author-node/index.ts` (server-side adopter guard)
- Memory: `mem://architecture/library-asset-adoption` (adopter list update)
- Re-deploy: `daily-audit`, `save-author-node`
- Data fix: reset Pauline's BP-08 and BP-09 nodes to `draft`

### Out of scope
- Backfilling historical assets for any author who already published one of these nodes — they'll naturally re-publish through the fixed builder (or admin can reset them on demand). Audit will keep flagging until they do.
- Other adopter builders (BP-01/03/04/06) — they don't show the same silent-catch pattern in this audit window, but I'll spot-check them while editing the file.
