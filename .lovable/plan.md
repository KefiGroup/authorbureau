## Plan: Rectify contaminated business plan + add Refresh button

### Scope (verified from DB)

- **Per-node `author_nodes` content**: ✅ already correct, no action needed.
- **Business plans (`generated_assets` where `asset_type = 'business_plan'`)**: only 1 of 3 plans (`0f6bd0b5-6c8c-4e6b-a10b-a4868b334406`, owned by `ef23c521…` / support@paulineteo.com) contains wrong YR-25/27/28 + BA-15 labels.

### Step 1 — Surgical SQL fix (data update via insert tool)

Run a single `UPDATE` on `generated_assets` row `0f6bd0b5…` that does pure string replacement on `content` for the drifted node labels only. Surrounding personalised text remains intact (the per-node *recommendation paragraph* under each line will still sound off-topic — Step 2 covers that).

Replacements (token → canonical):

```text
"BA-14 Podcast Tour"            → "BA-14 Podcast"
"BA-15 Affiliates & Partnerships" → "BA-15 Media & PR"
"BA-16 Speaking Engagements"    → "BA-16 Affiliate Programme"
"BA-17 Upsells & Downsells"     → "BA-17 Upsells & Bundles"
"BA-18 Revenue Sharing"         → "BA-18 JV Partnerships"
"YR-20 Consulting"              → "YR-20 Big Ticket Offers"
"YR-21 Keynote Speaking"        → "YR-21 Keynote Speaking"  (already correct, skip)
"YR-25 Licensing & IP"          → "YR-25 Certification Programme"
"YR-26 Conferences & Events"    → "YR-26 Conference"
"YR-27 Media & Publishing"      → "YR-27 Fundraising Campaign"
"YR-28 Legacy & Philanthropy"   → "YR-28 Sponsors & Exhibitors"
```

Also bump `updated_at = now()` so the UI shows it as freshly synced.

### Step 2 — Add "Refresh with latest ABBY" button

Edit `src/components/dashboard/SavedBusinessPlan.tsx`:

1. Add a `Refresh` button next to the existing `.docx` download button (uses lucide `RefreshCw` icon).
2. Click → confirms via toast → calls existing edge function `business-consultant` with `action: "regenerate-plan"` (or `"create-plan"` if regenerate not supported — will check before wiring).
3. While running, show spinner + disable. On success, replace `plan` state with the new content and toast "Business plan refreshed with the latest ABBY framework."
4. Add a small one-line caption under the title: "Want fully on-topic recommendations? Refresh to regenerate with the updated framework."

### Step 3 — Verify business-consultant supports regeneration

Read `supabase/functions/business-consultant/index.ts` to confirm which `action` value triggers a fresh write to `generated_assets`. If only `"create-plan"` exists, reuse it (function already upserts on `(author_id, book_id, asset_type='business_plan')`). No edge-function code changes expected.

### Step 4 — No memory updates required

Existing core memory already pins canonical node names and the gpt-5 temperature ban. Nothing to add.

### What this delivers

- The one contaminated plan immediately shows correct node labels in the table view, eliminating user-facing confusion.
- Author keeps full control: they can opt in to a clean regeneration whenever they want.
- All future plans are already safe (master prompt was fixed in the previous step).
- Zero risk to per-node deliverables (workbooks, fundraising kits, etc.) — they were never affected.

### Out of scope

- Bulk-regenerating any plan without the author's click.
- Touching `author_nodes`, chat history, or other authors' data.

Reply **YES** to apply Step 1 (SQL fix) + Step 2 (Refresh button), or tell me to skip either step.