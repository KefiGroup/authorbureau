## Plan

1. **Fix the BP-03 data model flow so 30 posts survive every save/repair path**
   - Update the BP-03 repair/save pipeline to preserve the new 30-day, 6-archetype structure instead of falling back to legacy defaults.
   - Remove the remaining `"insight"` fallback in `bp03-node-state` and persist the canonical archetype label into calendar rows.
   - Ensure Instagram carousel rows also carry both the canonical archetype and `carousel_slides` data when rebuilt from saved content.

2. **Correct the remaining BP-03 builder copy and step labels**
   - Change any remaining BP-03 UI strings that still say `20 posts`, `Publish`, or `Send to Calendar` to the approved wording.
   - Make the step label read exactly **"Send to Social Calendar"** and align the intro/subtitle/success copy with the 30-post spec.
   - Update the Marketing Hub BP-03 campaign description so the dashboard no longer advertises the old 20-post version.

3. **Fix Facebook Page OAuth persistence in Connect Settings**
   - Reconcile the connection upsert logic with the new uniqueness rule on `social_connections(user_id, platform)` so Facebook page connections don’t disappear after authorization.
   - Keep the page-pick flow intact, but make sure the final stored row is the one that Connect Settings and `useSocialConnectionStatus()` actually read.
   - Preserve the instant refresh behavior via `BroadcastChannel` and existing focus refresh.

4. **Finish the Instagram carousel implementation in the calendar UI**
   - Verify the generator, persistence, and Marketing Hub state all treat the required ~9 Instagram carousel days as real carousel posts.
   - Ensure carousel posts render their preview/download UI consistently in both unscheduled and scheduled calendar cards.
   - Confirm calendar actions (schedule, copy/open, mark posted) work without stripping carousel metadata.

5. **Validate the BP-03 experience end-to-end**
   - Verify the generator now produces 30 posts across the 6 approved archetypes.
   - Verify the builder shows the correct step label and updated 30-post copy.
   - Verify Facebook Page connection remains visible after the OAuth return flow.
   - Verify carousel posts appear in the calendar with previewable/downloadable slides.

## Technical details

**Files likely to update**
- `supabase/functions/bp03-node-state/index.ts`
- `supabase/functions/social-connect-callback/index.ts`
- `src/components/dashboard/builders/bp03/BP03Builder.tsx`
- `src/components/dashboard/MarketingHub.tsx`
- `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx`
- Possibly `src/components/dashboard/builders/shared/socialKitHelpers.ts` if any platform/archetype normalization needs a final cleanup.

**Key fixes**
- Replace the legacy fallback `d.post_type || "insight"` with canonical BP-03 archetype persistence.
- Make the social connection upsert conflict target match the unique-per-platform behavior used by the UI.
- Keep carousel rows distinct from archetype labels by storing archetype canonically while using separate format/carousel metadata for rendering.

**Expected outcome**
- BP-03 consistently behaves as a 30-post, 6-archetype social kit.
- The builder label reads exactly `Send to Social Calendar`.
- Facebook Page connections persist visibly in Connect Settings after auth.
- Instagram carousel posts are present and usable in the Social Calendar.