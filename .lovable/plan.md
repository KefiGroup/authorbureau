

# Plan — Gate "Publish/Go Live" on Stripe Connect for paid products

## Findings (Pauline Teo, pl@paulineteo.com)

Queried `author_profiles` directly:

| Field | Value |
|---|---|
| `pen_name` | Pauline Teo |
| `author_slug` | pauline-teo |
| `stripe_connected_account_id` | **null** |
| `stripe_onboarding_complete` | **false** |

**Pauline has NOT set up Stripe.** Yet she has 25 nodes already published as `live`, including BP-06 (the $2.99 workbook). That confirms the bug: today the platform lets authors publish paid products without a payment gateway, so readers hit the "Payments coming soon" modal at Buy Now (the screenshot).

## Why this is happening

Per `mem://architecture/commerce-engine-v1`: today the platform deliberately lets authors publish freely and only gates Stripe at the reader's Buy Now click via `BuyNowButton`. The user is now overriding that rule for paid products: **if a node has a price > 0, the author must connect Stripe before it can go live.**

Free products (lead magnets, free workbook, free chapters, free webinars) keep publishing freely — only the **monetised** path requires Stripe.

## What we'll build

### 1. Server-side gate (the source of truth)

Update `supabase/functions/save-author-node/index.ts` → `action: "publish"` branch:

- After loading the node row, also load `author_profiles.stripe_onboarding_complete` for the same `authorId`.
- Compute `isPaid` from `content_json`:
  - `Number(content_json.suggested_price_usd ?? content_json.price_usd ?? 0) > 0`
  - OR `content_json.pricing_recommendation === "paid"`
  - OR any `sales_tiers[*].price_usd > 0` (covers BA-13, YR-22, YR-25, etc.)
- If `isPaid && !stripe_onboarding_complete`, return `409` with:
  ```json
  { "error": "stripe_required", "message": "Connect Stripe before publishing paid products.", "stripe_required": true }
  ```
- Free products publish unchanged.

This means even if a stale UI bypasses the front-end check, the database can never flip to `live` for a paid product without Stripe.

### 2. Front-end gate (good UX)

`src/lib/publish-node.ts`:
- Detect the new `409 stripe_required` shape and throw a typed `StripeRequiredError`.

`src/components/dashboard/builders/bp06/BP06Builder.tsx` and `SharedPublishStep.tsx`:
- Pre-flight check before calling `publishNodeToSite` for paid nodes — read `useStripeConnect().onboarding_complete`. If false and the node is paid, **do not call publish**; instead show a blocking modal:
  > **Connect Stripe to publish your paid workbook**
  > Your $2.99 workbook needs a connected payment account so readers can actually buy it. Free products can publish anytime.
  > [ Connect Stripe → ] [ Make this free instead ] [ Cancel ]
- "Connect Stripe →" calls `startOnboarding()` (existing flow).
- "Make this free instead" sets `suggested_price_usd = 0`, `pricing_recommendation = "free"`, saves, then continues publishing.
- If publish was already attempted and the server returned `stripe_required`, surface the same modal.

### 3. Builder publish-checklist row

In every paid builder's checklist (`SharedPublishStep`), add a checklist item: **"Stripe payments connected"**. It only renders when `isPaid`. Reads `onboarding_complete` from `useStripeConnect`. Disables the Publish button while unchecked.

For BP-06 specifically (which doesn't use `SharedPublishStep`), inject the same row inline in `BP06Builder` step 2 (Review).

### 4. Status sweep for already-live paid products

One-time migration to bring existing data in line with the new rule:

```sql
UPDATE author_nodes
SET status = 'content_ready', activated_at = NULL, microsite_url = NULL
WHERE status = 'live'
  AND author_id IN (
    SELECT id FROM author_profiles
    WHERE stripe_onboarding_complete IS NOT TRUE
  )
  AND (
    (content_json->>'suggested_price_usd')::numeric > 0
    OR content_json->>'pricing_recommendation' = 'paid'
  );
```

For Pauline this affects **BP-06 ($2.99)** — it gets demoted to `content_ready`, the public sales page disappears (no microsite), and her dashboard will prompt her to connect Stripe to relist it. BA-10 ($197) and BA-13 ($1997) currently have no `pricing_recommendation` field set; we'll include them in the sweep too because their numeric price > 0.

Free nodes (BP-01..05, BA-11..18 minus paid ones, YR-19..28 without prices) stay live.

### 5. Account-settings nudge

Top of `ConnectSettings` page already exists. Add a one-line summary card above it: "X paid products are waiting for Stripe to go live" (computed live from `author_nodes` for the current author). Clicking it scrolls to the Stripe row.

## Files touched

1. `supabase/functions/save-author-node/index.ts` — add Stripe gate to publish branch.
2. `src/lib/publish-node.ts` — surface `StripeRequiredError`.
3. `src/components/dashboard/builders/bp06/BP06Builder.tsx` — pre-flight check + modal + "make free" shortcut.
4. `src/components/dashboard/builders/shared/SharedPublishStep.tsx` — paid-product gate, checklist row, modal (one shared modal component).
5. `src/components/dashboard/StripeRequiredModal.tsx` — **new** shared modal.
6. `src/lib/is-paid-node.ts` — **new** helper used by both UI and migration.
7. `src/pages/ConnectSettings.tsx` — "X paid products waiting" nudge card.
8. New migration — sweep existing paid-but-no-Stripe `live` rows back to `content_ready`.

## Out of scope

- Subscription products (membership), invoice-only services, donation flows — separate gates if needed later.
- Auto-publishing the moment Stripe finishes onboarding (the user can come back and click Publish; we won't auto-flip status without their click).
- Changing `BuyNowButton`'s "Payments coming soon" modal — once the gate is in place, readers will never see it for live products. We'll leave it as a defensive fallback.
- Touching the home-study or special-edition sales pages.

## Verification

1. As Pauline (no Stripe), open BP-06 at $2.99 → Publish button is disabled with checklist row "Stripe payments connected" unchecked. Clicking Publish anyway opens the new modal.
2. Click "Make this free instead" → workbook goes live with "Free download" CTA on the public page; checklist all green.
3. Connect Stripe → checklist flips green, Publish enables, workbook goes live with Buy Now.
4. After the data sweep, hit `/pauline-teo/workbook` → it 404s / "Coming soon" until Stripe is connected (BP-06 demoted to `content_ready`).
5. Free products (BP-02 lead magnet, BP-05 webinar, etc.) stay live.
6. Direct call to `save-author-node` action=publish for a paid node without Stripe returns `409 stripe_required` (not `200`).

