

## Findings

**1. Email node ↔ Marketing Hub Sequences linkage is broken on the read path.**
- DB has 1 real `email_flows` row for the user (`node_id=BP-01`, status=draft).
- `SequencesTab.tsx` queries `supabase.from("email_flows")` directly from the browser. This is the same RLS-on-cloud-client failure pattern as the social calendar — it returns empty even when rows exist (snapshot already proves it: `cross_counts.sequences` from the edge function would show >0 while the tab shows 0).
- The hub never tells `SequencesTab` which author profile to use either: it's invoked without `authorId` in `MarketingHub.tsx` (need to verify) and uses local-client RLS → the "No email sequences yet" empty state shows up.

**2. Other BP nodes are not actually linked to Marketing Hub artifacts.**
- BP-01 → `email_flows` (only created by `generate-email-sequence` / `populate-assets` edge functions, not by the BP-01 builder publish flow).
- BP-02 (Lead Magnet), BP-04 (Author Page), BP-05 (Webinar) → **no email_flows rows are created anywhere when published**. The BP-0x builders themselves never insert into `email_flows`.
- Result: even if the tab worked, only BP-01 would ever appear. BP-02/04/05 publishing leaves the Sequences tab empty for those campaigns.

**3. Activation in MarketingHub uses the wrong write path for non-BP-03 nodes.**
- `handleActivate()` updates `author_nodes.marketing_activated_at` via the cloud client (`supabase.from("author_nodes").update(...)`) — same RLS surface that returns empty reads.
- Even when activation appears to succeed in the UI, the snapshot edge function may not see the update, depending on which backend holds the rows.

**4. Right-panel scroll is coupled to viewport, not to the panel.**
- `AuthorDashboard.tsx` line 590: the `<main>` is the scrolling element with `overflow-y-auto`, but its parent flex column is `min-h-[100dvh]` (not constrained to viewport). This makes the whole page scroll instead of just the right panel — sidebar moves with content on smaller heights, and "scroll independence" is lost.
- Should be: outer wrapper `h-[100dvh] overflow-hidden`, sidebar `h-full overflow-y-auto`, right column `h-full overflow-hidden`, `<main>` `flex-1 overflow-y-auto`.

## Plan

### A. Fix Sequences tab read path (mirror the SocialCalendar pattern)
1. Add a `sequences` action to `supabase/functions/marketing-hub-state/index.ts` that returns `email_flows` + `email_flow_steps` for the resolved author via service role.
2. Add a `toggle_sequence_status` action for pause/resume.
3. Refactor `SequencesTab.tsx` to use `callMarketingHubState("sequences")` instead of querying `supabase` directly. Remove the `authorId` prop dependency (the edge function resolves it).

### B. Auto-link BP-02 / BP-04 / BP-05 to email_flows on publish
Each of these nodes already has a "publish/activate" path in its builder. On a successful publish:
1. Call the existing `generate-email-sequence` edge function (or insert a default flow row) so a corresponding `email_flows` row exists with the correct `node_id` (BP-02/04/05). This is the actual link to the Marketing Hub.
2. The Marketing Hub Sequences tab will then surface them, scoped by `node_id` badge (already in UI).

### C. Standardise activation writes through the edge function
1. Add an `activate_node` / `pause_node` action to `marketing-hub-state` that writes `marketing_activated_at` server-side via service role (bypasses any RLS mismatch).
2. Replace direct `supabase.from("author_nodes").update(...)` calls in `MarketingHub.handleActivate` / `handlePause` with the new edge action.
3. Keep BP-03 special-case (`repair_calendar`) untouched — it already works.

### D. Independent right-panel scrolling
Restructure `AuthorDashboard.tsx` shell:
- Outer: `h-[100dvh] overflow-hidden flex`
- Sidebar wrapper: `h-full overflow-y-auto` (its own scroll)
- Right column: `flex-1 h-full overflow-hidden flex flex-col`
- `<main>`: `flex-1 min-h-0 overflow-y-auto` (right panel scrolls only, sidebar stays put)
- Remove `min-h-[100dvh]` from inner column so it inherits parent height.

### E. QA after implementation
- Verify Sequences tab now lists the BP-01 flow (`Welcome + Nurture Sequence`).
- Publish BP-02 lead magnet → verify a new `email_flows` row appears tagged BP-02.
- Activate a campaign from Marketing Hub → verify `marketing_activated_at` is set in DB and top counter increments.
- Scroll the right panel on iPad/desktop → sidebar stays fixed, right side scrolls independently.

## Files to change
- `supabase/functions/marketing-hub-state/index.ts` — add `sequences`, `toggle_sequence_status`, `activate_node`, `pause_node` actions.
- `src/lib/marketing-hub-state.ts` — type updates for new actions.
- `src/components/dashboard/marketing-hub/SequencesTab.tsx` — switch to edge function reads/writes.
- `src/components/dashboard/MarketingHub.tsx` — activate/pause via edge function.
- `src/components/dashboard/builders/bp02/...`, `bp04/...`, `bp05/...` — on publish, create the linked `email_flows` row (via `generate-email-sequence` or direct insert through a new `marketing-hub-state` action).
- `src/pages/AuthorDashboard.tsx` — restructure shell for independent scroll panes.

