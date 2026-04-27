# Marketing Funnel + Hub Audit — Fix Plan

The audit identified 10 issues across My Funnels and Marketing Hub. The content engine works well; the activation, publishing, and lead-capture wiring is broken. Below is a tight fix plan grouped by severity.

## Critical fixes (must ship first)

**1. Stop authors from publishing broken funnels** *(Bug #1)*
- In `NodeFunnelFlow.tsx` and the funnel card in `FunnelsHub.tsx`, compute `isComplete = required steps all !== "missing"`.
- If incomplete: disable the **Publish funnel** button, change tooltip to *"Complete all steps to publish"*, and show a small inline checklist of missing steps under the button.

**2. Guided step setup in funnel editor** *(Bug #2)*
- Update step editor drawers (Traffic, Checkout, Thank You, Onboarding Email) to:
  - Add a **"Step N of 5"** progress indicator at the top.
  - **Checkout**: detect Stripe connection via `author_profiles.stripe_onboarding_complete`. If false, show a primary **"Go to Connect Settings"** button that opens `/account-settings?tab=connections`.
  - **Traffic**: add a text field to paste a traffic source URL/note, persisted to the funnel step config.
  - **Thank You**: auto-prefill a default thank-you page from book metadata if empty.
  - **Onboarding Email**: deep-link to the matching sequence in Marketing Hub via `/dashboard?section=marketing-hub&tab=sequences&sequence=<id>`.

**3. Replace UUIDs with human-readable campaign labels** *(Bug #5)*
- In `MarketingHub.tsx` (line ~704), the "Activated …" line currently appears to surface a raw id when the date is missing. Guard the render: only show the date string when `marketing_activated_at` parses successfully; otherwise fall back to *"Activated"* with no UUID. Audit the campaign card to ensure no other field renders a raw UUID.

**4. Wire opt-in submissions into CRM + campaigns** *(Bug #6 — root cause of "0 leads captured")*
- In the public funnel opt-in submit edge function (the handler behind `/:authorSlug/free-gift` form):
  - Insert/upsert into `author_contacts` with `author_id`, `book_id`, `last_node_id`, `source_funnel_id`.
  - Find the active opt-in campaign for that `author_id` + node and increment `lead_count`.
  - Stamp `marketing_activated_at` if it was the campaign's first lead.
- Backfill: one-time edge function pass to attach the 2 existing free-gift conversions to the matching campaign, so Pauline sees real numbers immediately.
- Verify `ContactsTab.tsx` reads from `author_contacts` and shows the lead.

## High-priority fixes

**5. Make sender-domain "Pending" a blocking banner** *(Bug #7)*
- In Marketing Hub Overview, if `reply_to_confirmed_at IS NULL`, render a sticky red banner: *"Email delivery is paused. Confirm your reply-to email to start sending."* with a one-click **Resend confirmation email** button. Persist dismiss state per session only.

**6. Funnel suggestions banner — clearer CTA** *(Bug #3)*
- In `FunnelsHub.tsx` suggestions block (line ~384–440), replace the small chip pills with cards showing: product name, type badge (Sales / Opt-in / Application), expected funnel length, and a primary **Generate funnel** button. Add header text *"N products without funnels"*. Show per-product loading state while generating.

## Medium / low fixes

**7. "Activate All Sequences" button** *(Bug #8)*
- In `SequencesTab.tsx` add a button next to "Generate sequences for all 28 nodes" that bulk-activates every Draft sequence with one confirmation. Show a per-row spinner while the batch runs.

**8. Social calendar regeneration prompt** *(Bug #9)*
- In `SocialCalendarTab.tsx` (line ~437), if `lastScheduled - today < 7 days`, show a prominent banner *"Your calendar runs out in N days — generate 30 more posts"* with a one-click **Generate next 30 days** button. Toast on success.

**9. Draft-funnel URL label** *(Bug #4)*
- In `NodeFunnelFlow.tsx` line ~265, change *"(draft — not public)"* → *"(draft — preview only)"*. Clicking the link should open `?preview=<funnelId>` (already implemented for the preview button — apply same to the URL chip).

## Technical notes

- All funnel writes continue to go through the `funnels-manage` edge function (already in place from prior fix).
- New edge function or update existing public opt-in handler — confirm name during implementation; likely `funnel-public-submit` or similar.
- No schema changes required if `author_contacts.source_funnel_id` already exists; otherwise add a nullable column via migration.
- Keep memory rule: lead capture must always go through edge functions, never direct browser inserts.

## Out of scope

- Stripe onboarding itself (BUG-21 already addressed in prior pass).
- Verifying Pauline's actual reply-to email — that's a manual user action; we only make the UX unmissable.
- Generating new social posts beyond May 1 — handled by the regeneration button users will click.

## Suggested ship order

1. Bugs #1, #2 (publish gating + guided steps) — unblocks publishing.
2. Bug #6 (lead capture wiring) — fixes the analytics void.
3. Bugs #5, #7 (UUID + sender-domain banner) — visible polish.
4. Bug #3 (suggestions cards), then #8, #9, #4 — friction reducers.
