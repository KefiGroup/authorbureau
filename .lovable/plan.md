## Scope

Per your decision: keep both Core rules ("Public Microsites: No nav header, no pricing") intact. I'll fix the four bugs that don't conflict, and explicitly skip the rest.

### Skipping (rule conflicts)
- **Bug 15** (coaching prices) — no inline prices on microsites.
- **Bug 18** (membership nav header) — no nav header on microsites.
- **Bug 19 price portion** — won't show "$14.99" inline. Will still wire the broken Buy button (see below).
- **Bug 21** (audiobook nav header) — no nav header on microsites.

### Fixing
- **Bug 16** — Course guarantee inconsistency.
- **Bug 17** — "3+ structured lessons" → real daily lesson count.
- **Bug 19 (wire-only)** — "Buy Audiobook" button currently does nothing. Replace with our standard `BuyNowButton`, which routes through `create-checkout-session` and reveals price at Stripe checkout.
- **Bug 20** — Audiobook description renders as one wall of text. Apply paragraph + bullet rendering.

---

## Changes

All changes are in `src/pages/MicrositePage.tsx`.

### Bug 16 — Course guarantee consistency
`LongFormSalesPage` already computes a duration-aware `guaranteeText` (e.g. "14-day money-back guarantee" for a 21-day course). It's used in the FAQ and final CTA, but the hero hardcodes "30-day".

- Line 1295: replace the literal `"… · 30-day guarantee"` with the dynamic value:
  ```tsx
  Secure checkout · Stripe · {guaranteeText}
  ```

That single change makes the hero match FAQ + CTA on every course.

### Bug 17 — Real lesson count for BP-07 home study
Today, `includedItems` (line 1271) counts `youGet.length`, which for BP-07 is the number of *weeks* (3) — yielding the misleading "3+ structured lessons". The generator stores `study_weeks[].days[]`, so the true daily-lesson count is `sum(week.days.length)` (3 × 7 = 21 for Pauline's course).

- Add a helper near the existing `youGet` derivation:
  ```ts
  const dailyLessonCount = Array.isArray(content.study_weeks)
    ? content.study_weeks.reduce(
        (n: number, w: any) => n + (Array.isArray(w?.days) ? w.days.length : 0),
        0,
      )
    : 0;
  ```
- In `includedItems`, replace the home-study line so it prefers daily lessons when available:
  ```ts
  type === "home-study" && dailyLessonCount > 0
    ? `${dailyLessonCount} daily lessons`
    : youGet.length > 0
      ? `${youGet.length} structured ${type === "home-study" ? "lessons" : "modules"}`
      : "All core content",
  ```
  (Also drops the misleading "+" when we have an exact count.)

### Bug 19 (wire-only) — Audiobook Buy button
BA-11 falls through to `GenericPage`. Today the purchase CTA only renders when `payment_link` or `content.stripe_checkout_url` is set; otherwise the button is missing or has no href. We already use `BuyNowButton` everywhere else (membership, coaching right card, sales pages), so use it here too — no inline price, modal grace if Stripe isn't connected.

In `GenericPage` (around lines 2435–2444), replace the conditional `<a href={paymentUrl}>` block with:

```tsx
{actionType === "purchase" && data.node.id && (
  <BuyNowButton
    authorNodeId={data.node.id}
    authorId={data.author?.id}
    fallbackUrl={paymentUrl || null}
    label={content.cta_text || "Get Started"}
    className="rounded-full px-8 py-3"
    style={{ background: v.accent, color: v.accentText }}
  />
)}
```

This:
- Always renders a working CTA when the node is purchasable.
- Routes through `create-checkout-session` (price set on `author_nodes.price_usd`).
- Falls back to `payment_link` only if it's a real Stripe URL.
- Shows the friendly "Payments coming soon" modal if the author hasn't connected Stripe.
- Keeps price hidden until Stripe checkout (no `content.price` block above).

### Bug 20 — Audiobook description formatting
Same `GenericPage` (line 2403) currently renders `content.description` as a single `<p>`, dropping all paragraph breaks from the source content.

The book microsite (`AuthorBookPage.tsx`) already uses `stripHtml` from `@/lib/stripHtml` (which preserves `<br>` and `<p>` boundaries as `\n`/`\n\n`).

- Add at top of file: `import { stripHtml } from "@/lib/stripHtml";`
- Replace the `content.description` paragraph with paragraph-aware rendering:
  ```tsx
  {content.description && (() => {
    const text = stripHtml(String(content.description));
    const paras = text.split(/\n{2,}/).filter(Boolean);
    return (
      <div className="space-y-3">
        {paras.map((p, i) => {
          const lines = p.split(/\n/).filter(Boolean);
          // Bullet block: every line starts with -, *, • or "1." style
          const isBullets = lines.length > 1 && lines.every(l => /^\s*([-*•]|\d+[.)])\s+/.test(l));
          if (isBullets) {
            return (
              <ul key={i} className="space-y-1 list-disc pl-5">
                {lines.map((l, j) => (
                  <li key={j} className="text-base leading-relaxed" style={{ color: v.bodyText }}>
                    {l.replace(/^\s*([-*•]|\d+[.)])\s+/, "")}
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i} className="text-base leading-relaxed whitespace-pre-line" style={{ color: v.bodyText }}>
              {p}
            </p>
          );
        })}
      </div>
    );
  })()}
  ```

This preserves paragraph breaks, renders bullet lines as `<ul><li>`, and uses the same sanitiser as the main book microsite — so BA-11 description matches the look on `/pauline-teo/<book-slug>`.

---

## Files modified
- `src/pages/MicrositePage.tsx` (4 localized edits)

No DB changes, no new edge functions, no memory updates (Core rules unchanged).

## Out of scope (per your decision)
- Bug 15 — won't add inline prices to coaching package cards.
- Bug 18 — won't add a nav header to the membership page.
- Bug 19 (price portion) — won't display "$14.99" inline on the audiobook page.
- Bug 21 — won't add a nav header to the audiobook page.

If you change your mind on any of these later, ping me and I'll do them as a separate pass (and update the relevant Core memory rule at the same time so the codebase and rules stay consistent).
