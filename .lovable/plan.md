## Sprint 4 — Marketing Funnel Activation Fixes

Five surgical fixes. No bundling of medium/low items.

---

### BUG 1 — "Get the Full Experience" missing on book detail page

**Root cause:** Sprint 3C added the products section to `src/pages/DynamicBookMicrosite.tsx`, but the live route `/pauline-teo/[book-slug]` is served by `src/pages/AuthorBookPage.tsx` (resolved via `AuthorSubpageResolver`). The Sprint 3C code never renders.

**Verification:** Pauline has 22 `author_nodes` rows with `status='live'` linked to her book (Workbook $2.99, Audiobook $14.99, Coaching $2997, etc.). RLS allows anon read of `live` nodes.

**Fix (in `AuthorBookPage.tsx`):**
- Add a new state `liveBuyableNodes` next to existing `products`.
- In `loadProductsAndOtherBooks`, fetch all `author_nodes` for this author + this book where `status='live'` AND `price_usd IS NOT NULL AND price_usd > 0`, selecting `id, node_id, node_name, personalised_name, price_usd, currency, delivery_url`.
- Add a new "Get the Full Experience" panel below the book description (above SECTION 4 "GO DEEPER") that renders these nodes as compact cards with `<BuyNowButton authorNodeId={...} authorId={book.author_id} fallbackUrl={...} />`.
- Hide the panel only when there are zero buyable nodes.

---

### BUG 2 — "Activate All" button not prominent enough

**Status:** The button + handler already exist in `SequencesTab.tsx` (top-right of header). User reports it isn't visible — most likely because it sits subtly to the right of the "Generate sequences" button, or because `senderVerified === false` makes it look greyed out.

**Fix (in `src/components/dashboard/marketing-hub/SequencesTab.tsx`):**
- Promote the "Activate all (N)" button into the amber `DraftBanner` as the primary CTA on the right side of that banner (large, gold/primary color, full visibility).
- Keep a smaller mirror in the header for users who scrolled past the banner.
- When `senderVerified === false`, keep the button enabled but show inline helper "Verify sender email first → Settings tab" and route the click to a toast (already implemented). Add a small "Verify now" link in the banner pointing to the Settings tab.

---

### BUG 3 — Publish gating on FunnelsHub card dropdown

**Root cause:** `NodeFunnelFlow` already gates publish properly via `isComplete` (missing stages → button disabled with tooltip). However, `FunnelsHub.tsx` exposes a separate "Go Live" entry in each card's dropdown (`toggleStatus`) that calls `setFunnelStatus` with no stage check, bypassing the gate.

**Fix (in `src/components/dashboard/FunnelsHub.tsx`):**
- For each funnel card, compute `stages` using `getStagesForArchetype(archetype, funnel, overrides, …)` from `@/lib/funnel-flow-stages` (need to also load `funnel_overrides` per funnel — add a single batched fetch alongside `loadFunnels`).
- Compute `isComplete = stages.every(s => s.status !== 'missing')`.
- In the dropdown: when `funnel.status !== 'live'`, render the "Go Live" item with `disabled={!isComplete}` and wrap in a Tooltip "Complete all required steps to publish."
- Also disable the dropdown's "Go Live" with `cursor-not-allowed` styling.

---

### BUG 4 — Checkout step editor is blank/unguided

**Fix (in `src/lib/funnel-flow-stages.ts` + `StageEditorDrawer.tsx`):**
- In `funnel-flow-stages.ts` checkout stage, change the `redirect_url` field's `baseValue` to default to `/${authorSlug}/thank-you` when no `cta_url` is set. Pass `authorSlug` through `getStagesForArchetype` (extend the options arg) — `NodeFunnelFlow` already has `authorSlug` available.
- Update `FIELD_HINT.redirect_url` in `StageEditorDrawer.tsx` to: *"This is where buyers land after payment. Your thank-you page is pre-set — only change if you have a custom page."*
- The drawer already shows the field's `baseValue` as placeholder — confirm placeholder uses `field.baseValue` so the auto-default is visible.

---

### BUG 5 — Contact source = "Unknown"

**Root cause:** `submit-funnel/index.ts` writes `crm_contacts.source = 'funnel'` (generic). The CRM contact panel reads this raw value and shows "Unknown" because nothing matches its known source labels.

**Fix (in `supabase/functions/submit-funnel/index.ts`):**
- After loading the funnel record, also select `title` from the `funnels` table.
- Build `sourceLabel = funnel.title ? `${funnel.title} — ${funnel.node_id || 'funnel'}` : 'funnel'` (e.g. `"SUCKCESS Stage Quiz — BP-02"`).
- Use `sourceLabel` when inserting into `leads.source`, `crm_contacts.source`, and `crm_contact_tags.tag` (sanitized).
- Also store `metadata.funnel_id` and `metadata.funnel_title` on `crm_contacts` (extend select to include `metadata` column) so the contact detail panel can render a clickable link back to the source funnel.
- In the CRM contact detail panel (`src/components/crm/ContactDetailPanel.tsx`), display the raw `source` string verbatim if it doesn't match a known label, instead of falling back to "Unknown".

---

### Files touched
- `src/pages/AuthorBookPage.tsx` (BUG 1)
- `src/components/dashboard/marketing-hub/SequencesTab.tsx` (BUG 2)
- `src/components/dashboard/FunnelsHub.tsx` (BUG 3)
- `src/lib/funnel-flow-stages.ts`, `src/components/dashboard/builders/shared/StageEditorDrawer.tsx` (BUG 4)
- `supabase/functions/submit-funnel/index.ts`, `src/components/crm/ContactDetailPanel.tsx` (BUG 5)

No DB migrations required. No new edge functions. No new secrets.