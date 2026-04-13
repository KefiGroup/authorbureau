

# Embedding GHL Dashboard Inside Authors Bureau

## What exists today

- Sub-account provisioning is automatic via the `provision-ghl-subaccount` and `ghl-provision-author` edge functions using the Agency API key
- The `ghl_sub_account_id` (GHL location ID) is stored on `author_profiles`
- Deploy functions create funnels, workflows, tags, and custom fields in the sub-account
- The Marketing Hub shows campaign status but has no way for authors to access GHL's native UI (workflow designer, email editor, contacts, analytics)
- Authors cannot see if emails were actually sent, to whom, or design their own automations

## What GHL provides for white-label embedding

GHL's Agency/SaaS model supports **SSO links** that generate a temporary login URL for a sub-account user. The Agency API endpoint `GET /locations/{locationId}/sso` (or `POST /oauth/locationToken`) returns a one-time SSO URL that logs the author directly into their sub-account dashboard. This dashboard can be:
- Loaded in an **iframe** within Authors Bureau
- Styled with your agency's white-label branding (custom domain, logo, colors — configured in your GHL Agency settings)
- Scoped to specific tabs (Contacts, Automation, Funnels, etc.) via URL path

## Implementation plan

### 1. Create a GHL SSO edge function

**New file:** `supabase/functions/ghl-sso-link/index.ts`

- Accepts `{ author_id }` from the frontend
- Looks up `ghl_sub_account_id` from `author_profiles`
- Calls the GHL Agency API to generate an SSO/access token for that location
- Returns the SSO URL (e.g., `https://app.leadconnectorhq.com/location/{locationId}?token=...`)
- If your agency has a custom white-label domain configured (e.g., `app.authorsbureau.com`), the URL will use that domain instead

### 2. Create a Marketing Studio page

**New file:** `src/components/dashboard/MarketingStudio.tsx`

- Full-width iframe component that loads the GHL SSO URL
- Includes a loading spinner while the SSO URL is being fetched
- Tabs at the top for quick navigation to specific GHL sections:
  - **Dashboard** — overview metrics
  - **Contacts** — see all captured leads
  - **Automations** — design workflows
  - **Funnels** — edit opt-in pages
  - **Email** — view sent emails and stats
  - **Calendar** — webinar and coaching bookings
- Each tab appends the relevant GHL path to the SSO base URL
- Fallback message if the marketing account is not yet connected

### 3. Add "Open Studio" entry points

**Update:** `src/components/dashboard/MarketingHub.tsx`
- Add a prominent "Open Marketing Studio" button at the top of the hub
- For active campaigns, add a "View in Studio" link that opens the relevant GHL section

**Update:** `src/pages/AuthorDashboard.tsx`
- Add `marketing-studio` as a new dashboard section
- Wire sidebar link under "Revenue & Tools"

**Update:** `src/components/settings/ConnectedAccountsTab.tsx`
- Add "Open Marketing Studio" button when connected

### 4. Scope author permissions

**Update:** `supabase/functions/ghl-sso-link/index.ts`
- When generating the SSO link, request a scoped token so authors can only access their own sub-account
- Optionally restrict to specific GHL modules (contacts, automations, funnels) to prevent confusion

### 5. White-label GHL Agency settings (manual, not code)

This is a one-time configuration in your GHL Agency dashboard:
- Set custom domain (e.g., `marketing.authorsbureau.com`)
- Upload Authors Bureau logo and set brand colors
- Remove GHL branding from the sub-account UI
- Configure default templates/snapshots that get applied to new sub-accounts

These are done in the GHL Agency Settings panel, not in code.

## Technical details

### GHL SSO API call (inside edge function)

```text
POST https://services.leadconnectorhq.com/oauth/locationToken
Headers:
  Authorization: Bearer {GHL_AGENCY_KEY}
  Content-Type: application/json
  Version: 2021-07-28
Body:
  { "companyId": "{agencyId}", "locationId": "{subAccountId}" }
Response:
  { "token": "...", "url": "https://{whitelabel-domain}/location/{id}?token=..." }
```

### Iframe embedding

```text
<iframe
  src="{sso_url}"
  className="w-full h-[calc(100vh-120px)] border-0 rounded-xl"
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
/>
```

### SSO token refresh

SSO tokens are short-lived (typically 1 hour). The iframe component will detect session expiry and automatically request a new SSO link when the author returns to the Studio tab.

## Files to create/update

| File | Action |
|------|--------|
| `supabase/functions/ghl-sso-link/index.ts` | Create — SSO link generator |
| `src/components/dashboard/MarketingStudio.tsx` | Create — iframe embed component with section tabs |
| `src/components/dashboard/MarketingHub.tsx` | Update — add "Open Studio" button |
| `src/pages/AuthorDashboard.tsx` | Update — add `marketing-studio` section |
| `src/components/settings/ConnectedAccountsTab.tsx` | Update — add Studio link when connected |

## Prerequisites before implementation

1. Verify your GHL Agency plan supports SSO/location tokens (Pro or above)
2. Configure white-label domain in GHL Agency settings (`marketing.authorsbureau.com` or similar)
3. Upload Authors Bureau branding in the GHL Agency dashboard
4. Confirm the `GHL_AGENCY_KEY` has the `oauth.readonly` and `locations.readonly` scopes

## What authors will experience

1. Author clicks "Activate" in Marketing Hub — sub-account is auto-provisioned (already works)
2. Author clicks "Open Marketing Studio" — Authors Bureau fetches an SSO link and loads GHL in an iframe
3. Author sees a branded dashboard (Authors Bureau logo, colors) with their contacts, automations, funnels, and email stats
4. Author can design workflows, edit funnels, and view email delivery — all without leaving Authors Bureau
5. No GHL branding visible anywhere

