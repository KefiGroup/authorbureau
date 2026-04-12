

## Analysis: Lead Magnet Builder Step Flow Issues

### What I Found

The Lead Magnet Builder has 5 steps: Configure → Let Abby Build → Edit Content → Design → Preview & Publish.

**The core problem**: Steps 2 ("Let Abby Build") and 3 ("Edit Content") are both using the same `SharedContentStep` component, each with its own `contentKey` and `aiPrompt`. This means:

1. **Step 2** generates content → saves to `stepData.leadMagnetContent`
2. **Step 3** shows an empty "Ready to Design" card and requires the user to click **another** "Let Abby Design This" button to generate an "edited" version → saves to `stepData.leadMagnetEdited`
3. The user effectively generates content **twice** — once to create it, once to "edit" it

This is not the intended flow. Step 3 should pre-load Step 2's output and let the author **manually edit** it inline (add personal stories, fix wording, etc.), not trigger a second AI generation.

Additionally, the `EDIT_PROMPT` in `LeadMagnetStepRenderer.tsx` passes the Step 2 content via `{config}` — but it's the raw text, not a config object, which could confuse the AI.

### Proposed Fix

**File: `src/components/dashboard/builders/lead-magnet/LeadMagnetStepRenderer.tsx`**

Replace the Step 3 (`edit`) case so it:
- Pre-populates `leadMagnetEdited` from `leadMagnetContent` if the edit key is empty (so the author sees their generated content immediately)
- Shows the content in editable `ContentSectionCards` by default (not behind a generate button)
- Keeps the "Regenerate" and "Ask Abby" options available but secondary — the primary action is manual editing
- Uses `configKey="leadMagnetEdited"` (reading from its own key, not the generate step's key) so edits persist independently

**File: `src/components/dashboard/builders/shared/SharedContentStep.tsx`**

Add an optional `seedFromKey` prop that, when the component mounts with empty `contentKey`, copies content from `seedFromKey` into `contentKey`. This lets the Edit step auto-populate from the Generate step without a second AI call.

### Changes

| File | Change |
|------|--------|
| `src/components/dashboard/builders/shared/SharedContentStep.tsx` | Add `seedFromKey?: string` prop — if `contentKey` is empty and `seedFromKey` has content, copy it over on mount |
| `src/components/dashboard/builders/lead-magnet/LeadMagnetStepRenderer.tsx` | Update `edit` case to pass `seedFromKey="leadMagnetContent"` and `configKey="leadMagnetConfig"` so it pre-loads Step 2's output for manual editing |

This is a small, targeted change — two files, no backend or database updates needed.

