## Authors Bureau — Full UI/UX Audit

Scope explored live: `/`, `/how-it-works`, `/methodology`, `/directory`, `/auth`, `/book/be-suckcessful-`, plus mobile (390×844) and laptop (1366×768) viewports. Codebase scanned for terminology consistency (em/en dashes, GHL leakage, BP-IDs), Google auth, microsite footer, and known constraints from project memory.

---

### Severity legend
- **P1** — bug, brand violation, or first-impression damage. Fix this sprint.
- **P2** — visible inconsistency or friction. Fix soon.
- **P3** — polish / nice-to-have.

---

### P1 — Brand & first-impression issues

1. **Em-dash & en-dash leakage on flagship marketing pages**
   Memory rule: "No emdashes" on public surfaces. Found on:
   - `src/pages/Index.tsx` — multiple (`$1,000–$5,000`, `9x–26x return`, "ABBY Journey Framework — FREE to BRAND…", section comments aside, **visible body copy** uses en-dashes in stat ranges and em-dashes in headlines)
   - `src/pages/HowItWorks.tsx` — pervasive in tier descriptions (`$19–$47`, `$5K–$25K/yr`, "Brand Products — 9 revenue streams")
   - `src/pages/Methodology.tsx` — body ("proven pricing frameworks — not guesswork"), table row "5–15% conversion rate"
   - `src/pages/Auth.tsx:526` — "Sign up — just enter your email above."
   - Public microsite scaffolding (`AuthorWorkWithMe.tsx`, `AuthorBookFormatsList.tsx`, `AuthorProductCard.tsx`, `AuthorHeroSection.tsx`, `AuthorBooksSection.tsx`, `DynamicBookMicrosite.tsx`)
   Fix: replace `—` with `:` or `.`/comma; replace `–` in numeric ranges with `to` (or `-`). Keep code comments untouched (rule applies to user-visible copy).

2. **No Google sign-in on `/auth`**
   Memory rule: "Add google authentication for signups and logins unless the user explicitly asks to not use it." Current `/auth` shows only Email-Code / Password tabs. No `Continue with Google` button. Add a Google OAuth button above the email/password tabs (use `supabase.auth.signInWithOAuth({ provider: 'google' })`).

3. **Directory: search input icon is detached on desktop**
   On `/directory` at 1366px the magnifying-glass icon renders as a separate circle to the *left* of the search field instead of being absolutely positioned inside it. On mobile (390px) it renders correctly inside. Likely a flex-gap / absolute-positioning regression on the desktop layout. Investigate `src/pages/Directory.tsx` search-row markup.

4. **Directory: duplicate genre tags with case variants**
   "Non-Fiction" and "Non-fiction" are both rendered as separate selectable filter chips (also "Self-Help"/"self-help" likely lurking). Normalize genres to a single canonical case at query/render time (e.g., `toTitleCase(genre)` and `dedupe`).

---

### P2 — Consistency, terminology & marketing-copy issues

5. **Pricing leak on the homepage comparison table**
   `Index.tsx` "One Platform Replaces Everything" table shows `$273+/mo` and `From $49/mo + Abby does the work`. Memory: pricing is hidden from the public site (Pricing page excluded from sitemap). Either (a) remove the dollar figures from the marketing comparison or (b) replace with "Save 80%+" style positioning. Confirm intent.

6. **Public microsite shows price chips ($0.99 Kindle / $8.99 Hardcover)**
   Visible on `/book/be-suckcessful-`. These are Amazon retail prices (legitimate context), but memory says "No pricing" on public microsites — likely meant *platform* pricing. Confirm whether book retail prices are exempt; if so, no change. If not, hide the price chips and rely on "Buy on Amazon".

7. **Footer "sister platform" copy** (`Footer.tsx`)
   "Authors Bureau and PublishNow.io are sister platforms." This conflicts with the messaging guideline of presenting Authors Bureau as a self-contained product. Confirm whether to keep, soften ("Part of the PublishNow family"), or remove.

8. **Directory: 28+ genre chips form a visual wall**
   On both desktop and especially mobile, the chip strip pushes author cards far below the fold. Suggest:
   - Collapse to top 6–8 by author count, then a "+ more" expander, or
   - Convert to a single multi-select dropdown / combobox.

9. **Auth page: tab labels say "Email Code" / "Password"**
   "Email Code" is jargon. Suggest "Magic link" or "One-time code" (the current copy below explains it but the tab label alone is confusing).

10. **Homepage CTA stack**
    "Already have an account? Sign in →" link sits *below* `Start for Free` plus a `Sign In` link in the nav and the same wording inside the hero. Three sign-in entry points within one viewport. Consolidate: keep nav-level Sign In + the hero CTA, drop the underlined link below the trust strip.

---

### P3 — Polish

11. **Loading & empty states** — many pages still flash a single spinner. AuthorLibrary was upgraded last cycle; extend the same skeleton pattern to:
    - `/directory` (currently white flash before chips render)
    - `/dashboard?section=*` hub views (Brand Products, Build Authority, Yield Revenue)
    - Public microsite hero (cover image pop-in causes layout shift).

12. **React Router future-flag warnings** spamming console on every page load. Add `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` to the `<BrowserRouter>` in `src/App.tsx` to silence and forward-compat.

13. **forwardRef warnings** for `Toaster` (Sonner), `BrowserRouter`, `AuthProvider` — these are dev-only warnings but pollute the console. Wrap `Toaster` in a forwardRef shim or upgrade `sonner` if a fix exists.

14. **Supabase gotrue lock timeout warnings** every 30s ("lock:authorsbureau-shared-auth acquisition timed out"). The shared-auth lock between PublishNow and Authors Bureau is fighting itself. Investigate `useAuth.tsx` lock acquisition or switch to a non-locked refresh strategy on this surface.

15. **Mobile filter UX** on `/directory` — the chip strip is scrollable but lacks a visual scroll affordance (no fade-edge gradient, no "Filters" sheet trigger).

---

### Out of scope but worth noting

- **Portal (`/dashboard`)** could not be sampled in this audit because the browser session isn't logged in; flagged for the next pass once a test author session is available.
- **Reader portal (`/readers-bureau`)** — same.
- **Buffer / Social Calendar** — not exercised.

---

### Proposed execution order (when approved, switch to build mode)

```text
Phase A (P1 — first-impression):
  1. Strip emdashes/endashes from public marketing & auth pages
  2. Add Google sign-in button to /auth
  3. Fix /directory desktop search-icon alignment
  4. Dedupe /directory genre chips (case-normalize)

Phase B (P2 — consistency):
  5. Remove or rephrase $/mo figures in homepage comparison table
  6. Confirm + apply microsite price-chip policy
  7. Collapse /directory genre chips into "Top 8 + more"
  8. Rename Auth tab labels, dedupe sign-in CTAs, footer "sister platform" copy

Phase C (P3 — polish):
  9. Extend skeleton loading pattern to directory + hubs + microsite hero
 10. Silence Router future-flag warnings; investigate Sonner forwardRef
 11. Investigate gotrue shared-auth lock timeouts
 12. Mobile chip-scroll affordance + filter sheet
```

I will not start implementing until you approve. Reply **YES** to proceed with Phase A, or call out any items to drop / re-prioritize.
