

# Fix — Live Home Study microsite shows `$TBA` and no Thinkific instructions appear

## What I saw on your microsite
On the live `/pauline-teo/home-study` page:
- Price renders as **`$TBA`** instead of the price you set in the builder
- The book cover is showing in the price card (we want that), but there is no real price
- Even though you ticked Thinkific in the builder, the post-publish screen and the public site give you no instructions on what to do next on Thinkific or where to find your link

This isn't one bug — it's two separate gaps in how Build → Publish → Live → Distribute connect.

---

## Root causes

### 1. The price isn't being mapped to the field the public page reads
- The BP-07 builder stores your price as **`content.suggested_price_usd`** (and as the override `priceOverride`)
- The public Sales Page in `MicrositePage.tsx` reads **`content.price`**
- Those two fields are never reconciled, so the page falls back to `"TBA"`
- Same field-name mismatch exists for BP-08 (special edition) — same fix applies there

### 2. Distribution channels are saved, but never *explained* to the author
The builder lets you tick:
- Readers Bureau portal (default)
- Thinkific mirror
- Printable PDF bundle

…but after Publish, the success screen only shows:
- a link to the public sales page
- "Activate My Marketing Campaign"

There is no guidance about:
- where the Thinkific course actually lives once provisioned (the URL exists in `content.thinkific_url` but it is hidden inside the Review tab)
- what to do on Thinkific to finish the setup (it is a placeholder URL today unless THINKIFIC_API_KEY is configured — that needs to be said honestly)
- how the PDF bundle is delivered to buyers (it is auto-emailed, but the author never sees that explained)

So the *intent* (multi-channel distribution) is wired into the data and the buyer email, but the *author UX* makes it look like nothing happened.

---

## What I'll change

### Fix A — Map the price into the field the public page reads
**Files:** `src/components/dashboard/builders/bp07/BP07Builder.tsx`, `src/components/dashboard/builders/bp08/BP08Builder.tsx`

In `handlePublish` (and in `saveChannels` for BP-07), when persisting the merged content, also write:
- `content.price = priceOverride ?? content.suggested_price_usd`
- keep `suggested_price_usd` for backward compatibility

Result: `$TBA` becomes the actual price (e.g. `$47`) on the live `/home-study` page immediately after Publish.

### Fix B — Add a “Distribution & next steps” card to the Publish success screen for BP-07
**Files:** new `src/components/dashboard/builders/bp07/HomeStudyDistributionCard.tsx`, edit `BP07Builder.tsx` (Step 3 success block)

After the green “live” checkmark, render a card listing each channel the author enabled, with an honest, plain-English instruction for each:

- **Readers Bureau portal** — “Your buyers automatically get a private learner link emailed after purchase. No setup needed. (See Marketing Hub → Email logs to inspect a sample.)”
- **Thinkific mirror** — show `content.thinkific_url`, a Copy button, and an instructions block:
  - “We provisioned a placeholder Thinkific URL. To finish the mirror:
    1. Connect your Thinkific account in Account Settings → Connections.
    2. We will sync the 21-day curriculum into a new Thinkific course.
    3. Buyers receive both the Readers Bureau and Thinkific links in their confirmation email.”
  - If `THINKIFIC_API_KEY` is not yet configured, the URL is honestly labelled “Placeholder — connect Thinkific to make it live.”
- **Printable PDF bundle** — “Buyers receive a download link in their confirmation email pointing to `/{slug}/home-study-bundle/{purchaseId}`. You don’t need to upload anything; the PDF is generated from your published lessons.”

This card matches the pattern already used by other nodes (BA-17 download card, BP-03 success screen), so it stays visually consistent with the design freeze.

### Fix C — Show the same channel summary inside the builder Review step
**File:** `src/components/dashboard/builders/bp07/BP07Builder.tsx`

Right under the existing “Distribution channels” checkboxes in Step 2, render a compact “What this means for buyers” preview. So before they hit Publish, the author already understands what each ticked box will do, where the URLs come from, and what they still need to do externally.

### Fix D — Surface Thinkific connect call-to-action when ticked but not connected
**File:** `src/components/dashboard/builders/bp07/BP07Builder.tsx`

When `channels.thinkific` is on AND `content.thinkific_status !== "live"`, show an inline notice:
- “Thinkific isn’t connected yet — your mirror URL is a placeholder. [Connect Thinkific →]” linking to `/account-settings?tab=connections`.

This keeps the platform honest (matches your `manus-2026-04-23` audit memory: don’t pretend integrations are live when they aren’t) and gives the author one click to fix it.

---

## Files to change
- `src/components/dashboard/builders/bp07/BP07Builder.tsx` — write `price`, render distribution preview in Step 2, render distribution card in Step 3, add Thinkific connect notice
- `src/components/dashboard/builders/bp08/BP08Builder.tsx` — write `price` on publish (same one-line fix)
- new `src/components/dashboard/builders/bp07/HomeStudyDistributionCard.tsx` — reusable card used by both Step 2 preview and Step 3 success

## Out of scope (deliberately)
- Real Thinkific API sync — the `deploy-bp07-to-thinkific` edge function already handles that path the moment `THINKIFIC_API_KEY` + `THINKIFIC_SUBDOMAIN` are configured. No code change needed there.
- The buyer confirmation email already fans out the right links in `process-purchase` (added in our last sprint); we’re only making the *author-side* visible.

## Validation checklist
1. Open BP-07, Publish — public `/home-study` page shows the real price, not `$TBA`.
2. Tick Thinkific in Step 2 — see a clear preview block explaining what will happen + connect CTA if not connected.
3. After Publish, success screen shows a Distribution card with one row per enabled channel and copy/open buttons.
4. Untick a channel and republish — the Distribution card updates accordingly.
5. BP-08 published price also renders correctly on its sales page.

