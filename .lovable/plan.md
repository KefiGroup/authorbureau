

## Goal

1. **Part 1 (approved)** — Add 4-option Export Course Package (Copy / TXT / DOCX / PDF) to BA-10…BA-18 Step 3, above "Publish to My Site".
2. **Part 2 (revised)** — Build a "Work With Me" storefront on the public author page that shows live BA nodes, always displays price prominently, and never shows a dead Enroll button to readers when Stripe isn't connected.

---

## Part 1 — Export Course Package (BA-10 → BA-18)

### New shared module: `src/lib/builder-export.ts`
Single source of truth for all four formats. Exports:
- `buildExportText(content, opts)` → plain text (Copy + TXT)
- `downloadAsTxt(content, opts)`
- `downloadAsDocx(content, opts)` — uses `docx`
- `downloadAsPdf(content, opts)` — wraps existing `downloadBuilderPackage`
- `copyToClipboard(content, opts)` — `navigator.clipboard` + sonner toast

Walks `content` via a small shared `walkContent` helper extracted from `builder-pdf.ts` so all formats produce identical structure: title, subtitle, tagline, transformation promise, who it's for, what you'll get, all 6 modules (with Bloom level, Kolb stage, objectives, lessons), pricing + rationale, sales copy, author/book attribution.

### New shared component: `src/components/dashboard/builders/shared/ExportPackageCard.tsx`
Renders a single card titled "Export Course Package" with four buttons (Copy, TXT, DOCX, PDF) and short guidance text. Replaces the lone download button on Step 3.

### Wire-in
- Edit BA10Builder → BA18Builder (Step 3 review only): replace `<BANodeDownloadCard />` with `<ExportPackageCard />`, positioned **below** the review tabs and **above** the "Publish to My Site" button. Pass `nodeName` per node.
- `BANodeDownloadCard.tsx` becomes a thin re-export of `ExportPackageCard` for backward compat.

### Deps
Add `docx`. `jspdf` already present.

---

## Part 2 — "Work With Me" storefront (revised per feedback)

### Data
Query `author_nodes` where `author_id = author.id` AND `status = 'live'`, ordered by category (BA → YR → BP) then `node_id`. Section is hidden entirely if zero live nodes.

For each card, derive:
- **Title** — from `content_json` (course title, package name, etc.) or `personalised_name`
- **Tagline / one-line description** — from `content_json` subtitle/tagline
- **Price** — from `author_nodes.price_usd` + `currency`
- **Category badge** — derived from `node_id` (Course, Coaching, Workshop, Membership…)
- **Author Stripe state** — read once for the page from `author_profiles.stripe_connected_account_id` (or `stripe_account_id`) AND `stripe_onboarding_complete`
- **Owner-viewing flag** — true if logged-in user matches `author.user_id`

### Price display rule (mandatory)
Price is **always shown prominently** on every card, regardless of Stripe state.
- If `price_usd > 0` → render formatted price (e.g. "$197 USD") in a large, high-contrast badge at the top of the card body
- If `price_usd` is null/0 → render "Pricing on request" in the same slot (still prominent — never hidden)

### CTA logic (per card)
Three branches, evaluated in this exact order:

1. **Stripe connected** (`stripe_connected_account_id` present AND `stripe_onboarding_complete = true`) AND `price_usd > 0`
   → Render `<BuyNowButton authorNodeId={node.id} authorId={author.id} label="Enroll Now" />`
   → Existing commerce engine handles checkout via `create-checkout-session`

2. **Stripe NOT connected** (or onboarding incomplete)
   - **Reader view** (not the owner): Render greyed-out, disabled-looking **"Contact"** button → `mailto:` author's public email if available, otherwise opens existing contact form / hides if no contact path
   - **Owner view** (logged-in author viewing own page): Render greyed-out **"Payments not set up"** label (non-clickable visual chip) with a small inline link "Set up payments" → `/account-settings?tab=connections`
   - Readers must NEVER see a dead "Enroll Now" button

3. **Stripe connected but `price_usd` missing/0**
   → Render "Contact" button (mailto) for readers, "Set price" inline link for owner

### Component structure
- New: `src/components/public/AuthorWorkWithMe.tsx`
  - Fetches `author_nodes` (live) + reads author Stripe fields already loaded by parent
  - Determines `isOwnerViewing` via `useAuth` + `author.user_id`
  - Hides section if zero live nodes
  - Renders heading "Work With Me" + subhead "Programs and resources from {AuthorName}"
  - Responsive grid: 1 / 2 / 3 cols (mobile / tablet / desktop)
  - Reader-side teal accent (per audience-split rule)

- New: `src/components/public/AuthorProductCard.tsx`
  - Props: `node`, `author`, `stripeReady: boolean`, `isOwnerViewing: boolean`
  - Always renders: category badge, title, tagline, **prominent price**, CTA per branch above
  - Imports existing `<BuyNowButton>` for branch 1
  - Greyed states use `disabled` + muted styling, never call checkout

### Mount point
Edit the public author page renderer (located during implementation — likely `src/pages/AuthorPublicPage.tsx` or `/:authorSlug` route) to mount `<AuthorWorkWithMe author={author} />` **after** the book + book highlights block and **before** reader testimonials.

### Data / RLS
- `author_nodes` already has the public-read policy for `status = 'live'` under Commerce Engine v1. If absent, add a small read-only migration. No PII exposed.
- `author_profiles.stripe_connected_account_id` and `stripe_onboarding_complete` are already publicly readable via the existing public author profile fetch — no schema change.

### What NOT to change
- No change to `publishNodeToSite`
- No change to `BuyNowButton`, `create-checkout-session`, or webhooks
- No change to microsite URLs or slug map
- No change to `paulinet77@gmail.com` or any auth records

---

## Verification

**Part 1 (each builder BA-10 → BA-18):**
1. Reach Step 3, see "Export Course Package" with 4 buttons above "Publish to My Site"
2. Copy → toast confirms; pasted text contains all sections
3. TXT downloads `[Title]-Course-Package.txt`
4. DOCX opens cleanly with headings + modules + lessons
5. PDF matches existing branded export
6. All 4 formats contain identical content in identical order

**Part 2:**
1. Pauline publishes BA-10 → status `live`
2. Visit `/pauline-teo` (incognito reader)
   - "Work With Me" section appears
   - Price "$XXX USD" shown prominently on the card
   - If Stripe connected → "Enroll Now" button → Stripe Checkout
   - If Stripe NOT connected → greyed "Contact" button → mailto (NOT a dead Enroll button)
3. Pauline visits `/pauline-teo` while logged in as the author
   - Same card, same prominent price
   - If Stripe NOT connected → "Payments not set up" greyed chip + "Set up payments" link to `/account-settings?tab=connections`
4. Author with zero live nodes → section hidden entirely
5. Publish additional BA/YR nodes → cards appear automatically with no code change

---

## Out of scope (for later)
- Per-card analytics
- Reordering / featuring nodes from the dashboard
- Reader-facing category filters
- Inline Stripe Connect onboarding from the storefront card

