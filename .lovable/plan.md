## What's actually happening

The Step 4 spinner is **not** stuck on a network call — it is a **stuck UI state with no request in flight**. There is no timeout, no failed API; the code has no idea it should be doing anything.

### Evidence (verified against the live DB)

The single BA-13 row for `Pauline Teo` / book "Be SUCKcessful" is in a half-published state:

| Field | Value |
|---|---|
| `status` | `content_ready` (not `live`) |
| `current_step` | `3` |
| `microsite_url` | NULL |
| `activated_at` | NULL |
| `content_json.activated` | `true` |
| `content_json._currentStep` | `3` |

Edge-function logs show **zero** recent `save-author-node` invocations for BA-13 — so during the user's "5+ minute wait" no publish call is being made. The spinner has nothing to wait for.

### Why the spinner shows but does nothing

In `BA13Builder.tsx` the resume logic on mount is:

```text
isActuallyLive = draft.isLive && !!draft.micrositeUrl   // false (no microsite_url)
step           = isActuallyLive ? 3 : max(draft.currentStep, 2)  // = 3
content.activated = isActuallyLive                       // = false
```

So the builder lands on `step=3` with `content.activated=false`, which renders this branch:

```text
{step === 3 && !content?.activated && <AbbyCard>...Publishing your group coaching programme...</AbbyCard>}
```

That JSX is a **passive animated message** — it does not call `handlePublish`, it does not poll, it just sits there forever. Other nodes don't hit this because their first publish either (a) actually completed (status went to `live`, microsite_url set) or (b) failed loudly leaving `current_step` ≤ 2.

### Why the row is half-published

A previous publish call wrote the merged `content_json` (with `activated:true`, `_currentStep:3`) but the row's `status`, `microsite_url`, and `activated_at` columns ended up not being in the live state. Most likely: a stale autosave race with the publish UPDATE, or a previous build of `save-author-node` that didn't write all four fields atomically. The current `save-author-node:publish` code does write them in one UPDATE, so new publishes should be fine — but the existing row is poisoned and the resume logic has no recovery path.

The live page `/pauline-teo/group-coaching` returns 404 simply because `microsite_url` is NULL on this row (and any public-page resolver gates on `status='live'`).

## The fix

Two small changes — one repairs existing poisoned rows, one prevents the dead-spinner state going forward.

### 1. Auto-recover on resume (`src/components/dashboard/builders/ba13/BA13Builder.tsx`)

In the mount effect, detect the broken state and either retry the publish automatically or fall back to Step 2 with a clear message — never sit at Step 3 with no request in flight.

```text
if (savedStep >= 3 && !isActuallyLive) {
  // Half-published / never finished. Drop back to Step 2 review so the user
  // can click "Publish to My Site" again. The publish call will overwrite the
  // poisoned columns (status='live', microsite_url, activated_at) atomically.
  setStep(2);
  toast.info("Your last publish didn't complete — please click Publish again.");
  return;
}
```

This is the minimal, safe fix. It also unblocks every other node if they ever land in the same half-state (we should apply the same guard to BA-10/12/14–18 — they share the same pattern).

### 2. Show a real spinner during publish, not a passive one

In `handlePublish`, set a local `isPublishing` flag and gate the Step-3 spinner on it (`isPublishing && !content.activated`) rather than on `step===3 && !content.activated`. Then setting `step=3` happens only **after** the publish resolves successfully. This guarantees the "Publishing…" text only ever appears while a real network request is in flight.

### 3. One-time DB repair for the existing poisoned row

After the code fix is in, run a single UPDATE to either (a) re-publish the row properly or (b) reset it to Step 2 so the user can re-publish from the UI. Option (b) is safer because it lets the normal flow set `microsite_url` from the slug and trigger the asset-pack hook:

```text
UPDATE author_nodes
SET current_step = 2,
    content_json = content_json - 'activated' - '_currentStep' || jsonb_build_object('_currentStep', 2)
WHERE id = '5c90e073-e8ce-41e1-a6fe-c5d7c0683c7f';
```

After that the user reopens BA-13 → lands on Step 2 → clicks Publish → row goes fully live → `/pauline-teo/group-coaching` resolves.

## Files to edit

- `src/components/dashboard/builders/ba13/BA13Builder.tsx` — add the half-state guard in the mount effect; add `isPublishing` state for an honest spinner.
- One-line SQL UPDATE (via a migration) to repair the existing row.

## Out of scope (for now)

- Replicating the guard across the other 9 BA/YR builders that share this pattern. Worth doing in a follow-up sprint, but BA-13 is the only one currently reported broken and the data shows no other rows in this half-state.
- Changing `save-author-node:publish` itself — its current code writes all four fields in one UPDATE, so it shouldn't re-poison rows going forward.

## Why this matches the symptoms

| Symptom | Explained by |
|---|---|
| Steps 1–3 succeed | Generation + autosave path is healthy |
| Step 4 spinner hangs 5+ min with no error | Passive JSX animation, no request in flight |
| Other BA-/YR- nodes publish fine | Their rows aren't in the half-state; they hit the "live" branch on resume |
| `/group-coaching` returns 404 | `microsite_url` is NULL on the only BA-13 row |
| No edge-function logs during the "publish" | The UI never makes the call on resume |