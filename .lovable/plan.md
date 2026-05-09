## Plan

1. Fix BP-03 book scoping end to end
- Update the BP-03 builder intro and saved-state flow to use the active URL-scoped book instead of `useAuthorBook()`’s fallback latest book.
- Pass `book_id` on every BP-03 state-changing request, not just the initial generate call. That includes save/edit/activate flows and Marketing Hub’s `repair_calendar` activation call.
- Update the `bp03-node-state` function so load/save/repair queries are consistently scoped by `(author_id, node_id, book_id)` when a `bookId` is present, instead of reading/updating the unscoped row.
- Verify the generation function already accepts `book_id` and preserves it when writing the node, then align the frontend with that contract.

2. Fix My Funnels stage-card readiness for override-backed stages
- Update the funnel stage-card rendering path so a stage shows `Ready` when a `funnel_stage_overrides` row exists for that `(funnel_id, stage_id)`, even if the stage has no base funnel copy.
- Keep current base-content readiness intact for stages like Sales Page / Checkout, but treat override presence as a completion signal for auto-completed stages such as Thank You, Confirm Email, Deliver Magnet, Nurture Day 1, and Upsell.
- Reuse the existing `listOverridesBulk()` data already loaded in `FunnelsHub` rather than adding a new database call.

3. Validate Stripe Express payout capability for connected authors
- Review the existing payout flow and confirm whether an author with completed Stripe Connect Express onboarding is eligible to receive payouts.
- Confirm the current system uses payout-only Express accounts (`transfers` capability), checks onboarding completion, and sends transfers from the monthly payout runner.
- Call out any important practical limits still enforced by the current code, such as minimum payout threshold, admin/manual trigger path vs scheduled run, and failure states when Stripe needs more verification.

## Technical details
- **Frontend files likely touched:** `src/components/dashboard/builders/bp03/BP03Builder.tsx`, `src/components/dashboard/MarketingHub.tsx`, `src/components/dashboard/FunnelsHub.tsx`, and possibly `src/lib/funnel-flow-stages.ts`.
- **Backend files likely touched:** `supabase/functions/bp03-node-state/index.ts`.
- **No schema changes expected** for these fixes.

## Expected outcome
- Opening `/node-builder/BP-03?bookId=...` will show and save against the correct book.
- Activating BP-03 from Marketing Hub will rebuild the calendar for the correct book only.
- Funnel stages with confirmed override rows will display `Ready` instead of `Not set`.
- For payouts: authors who completed Stripe Connect Express onboarding can receive payouts through the existing payout runner, subject to the current threshold and Stripe account readiness checks.