## Goal

On the reader book page "Work With" section, high-touch service cards currently show a hardcoded **"Join for $10,000"** button wired to one-click Stripe checkout. For engagements like Speaking, that is wrong — these are negotiated bookings. These cards should become **enquiry-only with no price shown**, opening a booking/enquiry form so the author can follow up.

## Affected nodes

The six high-touch, enquiry-led service nodes:

- `YR-20` Big Ticket Consulting
- `YR-21` Speaking
- `YR-22` Corporate Training
- `YR-23` Mastermind
- `YR-24` Retreat
- `YR-26` Conference

`YR-19` (1-on-1 Coaching) and `BA-13` (Group Coaching) keep their existing priced "Join for $X" checkout behaviour.

## What changes

All edits are in `src/pages/AuthorBookPage.tsx` only (presentation logic).

1. Add a set near the other node groupings:
   ```text
   ENQUIRY_NODE_IDS = { YR-20, YR-21, YR-22, YR-23, YR-24, YR-26 }
   ```

2. In `renderWorkCard(n)` (currently builds the priced "Join for $X" card via `BuyNowButton`):
   - If the node's `node_id` prefix is in `ENQUIRY_NODE_IDS`, route it to the existing **enquiry card** (`renderInquireCard`) regardless of whether a price is set — so it never renders the checkout/`BuyNowButton` path.

3. The enquiry card (`renderInquireCard`) already:
   - Shows the canonical title and description.
   - Shows **no price**.
   - Has a CTA that opens the booking/enquiry form via `setInquiryFor(title)` so the author receives the enquiry and can get back to the buyer.
   - Optional polish: confirm the CTA label reads naturally for these (e.g. "Book Now" / "Enquire"); keep the current "Contact {author}" wording unless a change is wanted.

No price display, no Stripe checkout, no new components or backend changes — it reuses the existing enquiry flow.

## Result

- Speaking and the other five high-touch nodes show an enquiry/booking CTA with **no price**, opening the existing enquiry form.
- Priced coaching / group-coaching and all other product cards keep their current behaviour.

## Verification

- Open a reader book page where a Speaking node has a price: confirm the card shows **no price** and a button that opens the enquiry/booking form (no Stripe redirect, no "Join for $X").
- Confirm Corporate Training, Big Ticket Consulting, Mastermind, Retreat, Conference behave the same.
- Confirm 1-on-1 Coaching / Group Coaching priced cards still show "Join for $X" checkout.
