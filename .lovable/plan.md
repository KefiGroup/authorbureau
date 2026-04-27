# Sprint E — Re-check follow-up

Fixes the 5 outstanding items from the April 27 re-check. Plan reflects evidence verified against the live database and source code.

## Verified findings

- **Stripe (C4):** Pauline's `author_profiles` row has `stripe_account_id = NULL` and `stripe_onboarding_complete = false`. She has not started onboarding from inside Authors Bureau. Whatever she completed on stripe.com is a separate account our platform doesn't know about.
- **Publish gating (H1):** Both Publish buttons are `disabled` when steps are missing. The bottom one only lacks a tooltip — but visually still looks active to non-technical users.
- **View counter (M1):** `track-funnel-view` edge function is healthy and the schema is correct (`funnels.page_views`). However the function has zero log entries — the client call is silently failing (the `.catch(() => {})` swallows errors). All 5 of Pauline's funnels show `page_views = 0`.
- **Social cron (M3):** `auto-refill-social-calendar-daily` cron job IS installed (runs 03:00 UTC). It just hasn't ticked yet because we deployed it the same day. No code fix needed for the cron itself, but no manual trigger button exists.
- **Lead attribution (NEW-2):** Confirmed in `MarketingHub.tsx` — every campaign card renders `{totalLeads}` (the global count) instead of a per-campaign count.

## Fix plan

### 1. Stripe onboarding visibility (BUG-C4) — P0
- Update `RevenueFullDashboard` and the Stripe sidebar tile to show three distinct states: **Not started** (no `stripe_account_id`), **In progress** (account created, onboarding incomplete), **Connected** (transfers active).
- Add a **"Refresh Stripe status"** button on the Revenue Dashboard that calls the existing `stripe-connect` `status` action. This forces the bi-directional sync we already wrote in Sprint B.
- When `stripe_account_id` is NULL, the prompt copy changes from "Connect Payment Account" to **"Start Stripe onboarding"** with a one-line explainer that completing onboarding on stripe.com directly does not link to Authors Bureau — they must start from this button.

### 2. Funnel view counter (NEW-1 / BUG-M1) — P0
- Replace the silent `.catch(() => {})` in `FunnelPage.tsx` with a `console.warn` + `sendBeacon` fallback so we can see why calls are failing.
- Switch the call from raw `fetch` to `supabase.functions.invoke()` so it carries the standard headers and gets retried correctly.
- Add a guard in the dashboard render so displayed `page_views` is always `Math.max(page_views, conversions)` — prevents the impossible "0 views, 2 conv" display while real tracking flows in.
- Backfill existing live funnels: set `page_views = GREATEST(page_views, conversions)` once, via migration.

### 3. Per-campaign lead attribution (NEW-2) — P1
- In `MarketingHub.tsx`, replace the single `totalLeads` per card with a `leadsByNodeId` map computed from `crm_contacts.last_node_id` grouped against each campaign's `nodeIds`.
- Header stat ("X of 8 campaigns active · Y leads captured") keeps the global count.
- Empty-state copy on each card: "No leads from this campaign yet."

### 4. Bottom Publish button cleanup (BUG-H1) — P1
- In `NodeFunnelFlow.tsx` (lines 316–326): hide the bottom Publish button entirely when `funnel.status !== 'live'`. Drafts will only have the gated Publish button inside the amber banner. Live funnels keep the bottom Pause button.
- Keeps the Preview/Open buttons in their current spot.

### 5. Manual social calendar refill (BUG-M3 follow-up) — P2
- Add a **"Generate 30 more days"** button to the Social Calendar tab header that calls the existing `auto-refill-social-calendar` function for the current author.
- Show an amber banner when `<= 7 days` of queued posts remain: "Calendar runs out in N days — auto-refill scheduled overnight, or generate now."

## Out of scope
- Renaming `crm_contacts` keys or changing how `submit-funnel` writes leads (working as designed).
- Touching the existing nightly social cron — it's correct, just hasn't ticked yet.
- Building a real Stripe webhook listener; the polling "Refresh status" button is sufficient until Pauline confirms onboarding works.

## Files I'll touch
- `src/pages/RevenueFullDashboard.tsx` — three-state Stripe block + refresh button
- `src/pages/FunnelPage.tsx` — view-tracking via `supabase.functions.invoke`
- `src/components/dashboard/MarketingHub.tsx` — per-campaign lead counts, view-counter guard, social refill button
- `src/components/dashboard/builders/shared/NodeFunnelFlow.tsx` — hide bottom Publish on drafts
- One small SQL migration to backfill `page_views` on live funnels

Ready to implement on approval.