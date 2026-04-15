

# Fix BP-02 Draft Persistence & Publish Flow

## Problems Identified

**Problem 1: "Comes back to new lead magnet after refresh"**
The node load on line 130 correctly checks for `content_ready` or `live` status and restores state. However, there's a race condition: `authorId` starts as `null` in `NodeBuilder.tsx` (line 52) and gets set asynchronously. If BP02Builder mounts before `authorId` arrives, the effect at line 83 returns early (`if (!authorId) return`). When `authorId` later arrives the effect re-runs — but if the DB query fails silently or returns no data (e.g. the auto-save didn't complete properly), the user sees step 0.

The real culprit: the `content.activated` flag is set in-memory (line 330) but **never persisted** to `content_json`. So on reload for a "live" node, line 134 does re-set `activated: true` — this should work. The more likely cause is that the **auto-save after generation** (lines 166-186) silently fails due to RLS or missing fields, meaning `content_json` is never written to the DB.

**Problem 2: "Thank you and publish tabs skipped — goes straight to published"**
The channel selection panel and "Publish Selected" button are inside `ReviewStep` (step 2), visible on ALL tabs. The user can click Publish while still on the Opt-in tab without ever seeing the Thank You or Distribution tabs. The stepper shows step 4 = "Publish" but there is no distinct step 3 for the publish UI — it jumps from Review (step 2) straight to PublishSuccessStep (step 3).

## Plan

### 1. Separate Publish into its own step (step 3)

Currently: `STEPS = ["Introduction", "Generating", "Review", "Publish"]` with Review containing both content review AND the channel selection/publish button.

Change to a **5-step flow**: `["Introduction", "Generating", "Review", "Publish", "Live"]`
- **Step 2 (Review)**: Content tabs only (Content, Magnets, Opt-in, Thank You, Distribution). Bottom has "Save Draft" and "Next: Publish →" buttons.
- **Step 3 (Publish)**: Channel selection panel + "Publish Selected" button. This is the dedicated pre-publish step.
- **Step 4 (Live)**: PublishSuccessStep (current step 3 logic).

This forces authors to review all tabs before reaching the publish screen.

### 2. Fix draft persistence reliability

- Add error handling with `console.error` to the auto-save block (lines 166-186) so failures are visible.
- After publish, save `publishChannels` into `content_json` so they're restored on reload.
- On load, restore `publishChannels` from `content_json` if present.

### 3. Fix step restoration on refresh

Update the node-load logic (lines 130-137):
- `status === "content_ready"` → step 2 (Review) — already correct
- `status === "live"` → step 4 (Live) with `activated: true` — update from step 3 to step 4

### Files to edit

| File | Change |
|---|---|
| `BP02Builder.tsx` | Update STEPS to 5 steps. Extract channel selection panel from ReviewStep into new PublishStep component. Update step indices. Save/restore publishChannels. Add error logging to auto-save. |

No database or edge function changes needed.

