# Fix Marketing Hub Sequences — ordering, Edit button intent, and back navigation

## What you're seeing (and why)

Looking at your three screenshots and the code, three separate problems are stacked on top of each other in the Sequences tab. Here's what's actually happening:

### 1. Sequences appear in random order (BA-13 first, not BP-01)
The `marketing-hub-state` edge function returns sequences ordered by `created_at DESC` (newest first). Because the AI generated BA-13's sequence after the BP nodes, BA-13 floats to the top. There is no logic that sorts by node order (BP-01 → BP-09 → BA-10 → ... → YR-28).

### 2. Clicking "Edit" on a sequence opens the node builder and restarts it
Today, the Edit button on a sequence row routes to `/node-builder/{node_id}` (e.g. `/node-builder/BA-13`). That opens the **product builder** for Group Coaching — not an email sequence editor.

Worse, the BA-13 builder reads its draft from `author_nodes`. If that draft is missing for the active book (or was generated against a different book), the builder lands on the Introduction step and — once you click Generate — kicks off a fresh build, which is what your "Publishing your group coaching programme…" screenshot is showing. You did not ask to rebuild the node; the Edit button took you somewhere that *can only build*, not edit.

The intent of "Edit" on a sequence row should be **edit the email sequence** (subjects, delays, body) — not open the product builder.

### 3. The "Back" button from the builder lands on the Dashboard
The builder's back link points to `/build-authority` (for BA-xx nodes). That route is now a `HubRedirect` that requires an active `bookId` in `useBookContext`; if none is set it falls through to `/dashboard`. Because Marketing Hub does not pass `bookId` into the builder URL, back-navigation always loses the book context and dumps you at the dashboard.

## Proposed fixes

### A. Sort sequences in canonical node order (Master first, then BP-01 → YR-28)

In `supabase/functions/marketing-hub-state/index.ts` (action `sequences`), keep the DB query but re-sort the results in JS using a fixed node-order map:

````text
master_nurture → BP-01 → BP-02 … BP-09 → BA-10 … BA-18 → YR-19 … YR-28 → (anything unknown last)
````

This guarantees the visual list always reads top-to-bottom in framework order regardless of when each sequence was generated.

### B. Make "Edit" actually edit the email sequence (not the node builder)

Add a real sequence editor as a side drawer/modal opened from the Sequences tab. Scope (v1, minimal):

- Edit sequence **title** and **description**
- Per-step: edit **subject**, **trigger delay (days)**, and **body** (textarea, plain text/markdown)
- Add a step / delete a step / reorder steps
- Save → calls a new `update_sequence` action on `marketing-hub-state`

New edge-function action:
- `update_sequence` — accepts `{ flow_id, title?, description?, steps: [{ id?, step_number, subject, body, trigger_delay_days }] }`. Upserts `email_flows` row + replaces `email_flow_steps` for that flow_id (author-scoped).

The Edit button on each row opens this drawer instead of navigating away. Add a smaller secondary link **"Open {node_id} builder"** for users who genuinely want to rebuild the underlying product — that link keeps the existing `/node-builder/{nodeId}` behavior so it's still discoverable but never the default.

### C. Fix back-navigation from the node builder

In `src/pages/NodeBuilder.tsx`, change `getHubPath` so that when there is no `bookId`:
- If the user came from Marketing Hub (detect via a `from=marketing-hub` query param OR `document.referrer`), go back to `/marketing-hub?tab=sequences`.
- Otherwise, instead of `/brand-products` / `/build-authority` / `/yield-revenue` (which redirect to dashboard when no book is set), go to `/my-books-hub` so the user can pick a book — or to `/dashboard` only as a last resort.

Also pass `?from=marketing-hub` from the Sequences tab whenever it does navigate to a builder (the secondary "Open builder" link in fix B), so the back button in the builder returns to the Sequences tab — not the dashboard.

### D. (Optional polish) Block Edit from triggering generation

Independent of A–C: in BA-13 (and any builder that reads a draft on mount), do not auto-advance to step 1/3 when the draft is empty. Today the screenshot shows the Publish step actively generating, which suggests a stale draft state pushed it forward. Verify `BA13Builder.tsx`'s draft restore logic guards on `__draft.content` being non-null before setting `step` past 0. (This is a small defensive patch; no behavior change for legitimate drafts.)

## Files to change

- `supabase/functions/marketing-hub-state/index.ts` — sort `sequences` response in framework order; add `update_sequence` action.
- `src/components/dashboard/marketing-hub/SequencesTab.tsx` — replace Edit-button navigation with a new SequenceEditorDrawer; add secondary "Open builder" link with `?from=marketing-hub`.
- `src/components/dashboard/marketing-hub/SequenceEditorDrawer.tsx` — **new file**. Title/description + steps CRUD, calls `update_sequence`.
- `src/pages/NodeBuilder.tsx` — back-link reads `from=marketing-hub` and routes back to `/marketing-hub?tab=sequences`; safer fallback when no bookId.
- `src/components/dashboard/builders/ba13/BA13Builder.tsx` — defensive guard so an empty draft never auto-advances steps. (Apply same guard to any other builder showing this pattern if found during implementation.)

## Out of scope (call out, don't build now)

- Rich-text email body editor (v1 uses plain textarea).
- AI "regenerate just this step" button — can be added later.
- A/B variants per step.

Approve this and I'll implement A → D in one pass, then ask you to retest from the Sequences tab.
