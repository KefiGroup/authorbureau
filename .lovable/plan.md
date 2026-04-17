
Hardcoding the org ID defeats the existing `BUFFER_ORG_ID` secret pattern and breaks multi-org support. The real fix is the GraphQL type — change `String!` to `OrganizationId!` and keep the variable. That matches Buffer's schema and keeps the secret-driven config.

## Plan

**File:** `supabase/functions/get-buffer-channels/index.ts` (only file)

**Change:** Single line in the GraphQL query string.

Replace:
```graphql
query GetChannels($organizationId: String!) {
  channels(input: { organizationId: $organizationId }) { ... }
}
```

With:
```graphql
query GetChannels($organizationId: OrganizationId!) {
  channels(input: { organizationId: $organizationId }) { ... }
}
```

Everything else stays:
- `BUFFER_ORG_ID` env var still drives the value
- `variables: { organizationId: BUFFER_ORG_ID }` unchanged
- Upsert logic, platform map, response shape unchanged

### Why not hardcode
- Loses secret-driven config (would require code edit per org)
- Breaks if `BUFFER_ORG_ID` is ever rotated
- The error is a type mismatch, not a variable-vs-literal issue — fixing the type resolves it cleanly

### Test
Connect Settings → paste key → Sync → expect "Done! I found 7 connected accounts" and 4 platform badges green.
