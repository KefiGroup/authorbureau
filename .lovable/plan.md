

## Re-enter the Shared Backend Service Role Key

### What we'll do
Update the `SHARED_BACKEND_SERVICE_ROLE_KEY` secret with the correct value from your PublishNow.io backend.

### Steps
1. Use the secret management tool to prompt you to enter the new key value
2. Redeploy the `sync-author-profile` edge function so it picks up the updated secret
3. Test the function to confirm it can now query the shared backend successfully

### What you need ready
The **service_role** key from your PublishNow.io backend dashboard. It should look like a long string with two dots in it, similar to:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIs...
```

