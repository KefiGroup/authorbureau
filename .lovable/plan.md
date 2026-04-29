# Audit 1 — Author Onboarding Experience (8-Level QA)

## Objective

Verify a non-technical author can sign up, upload their book, and have ABBY build their entire business — without contacting support. Then fix every failure found.

## Test setup (locked)

- **Auth path under test:** local `/auth` email-password signup (the supported path on this preview). SSO from publishnow.io will be **spot-checked once** at the end with an existing account, since both entry points create unified accounts.
- **No Google auth.** Removed from every level.
- **Test email:** `audit+{timestamp}@…` alias on a domain I can read for verification.
- **Test manuscript:** the file you upload. I'll copy it once to a stable path and re-upload it for every fresh test account so results are comparable across runs.
- **Re-using the same book:** yes — same file, but each fresh signup creates its own `books` row + manuscript copy + `author_nodes`. The book is the input, not a shared record.

## Scope (the journey under test)

```text
/auth (email + password sign-up)
   ↓ email verification
/dashboard (NewUserOnboarding 3-step card)
   ↓ Step 1: profile  → Step 2: add book  → Step 3: "Build My Business"
/dashboard?section=manuscript (ManuscriptUpload — PDF/DOCX)
   ↓ parse-manuscript  → generate-bp00-analysis  → business-consultant
/dashboard?section=plan (Business Plan with all 28 nodes)
   ↓ open BP-01 Email Marketing
BP-01 builder → generate → publish → "Live ✓"
```

## Method — run all 8 levels against this exact journey

### Level 1 — Console / Network
Walk every page; capture console + network. Pass = zero red errors, zero 401/403/404/500 from our origin.

### Level 2 — Every interactive element
Click every CTA on `/auth` (Sign in, Sign up, Forgot password, tab switches — **no Google button expected**), every step button in NewUserOnboarding, every button on ManuscriptUpload (file picker, upload, "use published book" fallback), every button on the plan page + BP-01 builder (Generate, Save, Publish, Refresh). Pass = every button produces a visible result.

### Level 3 — Empty states
Brand-new user with no profile, no book → Step 1 highlighted. Profile only → Step 2. Book added, no analysis → Step 3 CTA. BP-01 with no content → AnalyseBookGate appears. Pass = no blank screens.

### Level 4 — Data flow (DB verification)
For each form, confirm the row lands in the correct table:
- Signup → `auth.users` + `profiles` (via `handle_new_user`)
- Profile save → `author_profiles` (slug auto-generated)
- Book add → `books` (owner_email, title, author_id linkage)
- Manuscript upload → `manuscripts` storage bucket + `books.manuscript_url`
- BP-00 → `generated_assets` (kind=`book_analysis`)
- Business plan → `generated_assets` (kind=`business_plan`) with **canonical** node labels (BA-15 Media & PR, YR-25 Certification, YR-27 Fundraising, YR-28 Sponsors, BA-18 JV Partnerships)
- BP-01 generate → `author_nodes` row, status transitions to `live`

### Level 5 — Mobile (375 × 812)
Re-walk the journey at 375px. Pass = no horizontal scroll, no clipped CTAs, ≥44px tap targets.

### Level 6 — Auth states
Incognito → `/dashboard` redirects to `/auth?redirect=/dashboard`. `/auth` loads cleanly. BP-01 builder route requires login. Pass = no protected page leaks.

### Level 7 — Error handling
Invalid email / weak password on signup → friendly inline error. Wrong file type on manuscript → friendly rejection. `parse-manuscript` with no file → graceful error. `generate-bp00-analysis` for a book with no manuscript → falls back to `parse-published-book` or shows clear message. AI gateway failure → toast with retry. Pass = no raw JSON, no blank screens.

### Level 8 — Navigation
Every page has ≥2 next actions. Browser back works. Pass = no dead ends.

## Specific issues I already suspect from the code

1. **gotrue lock timeouts** — console shows repeated `Lock "lock:authorsbureau-shared-auth" acquisition timed out after 2000ms`. Will check if it delays first dashboard render.
2. **Email verification UX** — confirm `Auth.tsx` sets `emailRedirectTo: window.location.origin` and that the post-verify landing is `/dashboard`, not `/`.
3. **NewUserOnboarding `hasBook` detection** — confirm it queries `books` by `owner_email` (not just `author_id`), since email-sync is in play.
4. **BP-00 → 28 nodes contract** — confirm `business-consultant` upserts an `author_nodes` row per node with status `ready`, otherwise the dashboard looks empty after analysis.
5. **Refresh button** (just added) — confirm it actually triggers regeneration end-to-end on a real plan.
6. **Placeholder leakage** — grep generated content for `[AUTHOR NAME]`, `undefined`, `{{`, `__BOOK__` after a real run.
7. **Canonical labels** — verify all 28 node labels in the freshly-generated business plan match `builderNodeConfig.ts` exactly.

## Fix policy

For each FAIL: file a task, fix in code or prompt, redeploy the affected edge function, re-test the failed level. Audit is **not** marked complete until every level reports PASS for the full journey on a fresh account.

## Final report format

```text
LEVEL 1 (Console/Network):  PASS | FAIL — <details>
LEVEL 2 (Buttons):          PASS | FAIL — <details>
LEVEL 3 (Empty States):     PASS | FAIL — <details>
LEVEL 4 (Data Flow):        PASS | FAIL — <details>
LEVEL 5 (Mobile 375px):     PASS | FAIL — <details>
LEVEL 6 (Auth States):      PASS | FAIL — <details>
LEVEL 7 (Error Handling):   PASS | FAIL — <details>
LEVEL 8 (Navigation):       PASS | FAIL — <details>
SSO spot-check:             PASS | FAIL — <details>
OVERALL:                    PASS | NEEDS FIXES

Failures found & fixed:
1. <symptom> → <root cause> → <fix> → <re-test result>
```

## What I need from you

Approve this plan and **drop your test manuscript file (PDF or DOCX) into the chat**. Once I have it, I'll:

1. Save the manuscript at `/tmp/audit-manuscript.{pdf,docx}` for reuse
2. Spin up the browser, sign up a fresh account, walk the full journey
3. Capture every Level 1–8 result with logs + screenshots + DB checks
4. Fix every FAIL inline (code + edge-function redeploys)
5. Re-walk the journey end-to-end on another fresh account to confirm
6. Spot-check SSO from publishnow.io once with an existing account
7. Deliver the final report
