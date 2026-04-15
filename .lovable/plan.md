<final-text>The root cause is a combination of 2 bugs, not just one:

1. Refresh loads protected backend data before the auth session is fully restored.
- `src/pages/NodeBuilder.tsx` gets the user from the shared auth context, then immediately queries the project’s `author_profiles` row.
- `src/components/dashboard/builders/bp02/BP02Builder.tsx` then immediately queries `author_profiles`, `author_context`, and `author_nodes`.
- Those tables are protected by row-level permissions (`supabase/migrations/20260326200117_ea49e51a-5765-43af-9dec-68fd37c57fa7.sql`) that depend on the logged-in user ID.
- On refresh, that auth state can still be “not ready”, so the backend behaves as if you are not authenticated yet. The read returns no row or an RLS error, and BP-02 falls back to `setStep(0)`.

2. Several save paths do not actually confirm that the save succeeded.
- In `BP02Builder.tsx`, auto-save only logs write errors.
- Manual “Save Draft” does not check the returned `error` before showing “Draft saved!”.
- The Review → Publish step write also ignores write errors.
- So the UI can tell you it saved, even when the backend rejected the write.

Why it feels like “everything is gone”:
- Sometimes the content truly was never saved because the write failed silently.
- Other times it was saved, but refresh still starts over because the restore query ran before auth was ready and the builder treated that as “no saved content”.

Strongest evidence:
- `src/pages/NodeBuilder.tsx` does not wait for the auth-ready pattern before querying protected tables.
- `src/components/dashboard/builders/bp02/BP02Builder.tsx` sets step `0` whenever the node load misses.
- The row-level policies on `author_nodes` require the authenticated user to match the author profile.
- Your backend publish logs show the publish function did update the BP-02 node to `live`, which means the bigger post-refresh failure is the restore path, not the publish function itself.

So the real root cause is:
auth-session restoration race on refresh + silent save failures during draft/step persistence.</final-text>