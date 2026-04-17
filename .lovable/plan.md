
I checked the BP-03 flow against the current code and the existing saved records for Pauline Teo. The current fix is not sufficient yet.

What I found
- Pauline Teo’s author profile exists, and the BP-03 “Social Media” node already contains a full generated kit.
- The node is stuck in a half-saved state: the content is there, but the resume metadata is not fully normalized.
- Specifically, the builder depends on step markers like `current_step`, `_currentStep`, and `publishStatus`, but the existing BP-03 row is not consistently updated to that stable review state.
- That explains both symptoms:
  - “Save” still errors
  - the node can drop back to Introduction instead of reopening at Review

Why this is happening
- BP-03 is using its own custom token/auth path instead of the project’s standard token helper.
- Its backend save/load function is also doing a stricter identity/profile match than the rest of the app.
- So the generated content can exist, while the manual save/resume handshake still fails for a live user session.

Implementation plan
1. Standardize BP-03 auth
   - Remove the BP-03-only token resolver.
   - Switch BP-03 to the shared `getActiveToken()` + `fetchWithTimeout()` pattern already used elsewhere in the project.
   - Stop hiding the real backend message behind the generic “couldn’t save” state.

2. Harden the BP-03 backend function
   - Update `bp03-node-state` so it resolves the signed-in user with the same resilient identity pattern used in other functions.
   - Validate ownership using the platform’s canonical author mapping instead of one brittle match path.
   - Return explicit errors for token mismatch, author mismatch, missing profile, and invalid payload.

3. Auto-heal already-generated BP-03 records
   - If a usable social kit already exists, treat it as reviewable even when step metadata is stale or missing.
   - On successful load/save, normalize the record into a stable review state by writing:
     - `current_step = 2`
     - `_currentStep = 2`
     - `publishStatus = content_ready`
   - This will stop already-generated kits from falling back to Introduction.

4. Make Save idempotent
   - If the exact kit is already stored, Save should return success instead of attempting a brittle second write.
   - That keeps “Save to My Account” safe to click repeatedly.

5. Verify on live, not just preview
   - Test with Pauline’s live account flow.
   - Confirm these exact behaviors:
     - Save succeeds with no error toast
     - refresh returns to Review
     - leaving and re-entering BP-03 resumes correctly
     - Activate still works after the save-path fix

Files likely involved
- `src/components/dashboard/builders/bp03/BP03Builder.tsx`
- `supabase/functions/bp03-node-state/index.ts`
- Possibly `src/pages/NodeBuilder.tsx` if the parent author-id hydration also needs tightening

Technical details
- This is not a generation problem. The BP-03 content already exists in the database.
- It is a save/resume state problem caused by inconsistent step persistence and a brittle live-session identity check.
- I would keep the fix tightly scoped to BP-03 first, then only widen it if the live verification shows the same pattern elsewhere.
