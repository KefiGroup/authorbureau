# Live front-to-end audit of authorsbureau.com

Yes. The audit runs against the live production site (https://authorsbureau.com) in a real browser. It is look-only: nothing is published, regenerated, deleted, sent, posted or bought.

## Who it signs in as
- A signed-out visitor (homepage, directory, public author and book pages)
- Pauline, as the author, across her 3 books: Invest Like Buffett, Value Investing for Women, Be SUCKcessful
- The hidden test author and test reader (for the reader sign-up journey)
- Your admin account (admin portal)

## What gets checked
1. **Public site links:** the homepage, Solutions, Pricing, Methodology, Contact, the directory, and every author and book page. Every internal link and button gets followed. A pass means the page loads with no "Page not found", no blank page, no console errors, no prices on offers of $100 or more, and no emdashes.
2. **All live modules:** every module marked Live opens its canonical `/{author}/{book}/{module}` page. Each one shows the right book, with no "coming soon" or draft text.
3. **Checkout buttons:** Buy and Start buttons are clicked up to the point where the Stripe checkout page appears. No payment details are entered. "By application" offers have to open the enquiry form.
4. **Author dashboard:** every sidebar section and all 28 builder pages for each book. That includes My Library (downloads produce real files), Marketing Hub (Social Calendar, sequences, campaigns), My Funnels, CRM, Revenue, Account Settings and the tutorial videos. The selected book has to stay selected throughout.
5. **Social automatic posting (Pulse):** the channel panel loads and the Connect channels link opens. Nothing gets posted.
6. **Email:** the sign-in code and reset-code emails are sent and logged. The unsubscribe link works, using the test reader only.
7. **Reader journey:** a test reader signs up through a lead magnet and gets enrolled in the welcome sequence. The run then cleans up after itself.
8. **Admin portal:** Daily Audit, Errors, Authors and Books all load. The daily audit is run on demand.
9. **Backend health:** a check of recent server errors, failed function calls and failed emails from the last 7 days.

## If something fails
- I'll list each problem in plain language with a screenshot and the exact page.
- Anything that breaks the visitor or author flow gets fixed and checked in the preview. You publish, then I re-check only the failed items on the live site.
- Two things will be flagged but not changed: approved copy and anything that needs a real payment or a real social post.

## What you get
A pass/fail table grouped by area (public site, modules, dashboard per book, email, admin), with the failures listed first.

## Technical details
- Playwright (Chromium, headless) against https://authorsbureau.com with a `?cb=<timestamp>` cache-buster. Sessions are minted with `lovable auth-session` and restored through localStorage on the live origin.
- Crawler: same-origin link discovery from the sitemap plus the author pages. Each link is checked for an HTTP 200, a non-empty `#root`, no 404 copy, and console/page errors.
- Downloads are captured through `page.expect_download` and checked for valid PDF, DOCX, PPTX and ZIP headers.
- Backend: edge function logs, `system_error_log`, `email_send_log`, and the `daily-audit` plus `audit-test-fixture` journey run.
