## Goal

Run a one-shot, **read-only audit** that flags broken links, dead buttons, and unreachable routes — without changing any app code. Results saved to `/mnt/documents/` so you can review and triage.

## What the audit will check

### 1. Static codebase audit (fast, no browser)
Run ripgrep + a small Node script over the repo and produce `link-audit-report.md` with:

- **Internal links pointing to non-existent routes** — extract every `to="/..."`, `href="/..."`, `navigate("/...")`, and `<Navigate to="/...">` and cross-check against the route table in `src/App.tsx` (lines 132–202). Flags typos like `/dasboard` or removed routes.
- **Buttons with no handler** — find `<Button ...>` and `<button ...>` with no `onClick`, no `asChild`+`<Link>`, no `type="submit"`, and not inside a `<form>`. Likely dead.
- **Empty `href` / `to` values** — `href=""`, `href="#"`, `to=""`.
- **`<a>` tags missing `href`** and `<Link>` missing `to`.
- **External links missing `rel="noopener"`** when `target="_blank"` (security, not breakage, but worth catching).
- **Legacy builder slugs** referenced in the UI but missing from `LEGACY_BUILDER_REDIRECT` in `src/components/dashboard/builders/legacyBuilderRedirect.ts`.
- **Microsite slugs** referenced in code but missing from `NODE_SLUG_MAP` / `SLUG_TO_NODE` in `src/lib/node-slug-map.ts`.

### 2. Live HTTP audit of public routes
Hit the published site (`https://authorsbureau.com`) for every static public route and report status codes:

```text
/                       /how-it-works           /directory
/methodology            /faq                    /readers-bureau
/contact                /terms                  /privacy
/pricing                /solutions              /auth
/admin-auth             /join                   /create-microsite
/sitemap.xml            /robots.txt
```

Plus a sample of dynamic routes pulled from the DB:
- Top 10 `author_profiles.author_slug` (listed/verified/featured) → `/:authorSlug`
- Their primary book → `/:authorSlug/:bookSlug`
- Common microsite slugs per author → `/:authorSlug/free-gift`, `/order`, `/coaching`, `/audiobook`, `/online-course`

Anything returning ≠200 (excluding intentional redirects to 200) lands in the report.

### 3. Browser smoke test (key clickable surfaces)
Use the headless browser to load 4 critical pages and verify primary CTAs render and are clickable (not disabled, not zero-size, have a handler). One screenshot per page saved for visual confirmation.

- `/` — Hero CTA, "Browse directory", Navbar links, Footer links
- `/directory` — first author card click
- `/pauline-teo` — Hero "Get the book" / lead-magnet CTA, About section, footer
- `/dashboard` (will hit auth — recorded as "auth gate" rather than failure)

### 4. Edge-function health snapshot
Pull the last 24h of error logs from the 6 most-trafficked edge functions (`get-microsite-page`, `verify-purchase`, `process-purchase`, `create-checkout-session`, `save-author-profile`, `admin-data`) and summarize error counts. Surfaces silent backend failures that make buttons "look broken" to users.

## Deliverables

- `/mnt/documents/link-audit-report.md` — categorized findings with file:line citations and suggested fixes
- `/mnt/documents/link-audit-http-results.csv` — every URL probed + status code + redirect chain
- `/mnt/documents/link-audit-screenshots/` — 4 PNGs from the browser smoke test

Each finding will be tagged **High / Medium / Low** so you can hand the High items straight to the next sprint without re-triaging.

## What this will NOT do

- No code changes, no DB writes, no destructive actions.
- Won't click "Buy Now" or any payment/refund/destructive button.
- Won't log in as a user — `/dashboard`, `/admin`, `/account-settings` are reported as "auth-gated, not tested" rather than failures.
- Won't catch logic bugs inside button handlers (e.g. a button that runs but does the wrong thing) — only that the handler exists and the link target resolves.

## Approval to proceed

Approving this plan switches me to build mode and I'll run all four passes in one go (~3–5 min) and post the report paths back here.
