## What is actually happening (verified)

I checked the database directly. Your audiobook **is** fully saved and live:

- `audiobooks` row → status `published`, price `$14.99`, linked to *Be SUCKcessful*.
- `author_nodes` BA-11 row → status `live`, `book_id` set, `microsite_url = /pauline-teo/audiobook`, ZIP file stored, published timestamp present.
- Public route `https://authorsbureau.com/pauline-teo/audiobook` is wired to render the audiobook microsite (player + chapters + Buy Now button).
- On `https://authorsbureau.com/pauline-teo`, the *Be SUCKcessful* book card should show an **Audiobook** badge, a **Listen to Audiobook** button, and an **Audiobook · $14.99** row inside *Available formats*.

So the publish DID succeed. What's broken is the **author-facing visibility** of where it went and how to manage price/next steps.

## What I'll fix

### 1. Make pricing obvious on the Publish step
Today, retail price is set in Step 1 (Setup) and only shown read-only on the Publish step as a stat. I will turn that stat into an inline editable field with a Save button that updates both `audiobooks.price` and `author_nodes.price_usd`. Toast confirms persistence; no page reload needed.

### 2. Add a "View on your author site" panel on the Publish step (not only in the modal)
After publish, replace the small "Saved to your Library" line with a card that shows:
- **Live URL** → `/pauline-teo/audiobook` with copy + open buttons
- **Open My Library** link
- **Download Export Pack (.zip)** link

So you don't have to dig through the modal again to find these.

### 3. Add a "Distribution checklist" so you know what's truly done
A small checklist on the Publish step:

```text
[✓] Saved to My Library
[✓] Live on your author site (Buy Now enabled)
[✓] Export Pack (ZIP + ACX guide) generated
[ ] Submitted to ACX (Audible)        — manual upload using the ZIP
[ ] Submitted to Spotify / Findaway   — manual upload using the ZIP
[ ] Submitted to Apple Books          — manual upload using the ZIP
```

The last three are intentionally manual (Authors Bureau does not submit on your behalf — that's stated policy). Each row gets a "Mark as submitted" toggle so you can track progress; the toggles persist in `content_json.distribution_status`.

### 4. Tighten the "Published" toast copy
Replace the generic "Audiobook published" toast with: *"Live at /pauline-teo/audiobook · $14.99 · Saved to Library"* — one toast that proves all three things happened.

## Files I'll touch

- `src/components/dashboard/builders/audiobook/AudiobookPublishStep.tsx` — editable price, view-on-site card, checklist UI.
- `src/components/dashboard/audiobook/DistributeAudiobookModal.tsx` — refresh toast copy with live URL.
- `supabase/functions/ba11-publish-audiobook/index.ts` — accept `distribution_status` updates and a `price_override` so price edits persist atomically to both `audiobooks` and `author_nodes`.

## What you do not need to do
- Nothing additional is required to make readers able to buy. Buy Now on `/pauline-teo/audiobook` already routes to the platform Stripe checkout (Authors Bureau is Merchant of Record), and your 92% share is tracked automatically.

Approve and I'll ship these four changes.