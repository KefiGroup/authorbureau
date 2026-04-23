

# Plan — Diagnose Why "Design My Programme" Doesn't Respond on BP-06 → BP-09

## What I verified is NOT the bug

I read all four builders and their edge functions. The previous fix is in place:

- BP-06/07/08/09 all use `fetchWithTimeout(..., 180_000)` with `getActiveToken()` (no SDK 60s timeout).
- The button: `<Button onClick={handleGenerate} disabled={isBookLoading}>` — wired correctly, only disabled while the book check is loading.
- The four edge functions all have `max_completion_tokens: 8000` and no `temperature` override.
- Error handling sets the destructive panel + raises a `toast.error`.

So the previous round of fixes did land. The screenshot shows the Introduction step rendered with the button visible and not in a spinner state, meaning either (a) the click isn't producing any visible state change at all, or (b) it does run, fails fast, and resets — but you don't see the toast.

## What I cannot confirm from this side

- Your screenshot is from `authorsbureau.com` in **Safari**, not the Lovable preview. Browser console logs and network requests from that production tab are not visible to me.
- The session-replay shows you on the preview's home page (`/`), not the BP-07 builder route — so I can't see a real click event for the failing case.
- Edge-function logs for `generate-bp06/07/08/09` show **zero invocations** in the recent window. That is the smoking gun: **the click is firing but the request never leaves the browser** (or it's firing but never reaching `fetchWithTimeout`). That rules out a server-side bug and points squarely at the client.

## Most likely root causes (to fix in this sprint)

1. **Production hasn't been republished since the prior client-side patch.** `authorsbureau.com` may still be running the older bundle that used `supabase.functions.invoke`, where a slow first-load token resolution can throw before the request goes out — and the toast gets swallowed because `sonner`'s `<Toaster>` may not be mounted on every route.
2. **`getActiveToken()` returning null on Safari/production.** Safari's stricter cookie/storage model can leave the cloud session unreadable on a hard refresh; the function then throws "Your session has expired", `setStep(0)` runs immediately, and the user perceives "nothing happened" because the toast slides in and out in 4 s.
3. **No instrumentation today.** When `handleGenerate` fails before the network call, we have no console breadcrumb to confirm what happened — so every failure looks identical.

## Fix — three small, surgical changes

### 1. Add a diagnostic breadcrumb to all four builders (BP-06/07/08/09)

At the top of each `handleGenerate`, before any await, add:

```ts
console.info("[BP-0X] generate clicked", { authorId, hasBook, bookTitle: detectedBookTitle });
```

After the `getActiveToken()` line, log whether a token came back. After `fetchWithTimeout`, log the HTTP status. This way, the next click on the live site immediately tells us whether it's a token problem, a network problem, or an AI-gateway problem — without guessing.

### 2. Make the failure path impossible to miss

Today, on failure we set an inline error panel and a `toast.error(...)` — but the toast auto-dismisses in 4 s and on production the `<Toaster>` may unmount during route transitions. Change the catch block in all four builders to:

```ts
} catch (e: any) {
  const msg = toAbbyError(e?.message || "Generation failed");
  console.error("[BP-0X] generate failed", e);
  setError(msg);
  setStep(0);
  toast.error(msg, { duration: 12000, important: true });
}
```

12-second sticky toast + console.error means the user sees the failure for long enough to read it, and we can debug from any future screenshot.

### 3. Harden the token check

Replace the silent `getActiveToken() → throw "session expired"` path with an explicit re-fetch attempt:

```ts
let token = await getActiveToken();
if (!token) {
  // Try one refresh before giving up — Safari often needs this
  await supabase.auth.refreshSession().catch(() => null);
  token = await getActiveToken();
}
if (!token) throw new Error("We couldn't verify your sign-in. Please refresh the page and try again.");
```

This eliminates the most common Safari failure mode (stale cloud session on hard reload) without touching the rest of the flow.

## Files touched (4 client files, no schema, no edge function changes)

- `src/components/dashboard/builders/bp06/BP06Builder.tsx`
- `src/components/dashboard/builders/bp07/BP07Builder.tsx`
- `src/components/dashboard/builders/bp08/BP08Builder.tsx`
- `src/components/dashboard/builders/bp09/BP09Builder.tsx`

Each file: 3 small edits to `handleGenerate` (breadcrumb log, hardened token check, sticky toast in catch). No prompt changes, no DB changes, no edge function changes.

## Out of scope

- Edge function rewrites — they're already correct.
- BP-01 → BP-05 — confirmed working in your last test.
- MiroFish integration — paused until this is confirmed fixed.

## Verification

1. Republish so production runs the new bundle.
2. Open BP-07 on `authorsbureau.com` → click **Design My Programme**.
3. **If it works**: lands on the spinner step within 1 s, then on Review in 30–90 s.
4. **If it still fails**: the 12-second red toast tells you exactly which stage failed (no token / 401 / 500 / timeout), and the Safari console will show the breadcrumb chain — share that with me and I'll pinpoint the next fix in one round instead of guessing.
5. Repeat on BP-06, BP-08, BP-09.

