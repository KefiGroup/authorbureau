
I checked the page code and the confusion is real. The toast in your screenshot is coming from the sticky footer button, not from the real lead-magnet publish action.

What is happening now
- Header "Save Draft" = saves draft
- Sticky footer "Publish" = for custom builders, it does not publish; it only saves draft and shows the toast
- In-step button ("Publish"/"Update") = this is the real deploy action

There is also a label problem:
- `SharedPublishStep` sets `stepData.published = true` even when the result is only `published_pending_ghl`
- so the real button changes to "Update" even when nothing is actually live yet

I also found 3 wiring bugs in Connected Accounts:
- it fetches nodes with `author_id = userId` instead of the author profile id
- "Connect Now" calls `ghl-provision-author` without the required `author_id`
- "Re-deploy" sends `node_id` to `deploy-bp02-to-ghl`, but that function expects `author_id`

The real lead-magnet publish path is also fragile because it resolves the author profile through the cloud client instead of the shared-token pattern used elsewhere.

Plan

1. Remove the misleading footer publish behavior
- On the last step of custom publish builders, stop showing a footer CTA that says "Publish" when it only saves a draft.
- Keep one clear publish action for the final step.
- Either hide the footer primary CTA on that step or rename it to a true draft-only action.

2. Make the real publish button say exactly what it does
- Update the in-step CTA labels so they reflect the actual state:
  - before first publish: "Publish to Marketing Hub"
  - pending connection: "Retry Publish"
  - live: "Update Live Funnel"
- Do not use the generic "Update" label for pending/non-live states.

3. Add a persistent publish status panel
- In `SharedPublishStep`, persist result data into `stepData` (`publishStatus`, `publishLiveUrl`, `publishMessage`).
- Render a status card from saved state, not just temporary toast/local state.
- Show clear next steps:
  - Pending: "Saved, not live yet. Go to Connected Accounts → Connect Now → Re-deploy Lead Magnet."
  - Live: show the live URL plus "Go to Marketing Hub" CTA.
- Add Copy/Open Link actions so the user can see exactly where the lead magnet went.

4. Fix the broken Connected Accounts buttons
- Resolve the current author profile id correctly from `author_profiles.id`.
- Query deployed nodes using that id only.
- Remove the unsafe fallback query that can grab the wrong profile.
- Pass `author_id` into "Connect Now".
- Use the correct node→deploy function mapping and pass `author_id` for "Re-deploy".

5. Harden the actual Lead Magnet publish action
- In `LeadMagnetStepRenderer`, resolve author profile id using the same cloud+shared fallback pattern already used elsewhere.
- Invoke deployment with the active-token fetch pattern so shared-session users are handled reliably and error bodies are readable.
- Show specific publish errors instead of a generic "Publish failed".

6. Make the flow explicit on the page
- Add a short explainer above the real publish CTA:
  1. Save the lead magnet
  2. If connected, build the funnel immediately
  3. If not connected, save as pending and send you to Connected Accounts
  4. After live, go to Marketing Hub to activate/distribute
- Update post-publish copy so it names the exact destination tab/button, not just "Settings".

Expected flow after the fix
- Save Draft = only saves work
- Publish to Marketing Hub:
  - not connected: saves as pending and shows "Connected Accounts → Connect Now → Re-deploy"
  - connected: creates the live lead magnet funnel and shows the live URL
- Connect Now = provisions the marketing account
- Re-deploy = pushes the pending lead magnet without reopening the builder
- Marketing Hub = activates the downstream distribution/social flow

Files to update
- `src/components/dashboard/builders/UniversalBuilderStudio.tsx`
- `src/components/dashboard/builders/shared/BuilderFooter.tsx`
- `src/components/dashboard/builders/shared/SharedPublishStep.tsx`
- `src/components/dashboard/builders/lead-magnet/LeadMagnetStepRenderer.tsx`
- `src/components/settings/ConnectedAccountsTab.tsx`
- optional small shared utility for author-profile-id resolution

Technical notes
- No database migration needed.
- No new tables needed.
- Existing deploy/provision functions can be reused; the main issues are CTA clarity, wrong parameter wiring, and unreliable author-profile resolution.
- QA should test every button on this page end-to-end in both states:
  - no marketing account connected
  - marketing account already connected
