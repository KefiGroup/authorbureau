## Goal

Replace the bare "Post-purchase redirect URL" panel for STEP 3 (Checkout) of the Funnels Hub with an author-friendly Stripe-aware view: connection badge, product/price summary, redirect URL, Test Checkout button, and a plain-English explanation of how money flows.

## Where this lives

- Stage definition: `src/lib/funnel-flow-stages.ts` (archetype A, `id: "checkout"`).
- Drawer that renders the panel: `src/components/dashboard/builders/shared/StageEditorDrawer.tsx`.
- Drawer is opened from `NodeFunnelFlow.tsx`, which already has `funnel.author_id` and `funnel.node_id` — we'll pass these through so the drawer can fetch product + Stripe status.

## Data model already in place (no migrations needed)

- `funnels.node_id` + `funnels.author_id` → look up the matching product in `author_nodes (author_id, node_id)` to get `node_name` / `personalised_name`, `price_usd`, `delivery_url`, `stripe_price_id`.
- Stripe connection status is stored on `author_profiles.stripe_connected_account_id` (and `stripe_onboarding_complete`). Same pattern used in `RevenueFullDashboard.tsx`.
- "Test this checkout" can call the existing `create-checkout-session` edge function with the `author_node_id` (same path `BuyNowButton` uses), opened in a new tab.

## Changes

### 1. `StageEditorDrawer.tsx`

Add two new props so the drawer can render a checkout-specific header without breaking other stages:

```ts
authorNodeId?: string | null;     // funnel's node_id
authorProfileId?: string | null;  // funnel's author_id (for Stripe lookup)
```

When `stage.id === "checkout"`, render a new `<CheckoutStagePanel>` block above the field list:

- On mount: query `author_nodes` for `(author_id = authorProfileId, node_id = authorNodeId)` → get `personalised_name || node_name`, `price_usd`, `stripe_price_id`, `id` (author_node row id). In parallel, query `author_profiles` for `stripe_connected_account_id, stripe_onboarding_complete`.
- Header row:
  - Green `CheckCircle2` + "Your Stripe Checkout is ready" if `stripe_connected_account_id` is set AND `stripe_price_id` is present.
  - Amber `AlertTriangle` + "Connect Stripe first to activate this checkout" if not connected. Show a `Button` linking to `/dashboard?section=connect-stripe`.
  - If Stripe is connected but the product has no `stripe_price_id`, amber "Add a price for this product" link to the matching product builder route.
- Product summary card (`bg-muted/30` rounded card):
  - Product name (bold)
  - Price formatted as `$XX.XX USD` from `price_usd`
  - Small "Edit price" link → product builder for that node (route map already used in `BookHub`; default to `/dashboard?section=brand-products`).
- "Test this checkout" `Button` (only enabled when Stripe is connected): calls `supabase.functions.invoke("create-checkout-session", { body: { author_node_id, test_mode: true } })`, then `window.open(data.url, "_blank")`. Falls back to the existing `delivery_url` if the function returns `AUTHOR_PAYMENTS_NOT_SET_UP`.
- Plain-English explanation paragraph (muted text):
  > "When a reader clicks 'Buy Now' on your sales page, they're taken to a secure Stripe checkout page. After payment, they're redirected to your Thank You page. Authors Bureau keeps 5% and pays you 95% on Stripe's standard schedule."

The existing redirect-URL `Input` continues to render unchanged below this header (current loop over `stage.fields`).

### 2. `NodeFunnelFlow.tsx`

Pass the two new props through when mounting `StageEditorDrawer`:

```tsx
authorNodeId={funnel.node_id ?? null}
authorProfileId={authorId}
```

### 3. `funnel-flow-stages.ts`

No structural change required — `redirect_url` field stays. Optionally tighten the `checkout` stage `description` from "Stripe payment" to "Secure Stripe checkout — 5% platform fee".

## Test plan

1. Log in as `support@paulineteo.com`.
2. Open `/dashboard?section=funnels-hub`.
3. Click STEP 3 Checkout on the SUCKcessful sales funnel. Drawer should show:
   - Green "Your Stripe Checkout is ready" header (Stripe is connected for this account).
   - Product summary: "Be SUCKcessful Instant Digital Book" + "$27.00 USD" + Edit price link.
   - Plain-English paragraph.
   - "Test this checkout" button opens a real Stripe checkout in a new tab.
   - Existing Post-purchase redirect URL field with ABBY's value pre-filled.
4. Temporarily simulate a disconnected author (or test on an unconnected account): header switches to amber with "Connect Stripe" CTA pointing to `/dashboard?section=connect-stripe`.

## Files touched

- `src/components/dashboard/builders/shared/StageEditorDrawer.tsx` (extend)
- `src/components/dashboard/builders/shared/NodeFunnelFlow.tsx` (pass 2 props)
- `src/lib/funnel-flow-stages.ts` (minor description tweak — optional)

No DB migrations, no new edge functions.
