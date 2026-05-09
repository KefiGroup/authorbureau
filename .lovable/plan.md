## Goal
Make the “My Business Plan” / full-plan dialog reliably load the saved plan instead of falling through to “No plan found”.

## Plan
1. Standardize the client request auth for plan loading
- Update the plan-loading UI to use the project-standard token flow (`getActiveToken()` and timeout-safe fetch) instead of reading the shared session directly.
- Apply the same fix to both places that request the saved plan so they behave consistently.
- Keep the existing chat-content fallback only when there truly is no saved plan, not when auth silently failed.

2. Replace the custom user resolver in `business-consultant`
- Remove the function-local `resolveUser()` implementation and switch this edge function to the canonical shared resolver in `supabase/functions/_shared/resolve-user.ts`.
- This aligns the function with the project rule for identity resolution and avoids the current broken fallback path.
- Preserve book ownership checks, but make them work with the resolved user identity/email from the shared helper.

3. Harden the `get-plan` response behavior
- Stop returning the same empty payload for different failure modes.
- Return clear outcomes for:
  - unauthenticated request
  - book not owned by current user
  - no saved business plan exists for that book
- Update the UI to distinguish these cases so an auth/ownership failure is not shown as “No plan found”.

4. Validate against the existing saved-plan data path
- Verify the saved plan lookup still uses the existing `(book_id, asset_type = business_plan)` path.
- Keep the author-id normalization/self-heal, but only after a valid owned-book lookup succeeds.
- Confirm the dialog and saved-plan card both read the same backend result shape.

5. Ship a focused regression check
- Test loading a saved plan from the main business-plan surface and from the full-plan dialog.
- Confirm the empty state only appears when there is genuinely no saved plan for that owned book.
- Confirm expired/missing tokens no longer degrade into a false “No plan found” result.

## Technical details
- Frontend files likely involved:
  - `src/components/dashboard/FullPlanDialog.tsx`
  - `src/components/dashboard/SavedBusinessPlan.tsx`
  - token helper utilities already present in `src/lib/get-active-token.ts`
- Backend file involved:
  - `supabase/functions/business-consultant/index.ts`
- No database migration is planned; this should be a request/auth-path fix only.