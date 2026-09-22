# Fix the UI/UX audit findings

Implement the fixes from the audit report, in priority order. No visual redesign, no changes to locked rules (hidden homepage pricing, enquiry-only high-touch services, 28-node labels and count).

## Critical (do first)

1. **Contact form actually sends** — Replace the fake one-second "Message sent!" timer with a real submission to a new backend function that emails support@authorsbureau.com through the existing branded email pipeline and stores the enquiry. Success only shows after the send is confirmed; on failure the typed message is kept and a retry button appears.
2. **Reader email links land on the right page** — Point the emailed sign-in link at the live reader sign-in page, and make the old `/reader-auth` address forward there so links already in inboxes still work.
3. **Honest checkout errors** — Only show "the author hasn't switched on checkout yet" when that is genuinely the case. Any technical failure gets a separate "Checkout could not open" message with Retry and support contact.
4. **No endless loading on the three hubs** — Brand, Build Authority and Yield Revenue stop spinning after a bounded wait and show either "Choose a book" or a clear error with Retry, instead of a blank screen.

## High priority

5. **Mobile author menu starts closed** so the page content is visible on first load; the current section name stays in the header.
6. **Failures stop looking like empty data** — CRM and Earnings show a real error state with Retry instead of silent zeroes or an unresolved spinner.
7. **Names on unlabelled controls** — directory search and sort, the floating Abby button, dashboard drawer buttons, and lead-capture fields get proper labels.
8. **Visible keyboard focus** in themed lead forms (replace the removed outline with a high-contrast focus ring).
9. **Keyboard-operable cards** in the Workbooks manager and the Social Media builder (real buttons instead of clickable boxes).
10. **Skip-to-content link and one main landmark per page**, added through the shared public page shell.
11. **Safe redirects** — only internal paths accepted after sign-in; anything else falls back to the default destination.

## Medium priority (same pass, lower risk)

12. Directory genre filter switched from a broad word match to a curated list, so categories like Leadership Development are no longer hidden.
13. Larger tap areas (min 44x44) for small icon controls on mobile.
14. Respect the system "reduce motion" setting for decorative animation.
15. Book Hub reuses the shared dashboard shell instead of its own copy.

## Technical notes

- New edge function `submit-contact-form` (verify_jwt = false) validating input, inserting into a new `contact_submissions` table (RLS: insert via function/service role only, select restricted to admins, with GRANTs), then calling the existing `send-transactional-email` path. No new secrets required.
- `ReaderAuth.tsx` `emailRedirectTo` -> `/readers-bureau/auth`; add a legacy `/reader-auth` route in `App.tsx` that redirects with query params preserved.
- `BuyNowButton.tsx`: branch on the explicit `AUTHOR_PAYMENTS_NOT_SET_UP` result; all other errors use a new error state.
- `HubRedirect.tsx`: add a timeout plus error/empty branches with Retry; reuse a known book ID when available.
- Shared `isSafeInternalPath()` helper used by `Auth.tsx` and `ReaderAuth.tsx`.
- Skip link + `<main>` added in the shared layout wrappers rather than per page where possible.
- Verification: typecheck, then a Playwright pass over the previously failing routes (contact submit, `/reader-auth`, the three hubs) on desktop and mobile widths.

The audit report stays as-is; findings will be re-checked after the fixes.
