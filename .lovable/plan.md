

## Diagnosis (confirmed against DB and logs)

```
node_id  status         microsite_url  activated_at
BA-15    content_ready  NULL           NULL
BA-16    content_ready  NULL           NULL
BA-17    content_ready  NULL           NULL
BA-18    content_ready  NULL           NULL
```

Zero `publish` action invocations in `save-author-node` logs.

What this means:
1. The new `publish` action has **never been called** for any of these nodes. The DB rows are still in `content_ready` from when the AI generated them.
2. `get-microsite-page` correctly returns `"Node not live"` → MicrositePage shows "Coming Soon."
3. The PressKitPage / JVPartnersPage renderers in `MicrositePage.tsx` are correctly wired to `resolvedNodeId === "BA-15"` and `"BA-18"` — but they never render because the API call fails first with "Node not live."
4. The publish button in each builder appears to work because the success screen renders unconditionally on `step===3` showing a `getMicrositeUrl(...)` link — but the link 404s the DB row stays at `content_ready`.

So the `node_id` IS correct (`BA-15`, `BA-18`). The slug-to-node map IS correct. The renderers ARE correct. The single point of failure is: **the publish click is either not happening, silently failing client-side before reaching the function, or the user assumes the success screen = live.**

## Plan — three fixes

### Fix 1 — Make the publish button do what the success screen claims

`PublishSuccessScreen` shows `Activated: true` based on `content.activated` being set in React state. That state is set BEFORE the edge call resolves and is not rolled back when the call throws (it's set INSIDE the try, but only AFTER `publishNodeToSite` resolves — so on success only — that part is fine). The real gap: in BA-12/13/14/15/16/17/18, `handlePublish` sets `setStep(3)` BEFORE the publish call. If the call throws, it sets `setStep(2)` back — but only after a 25s timeout window. During that window the user sees an "Activating..." spinner and may navigate away assuming success.

Change all seven BA builders to:
- Call `publishNodeToSite()` FIRST (await).
- Only on success call `setStep(3)` and `setContent({...prev, activated:true})`.
- On failure surface the error inline as a toast + keep step at 2.

### Fix 2 — Self-heal existing `content_ready` rows so the user doesn't have to re-click

Update `get-microsite-page` so that, when it finds a row with `status='content_ready'` AND `content_json.activated === true`, it treats the node as live (returns the data instead of 404). This recovers any future case where the React state was set but the DB write failed. For Pauline's existing four rows, this won't help yet (their `content_json.activated` is also missing — the publish call literally never ran).

To recover Pauline's existing rows specifically, add a one-shot button on the builder Review screen visible when `status='content_ready'` AND `step===2`: **"Re-publish to my site"** that calls `publishNodeToSite` and shows the result inline. After this fix, Pauline clicks the button once on each of BA-15/16/17/18 and they go live.

### Fix 3 — Verify the new `publish` action actually works end-to-end

Add a single verification log line in `save-author-node` `publish` handler that prints the resolved `micrositeUrl` and the row id BEFORE the update — so when Pauline re-clicks publish we can confirm in `edge_function_logs` that the request reached the function and the update succeeded. Currently logs only print AFTER success.

## Files touched

**Frontend**
- **Update** `src/components/dashboard/builders/ba12/BA12Builder.tsx`, `ba13`, `ba14`, `ba15`, `ba16`, `ba17`, `ba18` — flip the `handlePublish` order: await publish before flipping to step 3; surface inline error toast on failure; add a "Re-publish to my site" Button on Review (step 2) when content exists but `microsite_url` is empty.

**Backend**
- **Update** `supabase/functions/get-microsite-page/index.ts` — accept `status='content_ready'` rows when `content_json.activated === true` as "live" for rendering (forward-compat self-heal).
- **Update** `supabase/functions/save-author-node/index.ts` — add a pre-update log line in the `publish` action printing `nodeId`, `authorId`, resolved `micrositeUrl`, and the matched `node.id`.

## Verification

1. As Pauline, open BA-15 → land on Review (step 2) → click the new **Re-publish to my site** button → DB row flips to `status='live'`, `microsite_url='https://authorsbureau.com/pauline-teo/press'`, `activated_at` set.
2. Visit `/pauline-teo/press` → PressKitPage renders.
3. Repeat for BA-16 (`/affiliates`), BA-17 (`/bundles`), BA-18 (`/partners`).
4. Generate a fresh BA node and click Publish → button blocks until edge call resolves; success screen only shows on confirmed live status.

## Scope

- No DB migration. No RLS changes. No new secrets. No new node IDs.
- Per Master Architecture Constraints: backend changes go through edge functions with service role, frontend uses `getActiveToken` + `fetchWithTimeout`. Both already in place.

