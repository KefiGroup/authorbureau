## Problem

In Audiobook Studio (BA-11), the **Narrator Voice dropdown is empty** (per screenshot). Note: the request says "BP-11" but the failing screen is **BA-11 Audiobook Studio** rendered by the legacy `src/components/dashboard/AudiobookStudio.tsx` (not the newer `BA11Builder.tsx`).

### Root cause

`AudiobookStudio.tsx` loads the voice list with:

```ts
supabase.functions.invoke("elevenlabs-tts-audiobook", { body: { action: "list-voices" } })
```

This violates the project's **Auth Standardization** memory rule: shared-backend sessions must call edge functions via `getActiveToken()` + `fetchWithTimeout()`, never `supabase.functions.invoke` / `supabase.auth.getSession()`. On a fresh load the project-local Supabase client has no session, so no `Authorization` header is sent. The edge function's `resolveUser()` then throws → returns `401 Unauthorized` → `voices` stays `[]` → empty dropdown.

A second smaller issue: `list-voices` returns purely static data (a hard-coded `VOICES` map) but is gated behind auth. It should be openable without a token so the picker always renders even before session restoration.

## Fix (2 small, surgical changes)

### 1. `src/components/dashboard/AudiobookStudio.tsx` — switch voice load to shared-backend pattern

Replace the `loadVoices` effect (lines ~56-70) so it uses the same pattern already used elsewhere in this file for `loadManuscript`:

```ts
useEffect(() => {
  (async () => {
    try {
      const { getActiveToken, fetchWithTimeout } = await import("@/lib/get-active-token");
      let token = await getActiveToken();
      for (let i = 0; i < 8 && !token; i++) {
        await new Promise(r => setTimeout(r, 300));
        token = await getActiveToken();
      }
      const res = await fetchWithTimeout(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts-audiobook`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ action: "list-voices" }),
        },
      );
      const data = await res.json();
      setVoices(data?.voices || []);
    } catch (e) {
      console.error("[AudiobookStudio] Failed to load voices:", e);
    }
  })();
}, []);
```

Also apply the same `getActiveToken` + `fetchWithTimeout` pattern to the second `supabase.functions.invoke("elevenlabs-tts-audiobook", ...)` call at line 297 (used for chapter generation) — same root cause will hit there next.

### 2. `supabase/functions/elevenlabs-tts-audiobook/index.ts` — make `list-voices` public

Move the `if (action === "list-voices")` branch **before** the auth check (the `resolveUser` block, lines 77-91). The voice list is fully static and contains no PII; no reason to require a token. This guarantees the dropdown populates even if shared-backend token restoration is still in flight.

Sketch:

```ts
const body = await req.json();
const { action } = body;

// Public: static list, no auth needed
if (action === "list-voices") {
  const voices = Object.entries(VOICES).map(([key, v]) => ({ key, name: v.name, voiceId: v.id }));
  return new Response(JSON.stringify({ voices }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Everything else requires auth
const authHeader = req.headers.get("Authorization");
// ...existing resolveUser logic...
```

`verify_jwt = false` is already set for this function in `supabase/config.toml`, so this just works.

## Why this matches the memory rules

- **Auth Standardization** (Core): "Always use `getActiveToken()` and `fetchWithTimeout()` for shared backend, NOT `supabase.auth.getSession()`." — exactly what we're switching to.
- **Edge Function Protection**: `verify_jwt = false` already set; we keep auth enforcement in code for everything except the static voice list.

## Files changed

- `src/components/dashboard/AudiobookStudio.tsx` (2 edits: voice load + chapter generation invoke)
- `supabase/functions/elevenlabs-tts-audiobook/index.ts` (move `list-voices` above auth gate)

## Out of scope

- The newer `BA11Builder` flow already uses the dedicated `ba11-voice-preview` / `ba11-audiobook-generate` functions with in-code JWT decode and a static `AUDIOBOOK_VOICES` constant — it's unaffected and stays as-is.
- No DB migrations, no new functions, no UI redesign.
