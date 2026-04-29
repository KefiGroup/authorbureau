## Diagnosis

The red **"Unauthorized"** is **NOT** an ElevenLabs 401. ElevenLabs is never called.

The error is thrown by our own `resolveUser()` inside `supabase/functions/elevenlabs-tts-audiobook/index.ts` (line 50), confirmed in edge logs:

```
ERROR elevenlabs-tts-audiobook error: Error: Unauthorized
    at resolveUser (.../elevenlabs-tts-audiobook/index.ts:86:9)
```

`ELEVENLABS_API_KEY` is present in secrets (Connector-managed) and works fine for other functions — credits/key are not the issue.

### Two real root causes

**1. Wrong token source in the client (violates project Core rule).**
`AudiobookStudio.handleGenerateSingle` does:
```ts
const session = (await supabase.auth.getSession()).data.session;
const authToken = session?.access_token || "";
```
For `support@paulineteo.com`, the user only exists in the **shared backend** (confirmed: no row in local `auth.users`). The local `supabase.auth.getSession()` returns nothing, so an empty/invalid bearer is sent → `resolveUser` fails all three branches → throws "Unauthorized".

The Sprint 8 manuscript fix already standardised on `getActiveToken()` (in fact lines 78–84 of the same file use it for manuscript loading). The chapter-generate path was missed.

**2. Ownership check uses `author_id` only, no email fallback.**
The edge function does:
```ts
if (!book || book.author_id !== user.id) return 404
```
DB shows `books.author_id = ef23c521…` (a shared-backend uid) and `owner_email = support@paulineteo.com`. Even after we fix the token, if `resolveUser` returns the *local* uid, the strict `author_id` compare will 404. The proven pattern in `get-book-manuscript` is `ownsByEmail` (compare `book.owner_email` to `user.email`).

## Fix

### A. `src/components/dashboard/AudiobookStudio.tsx`
- In `handleGenerateSingle` (and any other call site that still uses `supabase.auth.getSession()`), replace with the standard `getActiveToken()` retry pattern already used at lines 78–84:
  ```ts
  const { getActiveToken } = await import("@/lib/get-active-token");
  let token = await getActiveToken();
  if (!token) { await new Promise(r => setTimeout(r, 800)); token = await getActiveToken(); }
  if (!token) throw new Error("Not signed in");
  ```
- Pass that token into `generateChapter`. Also use it for the "Generate All" loop if applicable.

### B. `supabase/functions/elevenlabs-tts-audiobook/index.ts`
- Replace the strict `book.author_id !== user.id` check in the `generate-chunk` and `finalize-chapter` branches with the dual ownership pattern used by `get-book-manuscript`:
  ```ts
  const owns =
    book.author_id === user.id ||
    (book.owner_email &&
     book.owner_email.toLowerCase() === user.email.toLowerCase());
  if (!owns) return 404;
  ```
- Improve the top-level catch so the client gets a structured response distinguishing `no_token` / `forbidden` / `elevenlabs_error` instead of a bare "Unauthorized" — easier diagnostics next time.
- Add a one-line `console.log` of `{ user.email, book.id, action }` so future failures are traceable.

### C. Quick verification
- Reload Audiobook Studio for "Be SUCKcessful" while logged in as support@paulineteo.com.
- Click Generate on Chapter 1 — expect chunks to upload to `audiobook-audio` bucket and the chapter to flip to ✅ done.
- Tail `elevenlabs-tts-audiobook` logs to confirm no more `Unauthorized` and that ElevenLabs returns 200.

### Out of scope
- No changes to `ELEVENLABS_API_KEY` (it's valid). No Stripe/credit changes. No UI redesign.
