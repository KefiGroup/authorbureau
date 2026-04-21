

## Confirmation: AuthorProductCard CTA logic

I audited `AuthorProductCard.tsx` (lines 145-205) and confirm the CTA branching is correct:

- **`canSell = stripeReady && hasPrice`** — only then does `<BuyNowButton>` render
- **`!canSell` + reader (not owner)** → renders an outline **"Contact"** button → `mailto:` (or `/{slug}#contact` fallback). **Never** a dead Enroll button.
- **`!canSell` + owner viewing own page** → greyed "Payments not set up" / "Price not set" chip + inline link to `/account-settings?tab=connections` or `/build-authority`

Price is **always** rendered prominently (large `text-2xl` accent badge), or "Pricing on request" if null. Confirmed.

## One gap found in `stripeReady` calculation

In `AuthorSite.tsx` (lines 262-265), `stripeReady` is currently:

```ts
!!stripe_connected_account_id || !!stripe_account_id
```

This is **too permissive** — an author can have a connected account that hasn't completed onboarding (can't actually receive payments). The plan required AND-ing with `stripe_onboarding_complete`. Readers could then see "Enroll Now" → checkout would fail at Stripe.

## Fixes to ship

### 1. Tighten `stripeReady` in `AuthorSite.tsx`
Change to:
```ts
stripeReady={
  !!profile.stripe_connected_account_id &&
  profile.stripe_onboarding_complete === true
}
```
Pass `stripe_onboarding_complete` through from the author profile fetch (already in `select` per types). Drop the `as unknown` cast — add the two fields to the local `AuthorData` type instead.

### 2. Pass real `authorContactEmail`
Currently hardcoded to `null` (line 260). Pull from `author_profiles.contact_email` (or `email` / `public_email`, whichever the schema exposes) so the reader "Contact" mailto resolves to the author's real inbox instead of falling back to `/{slug}#contact`.

### 3. Verify `author_nodes` public read RLS for `status='live'`
Quick check — if missing, add a read-only policy:
```sql
create policy "public read of live author_nodes"
on public.author_nodes for select
using (status = 'live');
```
No PII in `author_nodes`. Skip if policy already exists.

### 4. Smoke-test BA-10 → BA-18 export buttons
Confirm `ExportPackageCard` mounts on Step 3 of all 9 builders, all 4 buttons fire (Copy, TXT, DOCX, PDF), no console errors. Fix any builder where the wire-in regressed.

## Files touched

- `src/pages/AuthorSite.tsx` — tighten `stripeReady`, wire real contact email, type cleanup
- `src/components/public/AuthorWorkWithMe.tsx` — no change (already consumes `stripeReady` correctly)
- `src/components/public/AuthorProductCard.tsx` — no change (CTA logic verified correct)
- New migration (only if RLS missing): public-read policy on `author_nodes` where `status='live'`

## Verification checklist

**CTA correctness (the non-negotiable):**
1. Author with no Stripe → reader on `/pauline-teo` sees "Contact" outline button, never "Enroll Now"
2. Author with Stripe account ID but `onboarding_complete=false` → reader sees "Contact", NOT "Enroll Now" (this is what the fix addresses)
3. Author with Stripe fully onboarded + `price_usd > 0` → reader sees "Enroll Now" → Stripe Checkout opens
4. Owner viewing own page in any non-ready state → greyed status chip + "Set up payments →" link

**Exports:**
5. Each of BA-10 → BA-18 Step 3 shows the 4-button Export Package card above "Publish to My Site"
6. All four formats produce identical content in identical order

**Storefront:**
7. Zero live nodes → "Work With Me" section hidden entirely
8. Price always visible in prominent badge regardless of CTA branch

