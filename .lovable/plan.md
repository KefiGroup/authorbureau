

## Problem

Two issues to fix:

**1. RLS Error on Publish ("new row violates row-level security policy for table generated_assets")**

The footer "Next" button on the last step calls `UniversalBuilderStudio.handlePublish`, which tries to insert into `generated_assets` using the client-side Supabase SDK. The user is authenticated via the shared backend, so `auth.uid()` on the Cloud Supabase is either null or a different ID — causing the RLS INSERT policy to reject the row.

Meanwhile, `SharedPublishStep` (rendered inside the step) has its own publish handler that correctly calls the `deploy-bp02-to-ghl` edge function (which uses the service role key and bypasses RLS). So there are two competing publish paths and the wrong one is being triggered.

**2. Post-Publish Flow: Abby should guide the author to the next step**

After publishing the lead magnet, Abby should advise the author on what to do next — connect GHL in Settings to go live, then distribute via the Marketing Hub to social media.

## Plan

### Fix 1: Prevent the footer button from doing a redundant client-side insert for builders with custom publish logic

In `UniversalBuilderStudio.tsx`, the `handlePublish` function (line 613) runs generic product-table insert logic for ALL builders. But builders like Lead Magnet that have a custom `publishFn` in `SharedPublishStep` already handle publishing via edge functions.

**Change:** In `UniversalBuilderStudio.handlePublish`, skip the client-side `generated_assets` insert when the builder has a `customRenderer` (meaning its publish step handles its own logic). Instead, just save the draft and mark as complete. Specifically:

- After `handleSaveDraft(true)` at line 617, add a check: if `nodeConfig.customRenderer` is set AND we're on the last step, skip the generic insert block (lines 618-686) — the custom renderer's `SharedPublishStep` already handles the real publish.
- Show a toast directing users to click the "Publish" button inside the step content instead.

Alternatively (simpler and safer): change the footer button on the last step to NOT call `handlePublish` at all when the builder has a custom renderer. Instead, make it a no-op or just save draft.

### Fix 2: Add Abby next-step guidance after successful publish

In `LeadMagnetStepRenderer.tsx`, after `publishLeadMagnet` succeeds:

- If status is `published_pending_ghl`: Show a toast with "Lead magnet saved! Next step: Connect GoHighLevel in Settings to activate your live opt-in page."
- If status is `live`: Show a toast with "Your lead magnet is live! Next step: Visit the Marketing Hub to distribute it across social media."

Update `SharedPublishStep.tsx` to:
- Pass the publish result back so the UI can show contextual next-step advice
- Show a small Abby tip card after publishing with the recommended next action and a button to navigate there (Settings or Marketing Hub)

### Files to change

1. **`src/components/dashboard/builders/UniversalBuilderStudio.tsx`** — Skip generic DB insert on last step when builder has a custom renderer
2. **`src/components/dashboard/builders/shared/SharedPublishStep.tsx`** — Show post-publish Abby guidance based on publish result
3. **`src/components/dashboard/builders/lead-magnet/LeadMagnetStepRenderer.tsx`** — Pass publish result to SharedPublishStep for next-step advice

### Technical details

- No database migration needed
- No edge function changes needed
- The `deploy-bp02-to-ghl` edge function already returns `status: "published_pending_ghl"` or `status: "live"` — we just need to surface this in the UI
- The fix prevents RLS errors by eliminating the redundant client-side insert path

