

## Diagnosis

The edge function logs reveal the exact error:

```
GoTrue lookup failed: 401 {"message":"Invalid API key","hint":"Double check your Supabase `anon` or `service_role` API key."}
```

The `SHARED_BACKEND_SERVICE_ROLE_KEY` secret stored in Lovable Cloud is being rejected by the shared backend's GoTrue admin API. This means the `lookupUserByEmail` helper we just deployed is correctly reaching the shared backend, but the API key it sends is invalid (possibly expired, rotated, or incorrectly stored).

## Fix

1. **Verify/update the `SHARED_BACKEND_SERVICE_ROLE_KEY` secret** with the current service role key from the shared backend project (`wuftdpnekscrsghqtssd`). This is the only change needed — the code logic is correct.

2. **Re-test the book push** from PublishNow after the secret is updated.

No code changes are required. This is a secret configuration issue.

