

# Store White-Label Domain and Update SSO Edge Function

## Changes

### 1. Store secret
- **`GHL_WHITELABEL_DOMAIN`** = `app.authorsbureau.com`

### 2. Update `supabase/functions/ghl-sso-link/index.ts`
- Before generating the SSO token, call `GET /locations/{locationId}` using the existing `GHL_AGENCY_KEY` to auto-retrieve `companyId`
- Remove dependency on `GHL_COMPANY_ID` env var
- Use the retrieved `companyId` in the `POST /oauth/locationToken` call
- Use `GHL_WHITELABEL_DOMAIN` (`app.authorsbureau.com`) for constructing SSO URLs

### 3. Deploy
- Deploy the updated `ghl-sso-link` edge function

