

## Root Cause: Missing `apikey` Header

The edge function logs confirm the issue:
```
SSO handoff failed: { error: "Unauthorized" }
```

The `sso-proxy` edge function calls the shared backend's `sso-handoff` via raw `fetch()`, but **Supabase's API gateway requires an `apikey` header** on all REST API calls to edge functions — even server-to-server ones. The `Authorization: Bearer ${serviceRoleKey}` header alone is not enough; the gateway uses `apikey` for routing/authentication at the gateway level before the function even runs.

This is why other calls work fine — they use the Supabase JS client (`createClient(url, key)`) which automatically sends `apikey`. The SSO proxy uses raw `fetch()` and is missing it.

**This is entirely an Authors Bureau fix. No coordination with PublishNow needed.**

## Fix

### `supabase/functions/sso-proxy/index.ts`

Add the shared backend's anon key as the `apikey` header on the server-to-server fetch call:

```typescript
const handoffRes = await fetch(`${SHARED_BACKEND_URL}/functions/v1/sso-handoff`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s",
  },
  body: JSON.stringify({ ... }),
});
```

One line added. That's it — the proxy architecture is correct, it was just missing the gateway authentication header.

