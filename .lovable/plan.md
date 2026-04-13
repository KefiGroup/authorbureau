

# Seamless Marketing Nodes Plan (BP-01 to BP-05)

## Current Problems

1. **BP-02 public page is broken**: After publishing without GHL, status is set to `published_pending_ghl`, but `get-microsite-page` only serves nodes with `status === "live"`. The quiz page shows "Coming Soon" instead of the live quiz.

2. **BP-01 (Email) and BP-03 (Social Media) use `publishNodeToSite` client-side** which hits RLS errors (same issue BP-02 had before we fixed it). They need the same server-side pattern.

3. **BP-04 (Website) and BP-05 (Webinar) also use `publishNodeToSite` client-side** — same RLS issue.

4. **No consistent fallback pattern**: BP-02 has a graceful GHL fallback, but BP-01/03/04/05 either fail silently or hard-fail.

5. **Microsite pages missing for BP-01 and BP-03**: These are outbound-only nodes but BP-01 has no publish flow that works, and BP-03's deploy function swallows errors.

6. **Lead capture flow is disconnected**: The `microsite-action` edge function saves to `author_subscribers` and optionally pushes to GHL, but only BP-02 actually has a public form page. BP-05 (Webinar) has a registration page but uses the same generic submit handler.

## The Fix — 3 Workstreams

### Workstream 1: Fix the public page serving (critical)

**File: `supabase/functions/get-microsite-page/index.ts`**
- Change line 60 from `node.status !== "live"` to accept both `"live"` and `"published_pending_ghl"` statuses
- This immediately fixes BP-02 quiz pages for all authors

### Workstream 2: Move all 5 node publishes to server-side (bypass RLS)

Each builder currently calls `publishNodeToSite()` which does a client-side Supabase `update` — this fails because the user's auth token doesn't match the `author_profiles.id` used in the query. The fix is the same pattern we used for BP-02: call the deploy edge function which uses the service role key.

**BP-01 (Email Marketing) — `deploy-bp01-to-ghl/index.ts`**
- Add `content_payload` support (same as BP-02)
- Add `published_pending_ghl` fallback when no GHL key
- Return `{ status, liveUrl }` so the UI can show the correct state

**BP-01 Builder — `bp01/BP01Builder.tsx`**
- Replace `publishNodeToSite()` call with `fetch` to `deploy-bp01-to-ghl`
- Pass content as `content_payload`

**BP-03 (Social Media) — `deploy-bp03-to-ghl/index.ts`**  
- Add `content_payload` upsert before GHL deployment
- Add `published_pending_ghl` fallback
- Stop swallowing errors silently

**BP-03 Builder — `bp03/BP03Builder.tsx`**
- Same pattern: replace `publishNodeToSite()` with edge function call

**BP-04 (Website) — `deploy-bp04-to-ghl/index.ts`**
- Add `content_payload` upsert
- Add `published_pending_ghl` fallback
- Return microsite URL

**BP-04 Builder — `bp04/BP04Builder.tsx`**
- Replace `publishNodeToSite()` with edge function call

**BP-05 (Webinar) — `deploy-bp05-to-ghl/index.ts`**
- Add `content_payload` upsert
- Add `published_pending_ghl` fallback
- Return microsite URL

**BP-05 Builder — `bp05/BP05Builder.tsx`**
- Replace `publishNodeToSite()` with edge function call

### Workstream 3: Improve publish UX across all 5 builders

All 5 builders currently have their own publish step rendering. Standardise them to use `SharedPublishStep` (which BP-02 already uses) so the user gets:
- A clear checklist of what's ready
- The correct button label (Publish / Retry / Update)
- Post-publish status card with live URL, copy link, and next steps
- Contextual guidance ("Connect your marketing account" or "Go to Marketing Hub")

**BP-01 and BP-03 special handling**: These are outbound-only nodes (no public microsite page). Their success screen should suppress the URL card and show campaign metrics instead (email sequence count, scheduled posts count).

### Summary of files to edit

| File | Change |
|------|--------|
| `get-microsite-page/index.ts` | Accept `published_pending_ghl` status |
| `deploy-bp01-to-ghl/index.ts` | Add content_payload, fallback pattern |
| `deploy-bp03-to-ghl/index.ts` | Add content_payload, fallback pattern |
| `deploy-bp04-to-ghl/index.ts` | Add content_payload, fallback pattern |
| `deploy-bp05-to-ghl/index.ts` | Add content_payload, fallback pattern |
| `bp01/BP01Builder.tsx` | Use edge function instead of publishNodeToSite |
| `bp03/BP03Builder.tsx` | Use edge function instead of publishNodeToSite |
| `bp04/BP04Builder.tsx` | Use edge function instead of publishNodeToSite |
| `bp05/BP05Builder.tsx` | Use edge function instead of publishNodeToSite |

### End-to-end flow after fix

```text
Author clicks "Publish" in any builder
        ↓
Client POSTs to deploy-BPXX-to-ghl with content_payload
        ↓
Edge function (service role) upserts content to author_nodes
        ↓
Checks for GHL_AGENCY_KEY + sub_account_id
        ↓
  ┌─ YES: Deploy to GHL → status = "live"
  └─ NO:  status = "published_pending_ghl"
        ↓
Returns { status, liveUrl } to client
        ↓
UI shows success card:
  - If live: shareable URL + "Go to Marketing Hub"
  - If pending: "Connect your marketing account" + retry button
        ↓
Public visitor hits /:authorSlug/:nodeSlug
        ↓
get-microsite-page serves both "live" and "published_pending_ghl"
        ↓
Lead submits form → microsite-action → author_subscribers + GHL (if connected)
```

