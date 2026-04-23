
# Fix plan — BP-07 publish loop (and the same hidden bug in BP-08 / BP-09)

## Root cause
The publish request is reaching the backend, but the backend logs show:

```text
[save-author-node:publish] no draft row found { authorId: "...", nodeId: "BP-07" }
```

That means the **Publish** step is working, but there is **nothing in `author_nodes` for BP-07 to publish**.

The bug is in the builder save flow:
- `BP07Builder`, `BP08Builder`, and `BP09Builder` currently try to save drafts with direct browser `.update(...)` calls on `author_nodes`
- on a fresh node, that update does **not insert a row**
- in this project, working builders use the `save-author-node` backend helper via `autosaveBuilderDraft(...)`, which handles the shared-auth / RLS mismatch and does insert-or-update safely
- so Publish runs, the backend looks for the draft row, finds nothing, and the UI drops back to the review screen

## What to change

### 1) BP-07: replace direct draft writes with the platform autosave helper
In `src/components/dashboard/builders/bp07/BP07Builder.tsx`:
- replace the direct `author_nodes.update(...)` in `handleGenerate`
- replace the direct `author_nodes.update(...)` in `handlePublish`
- replace the direct `author_nodes.update(...)` inside `saveChannels`

Use:
- `autosaveBuilderDraft({ authorId, nodeId: "BP-07", nodeName: "Home Study Course", content, currentStep })`

This ensures:
- first save inserts the row if missing
- later saves update the same row
- `_currentStep` persists correctly
- Publish always has a draft row to flip live

### 2) BP-07: load using the same draft loader pattern as working nodes
Still in `BP07Builder.tsx`:
- switch initial hydration to use `loadBuilderDraft(authorId, "BP-07")` as the primary resume path
- keep the existing content restoration rules (`step >= 2`, live = step 3)
- preserve `delivery_channels`, `suggested_price_usd`, and `activated`

This makes BP-07 behave like the stable builders that already survive refresh and publish correctly.

### 3) BP-08 and BP-09: apply the same fix now
These two builders have the same fragile pattern:
- direct `.update(...)` on generate
- direct `.update(...)` before publish

Update:
- `src/components/dashboard/builders/bp08/BP08Builder.tsx`
- `src/components/dashboard/builders/bp09/BP09Builder.tsx`

Replace those direct writes with:
- `autosaveBuilderDraft(...)` on generate
- `autosaveBuilderDraft(...)` immediately before `publishNodeToSite(...)`
- `loadBuilderDraft(...)` on hydration

This prevents the same “looks saved but nothing exists to publish” failure from recurring there.

### 4) Keep publish flow the same, but only after draft persistence succeeds
For BP-07 / BP-08 / BP-09:
- persist merged content first
- then call `publishNodeToSite(...)`
- only mark `activated: true` in local state after publish succeeds

That keeps the UI honest and aligned with the backend state.

### 5) Add a clearer recovery message if publish cannot find a draft
If publish still fails for any reason:
- show a specific error/toast like:
  - “Your draft wasn’t saved yet. Saving it now — please try Publish again.”
or
  - surface the backend message directly instead of silently bouncing to review

This avoids the confusing “jump back to this screen” experience.

## Files to update
- `src/components/dashboard/builders/bp07/BP07Builder.tsx`
- `src/components/dashboard/builders/bp08/BP08Builder.tsx`
- `src/components/dashboard/builders/bp09/BP09Builder.tsx`
- `src/lib/builder-autosave.ts` only if a tiny helper extension is needed (likely not)

## Validation checklist
After implementation, verify these cases:

1. **Fresh BP-07**
   - generate content
   - click Publish
   - draft row is created
   - node goes live instead of bouncing back

2. **BP-07 with channel edits**
   - toggle Thinkific / PDF bundle
   - refresh
   - selections persist
   - Publish still works

3. **Existing BP-07 draft**
   - reload builder
   - step restores to Review or Publish correctly
   - Publish succeeds

4. **BP-08 and BP-09**
   - generate from a clean state
   - publish on first attempt
   - reload restores correct step
   - no jump back to introduction/review unless there is a real backend error

## Expected outcome
After this fix:
- BP-07 will stop bouncing back from Publish
- the draft will actually exist before publish runs
- BP-08 and BP-09 will use the same reliable save pattern
- all three builders will match the proven save/publish behavior already used by the stable nodes
