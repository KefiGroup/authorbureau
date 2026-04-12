
Goal

Make BP-02 publish non-silent and non-500: always return readable JSON, always show the author a clear outcome, and never show the live state for a pending/GHL-not-connected save.

Findings

- `supabase/functions/deploy-bp02-to-ghl/index.ts` already has a fallback branch, but its outer `catch` still returns HTTP 500.
- The fallback is reached too late; if anything fails before that branch, the client gets a 500 with no reliable user-facing result.
- `src/components/dashboard/builders/bp02/BP02Builder.tsx` only treats `success` as a generic pass/fail. It does not handle `status === "published_pending_ghl"`, so pending saves are not surfaced intentionally.
- The builder already imports `toast` from `sonner`, and the app already mounts `<Sonner />`, so a green success toast can be added locally without broader changes.
- There are currently no useful runtime logs for `deploy-bp02-to-ghl`, so checkpoint logging needs to be added first.

Plan

1. Harden the edge function
   - Add explicit startup logging plus numbered checkpoint logs after body parse, author fetch, node fetch, pending fallback entry, GHL provisioning, GHL deploy steps, node update, and final return.
   - Keep one top-level try/catch around the full handler, but change the catch response to HTTP 200 with a structured JSON body like `{ success: false, status: "error", message: "..." }`.
   - Move the missing-key fallback earlier in the flow: after loading the required author/node data, if `GHL_AGENCY_KEY` is absent, update `author_nodes` to `published_pending_ghl` and return immediately with `{ success: true, status: "published_pending_ghl", message: "Lead magnet saved. Connect GoHighLevel in Settings to activate your live opt-in page." }`.
   - Preserve the existing live-publish behavior when GHL is available, but return an explicit `status: "live"` so the frontend can distinguish it cleanly.

2. Fix BP-02 publish result handling
   - Update `BP02Builder.tsx` so `handlePublish` branches on `data.status`, not just `data.success`.
   - If the function returns `published_pending_ghl`, show `toast.success(data.message)`, do not send the user to the “Your Lead Magnet is Live!” success screen, and keep the UI in a non-live state.
   - If the function returns `live`, keep the current success flow: set the live URL, mark the content activated, and show the success screen.
   - If the function returns `{ success: false }` or invoke throws, show a visible destructive toast and keep the existing inline error state so the button never resets silently.

3. Validate after implementation
   - Publish BP-02 and confirm the request now returns HTTP 200 instead of 500.
   - Check the new edge-function logs to see the last completed checkpoint if any issue remains.
   - Verify one of these outcomes always appears to the author:
     - Live path: success screen with live URL
     - Pending path: green success toast with the “saved, connect GHL to go live” message
     - Error path: visible failure toast/message, never silence

Technical details

- Files to update:
  - `supabase/functions/deploy-bp02-to-ghl/index.ts`
  - `src/components/dashboard/builders/bp02/BP02Builder.tsx`
- No database migration is needed.
- No global toast wiring is needed because `sonner` is already mounted in `src/App.tsx`.
- I will avoid changing any unrelated BP flows, database policies, or subscription logic.
