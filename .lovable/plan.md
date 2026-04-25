## Codebase Cleanup Audit

I scanned the repo for duplicated and orphaned code. The biggest wins are: a parallel set of legacy "named" builder folders that no longer feed any route, two near-identical BA/YR shared wrappers, three tiny redirect-only hub pages, and 30 essentially identical edge functions. None of this affects user-facing behavior — it's pure dead weight.

Below is what I propose to remove or consolidate, in priority order.

---

### 1. Delete legacy "named" builder folders (~110 files / ~836 KB)

`NodeBuilder.tsx` exclusively imports the prefixed builders (`bp01/BP01Builder`, `ba12/BA12Builder`, `yr19/YR19Builder`, etc.). The older "named" folders (`lead-magnet/`, `email-marketing/`, `social-media/`, `website/`, `course/`, `workbook/`, `home-study/`, `coaching/`, `membership/`, `webinar/`, `masterminds/`, `keynotes/`, `podcast-scripts/`, `community/`, `special-editions/`, `affiliates/`, `retreats/`, `audiobook/`, `book-sales/`, `certification/`, `conventions/`, `events/`, `exhibitors/`, `franchise/`, `fundraising/`, `group-coaching/`, `in-house-speaker/`, `jv-partnerships/`, `licensing/`, `revenue-share/`, `training-programs/`, `upsell/`, `white-label/`, `big-ticket/`) are no longer wired to any route.

Three small files inside these folders ARE still imported elsewhere and must be moved to a kept location before deletion:
- `social-media/socialKitHelpers.ts` → move to `builders/shared/socialKitHelpers.ts` (used by `bp03/BP03Builder.tsx` and `marketing-hub/SocialCalendarTab.tsx`)
- `home-study/types.ts` → move to `builders/shared/homeStudyTypes.ts` (used by `review/HomeStudyReviewView.tsx`)

Then delete the 33 folders.

### 2. Merge `BABuilderShared.tsx` and `YRBuilderShared.tsx`

The two files are 95% identical (StepHeader, AbbyCard, LoadingStep, PaymentLinkCard, SummaryCard, SuccessCheckmark). Differences: YR adds `MultiPaymentLinks` and `HighTicketPrice`, and the default category. Consolidate into a single `builders/shared/CategoryBuilderShared.tsx` with `category` prop driving defaults. Update the 12 importing builders (BA10–11, YR19–28) to the new path.

### 3. Collapse three redirect-only hub pages

`BrandProductsHub.tsx`, `BuildAuthorityHub.tsx`, `YieldRevenueHub.tsx` are now identical 35-line redirect shells (post the recent hub-consolidation work). Replace them with inline `<Navigate>` wrappers in `App.tsx` (or one shared `<HubRedirect category="brand|build|yield" />` component). Delete the three page files.

### 4. Remove 38 other unused components

After the named-builder folders are gone, these top-level orphans remain (no inbound imports):
- `src/pages/GetFeatured.tsx`
- `src/components/dashboard/AbbyAdvisorPanel.tsx`
- `src/components/dashboard/AbbyExecutionDashboard.tsx`
- `src/components/dashboard/BookChooserPopover.tsx`
- `src/components/dashboard/ROIBanner.tsx`
- `src/components/dashboard/builders/AbbyProposal.tsx`
- `src/components/dashboard/builders/CrossBuilderNotifications.tsx`
- `src/components/dashboard/builders/CrossBuilderPushSummary.tsx`

Each will be re-verified with a fresh import scan immediately before deletion (in case anything is referenced via dynamic import or a string).

### 5. Consolidate 30 near-identical generate-* edge functions

Functions `generate-yr19-coaching` through `generate-yr28-sponsors` (and the parallel BA10–18 set) are all ~60 lines following the exact same shape: parse author_id → snapshot → buildAuthorContext → call AI gateway with one prompt → upsertAuthorNode → restore on error. Only the NODE_ID, NODE_NAME, model, prompt template, and final field mapping differ.

Refactor approach:
- Add a new helper `runNodeGenerator()` in `_shared/builder-helpers.ts` that takes `{ nodeId, nodeName, model, buildPrompt(ctx), mapResult(content) }` and handles the entire boilerplate (snapshot, context check, AI call, upsert, error restore).
- Each per-node function becomes ~10–15 lines: only the prompt and result mapping.
- This is a refactor, not a deletion — the function endpoints stay so frontend calls keep working.

This drops ~1,800 lines of duplicated edge-function boilerplate to ~400.

---

### What I will NOT touch

- Per-node `BPxxBuilder.tsx` / `BAxxBuilder.tsx` / `YRxxBuilder.tsx` files — these are the active builders.
- The `_shared`, `shared`, `ba-shared`, `yr-shared` helper folders (after the BA/YR merge in step 2).
- Routes wired to actual UI.
- Anything under `supabase/functions/` other than the 30 listed generate-* functions.

### Verification plan

After each step:
1. Re-run import scans (`rg`) against the project to confirm nothing references deleted files.
2. Run the typecheck to catch broken imports.
3. Spot-check the navigation flow you previously fixed (Book Hub tabs, builder back links).

### Estimated impact

| Area | Files removed | Lines removed |
|---|---|---|
| Legacy builder folders | ~107 | ~12,000 |
| BA/YR shared merge | 1 | ~100 |
| Hub redirect pages | 2 | ~70 |
| Orphan components | 8 | ~600 |
| Edge function refactor | 0 (refactor) | ~1,400 net |
| **Total** | **~118** | **~14,000** |

No functional changes for the user. Approve and I'll execute steps 1–4 immediately, then step 5 as a focused refactor.