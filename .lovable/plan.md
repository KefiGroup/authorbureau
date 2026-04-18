
Root cause confirmed: `author_email_settings.author_id` stores the Author Profile ID, but the current RLS policy is `auth.uid() = author_id`. That can never pass for normal saves, so the insert/upsert is rejected with the row-level security error. The Settings tab is also the odd one out in Marketing Hub because it writes directly to the table instead of using the existing backend action pattern.

Plan

1. Fix the broken backend policy
- Create a migration that removes the current `author_email_settings` policy.
- Replace it with authenticated owner policies that resolve ownership through `author_profiles`:
  - SELECT: allow when `author_profiles.id = author_email_settings.author_id` and `author_profiles.user_id = auth.uid()`
  - INSERT: same ownership rule in `WITH CHECK`
  - UPDATE: same ownership rule in both `USING` and `WITH CHECK`
- Keep the admin read policy intact.

2. Align Settings with the existing Marketing Hub backend flow
- Extend `supabase/functions/marketing-hub-state/index.ts` with:
  - `email_settings` action to load sender settings for the resolved author profile
  - `save_email_settings` action to upsert settings for that author profile
- Reuse the existing token + identity + author profile resolution already used by the other Marketing Hub tabs.

3. Update the Settings UI to stop writing directly to the table
- Refactor `src/components/dashboard/marketing-hub/SettingsTab.tsx` to use `callMarketingHubState(...)` for both load and save.
- Keep the same UI, but return clearer errors from the backend instead of raw table/RLS failures.
- Preserve the current sender name, reply-to email, and verified badge behavior.

4. Fix the “Verify domain & connections” behavior
- Make the Settings tab reload the latest verification state from the backend instead of relying only on local table reads.
- Keep the button routed to Connections if that remains the intended setup path, but ensure the badge/status is sourced from the same backend action so it stays consistent.

5. Validate end-to-end
- Test save when no settings row exists yet.
- Test save when a row already exists.
- Reload the page and confirm values persist.
- Confirm another signed-in user cannot read or update someone else’s settings.
- Confirm the error toast disappears and success toast appears.

Technical details
- Files to update:
  - `supabase/migrations/...new migration...sql`
  - `supabase/functions/marketing-hub-state/index.ts`
  - `src/components/dashboard/marketing-hub/SettingsTab.tsx`
- I will not touch the auto-generated Supabase client.
- This approach fixes the immediate RLS bug and also removes the fragile direct-write path that caused the repeated auth confusion earlier.
