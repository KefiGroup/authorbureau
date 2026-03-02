

## Root Cause

The `sso-handoff` function validates the caller's identity by inspecting the `Authorization` header as a user JWT. Our proxy sends `Authorization: Bearer ${serviceRoleKey}` — a raw key, not a JWT — so the function's internal auth check rejects it as "Unauthorized".

The `apikey` header satisfies the **gateway**. The `Authorization` header must carry the **user's access token** to satisfy the **function**.

## Fix: `supabase/functions/sso-proxy/index.ts`

Pass the user's access token (already available in `session_data.access_token`) as the `Authorization` header instead of the service role key:

```typescript
Authorization: `Bearer ${session_data.access_token}`,
```

The `apikey` header (anon key) stays — it's needed for the gateway. The service role key check can be removed since it's no longer used in the request (or kept as a config gate if desired).

This is a one-line change. No other files need modification.

