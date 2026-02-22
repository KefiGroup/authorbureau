

## Fix: Extract session tokens from `session_data` object

### Problem
The shared backend verify endpoint returns these keys: `success`, `email`, `authUrl`, `session_data`. The current code checks `data?.session_data?.access_token` but the tokens are nested deeper inside `session_data` (likely under `session_data.session.access_token` or similar).

### Solution
Update `src/pages/Auth.tsx` to:

1. Add deeper extraction from the `session_data` object, checking paths like:
   - `session_data.session.access_token`
   - `session_data.access_token`
   - `session_data.token_hash`
2. Also check for `token_hash` inside `session_data`
3. Add a temporary console log of `JSON.stringify(data.session_data)` so if it still fails, we can see the exact structure

### Technical Details

**File: `src/pages/Auth.tsx`** (lines ~157-186)

Update the token extraction to include `session_data` sub-paths:

```typescript
// Deep-search for token_hash — now also inside session_data
const tokenHash = data?.token_hash || data?.data?.token_hash || data?.session?.token_hash 
  || data?.result?.token_hash || data?.session_data?.token_hash 
  || data?.session_data?.session?.token_hash;

// Deep-search for session tokens — now also inside session_data.session
const accessToken = data?.access_token || data?.session?.access_token 
  || data?.session_data?.access_token || data?.session_data?.session?.access_token
  || data?.data?.access_token || data?.data?.session?.access_token 
  || data?.result?.access_token;

const refreshToken = data?.refresh_token || data?.session?.refresh_token 
  || data?.session_data?.refresh_token || data?.session_data?.session?.refresh_token
  || data?.data?.refresh_token || data?.data?.session?.refresh_token 
  || data?.result?.refresh_token;
```

Additionally, log the full `session_data` structure before extraction so that if it still fails, we'll see exactly what's inside:

```typescript
if (data?.session_data) {
  console.log("[Auth] session_data contents:", JSON.stringify(data.session_data));
}
```

Update the fallback error to show `session_data` keys too:

```typescript
const sdKeys = data?.session_data ? Object.keys(data.session_data).join(", ") : "N/A";
throw new Error(`No session found. Top keys: ${Object.keys(data).join(", ")}. session_data keys: ${sdKeys}`);
```

This will either resolve the issue immediately (if tokens are nested under `session_data.session`) or give us the exact structure to fix it definitively.

