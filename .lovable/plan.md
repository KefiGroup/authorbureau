

## Three fixes — diagnosed and ready

### Issue 1 — Disabled "Build" button bug across BA-11 → BA-18
**Root cause:** Same as the original BA-10 bug. These builders use `disabled={isBookLoading}` plus a stale `detectedBookTitle` fallback, so when the book context hydrates slowly the CTA stays grey or fires with `"your book"` as a placeholder.

**Fix (mirror the current BA-10 pattern):**
1. Compute `displayBookTitle = (detectedBookTitle && detectedBookTitle !== "your book") ? detectedBookTitle : resolvedBookTitle`
2. Compute `isIntroReady = Boolean(authorName && authorName !== "there" && displayBookTitle)`
3. Compute `noBookFound = !isBookLoading && !hasBook && !resolvedBookTitle && !detectedBookTitle`
4. Render three branches: `noBookFound` → "Complete Book Profile"; `!isIntroReady` → "Loading your book details…"; else → enabled CTA with **no `disabled` prop**
5. Inline the `displayBookTitle` into the intro paragraph (replaces the `(detectedBookTitle && … ? : resolvedBookTitle) || "your book"` ternary)

**Files:** BA11Builder, BA12Builder, BA13Builder, BA14Builder, BA15Builder, BA16Builder, BA17Builder, BA18Builder (Step 0 block only).

### Issue 2 — DOCX exports as 0 bytes
**Root cause:** `docx@9.6.1`'s `Packer.toBlob()` internally relies on a Node `Buffer` shim. Vite doesn't polyfill `Buffer` in this project (verified — no polyfill in `vite.config.ts`), so `Packer.toBlob` returns an empty Blob silently.

**Fix in `src/lib/builder-export.ts`:**
- Replace `Packer.toBlob(doc)` with the polyfill-free path:
  ```ts
  const base64 = await Packer.toBase64String(doc);
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  ```
- This avoids the `Buffer` dependency entirely (`toBase64String` returns a plain string), and produces a valid `.docx` file in every browser.
- No changes to vite config, no new deps.

### Issue 3 — Storefront cards show "Pricing on request" instead of $197
**Root cause:** `AuthorProductCard.formatPrice()` only reads `node.price_usd`. Confirmed in DB: BA-10 has `price_usd = 197.00`, but other live nodes (BP-01/02/04) and any older BA rows have NULL `price_usd` even though `content_json.suggested_price_usd` (or `monthly_price_usd`, `programme_price_usd`, `package_price_usd`) is populated by Abby.

**Fix in `src/components/public/AuthorProductCard.tsx`:**
- Add a `getEffectivePrice(node)` helper that returns the first non-null of:
  1. `node.price_usd`
  2. `node.content_json.suggested_price_usd`
  3. `node.content_json.monthly_price_usd` (memberships)
  4. `node.content_json.programme_price_usd` (coaching/mastermind)
  5. `node.content_json.package_price_usd` (1-on-1, VIP day)
  6. `node.content_json.price_usd`
  7. `node.content_json.pricing?.price_usd`
- Use that value for both `priceDisplay` and `hasPrice` checks
- CTA branching unchanged (still gated by `stripeReady && hasPrice`)

**Bonus typing:** widen the `StorefrontNode.content_json` type comment to mention these fields so future builders stay consistent.

---

## Verification

**BA-11 → BA-18 (Issue 1):** open each builder → Step 0 shows "Loading your book details…" briefly, then the enabled CTA. No grey button when book context is ready. No `"your book"` placeholder leaks into the intro.

**DOCX (Issue 2):** Step 3 of BA-10 → click "DOCX" → file downloads with non-zero size, opens cleanly in Word with headings + modules + lessons.

**Pricing (Issue 3):**
- Pauline publishes BA-10 → storefront card shows **"$197 USD"** prominently (was "Pricing on request")
- Existing live BP nodes still hide gracefully if no price source exists anywhere
- Owner view still shows "Set price →" only when ALL price sources are null

---

## Files touched
- `src/components/dashboard/builders/ba11/BA11Builder.tsx`
- `src/components/dashboard/builders/ba12/BA12Builder.tsx`
- `src/components/dashboard/builders/ba13/BA13Builder.tsx`
- `src/components/dashboard/builders/ba14/BA14Builder.tsx`
- `src/components/dashboard/builders/ba15/BA15Builder.tsx`
- `src/components/dashboard/builders/ba16/BA16Builder.tsx`
- `src/components/dashboard/builders/ba17/BA17Builder.tsx`
- `src/components/dashboard/builders/ba18/BA18Builder.tsx`
- `src/lib/builder-export.ts` (DOCX path only)
- `src/components/public/AuthorProductCard.tsx` (price fallback helper)

No DB migrations. No new dependencies. No changes to publish flow, `BuyNowButton`, or commerce edge functions.

