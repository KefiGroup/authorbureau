

## Sprint 37 — 5 Critical Fixes Plan

I traced every issue to a concrete root cause. Here is the minimal change set.

---

### Fix 1 — Leads not flowing to CRM (CRITICAL)

**Root cause:** The quiz at `/[slug]/free-gift` is rendered by `MicrositePage` which submits to the **`microsite-action`** edge function (NOT the new `submit-quiz-response` we deployed). Inside `microsite-action` (line 214-222) the `leads` insert uses:
- `author_id: authorUserId` — the **auth user_id**, but `FunnelsHub`, `RevenueDashboard`, and the CRM all query `leads.author_id = author_profiles.id`. Mismatch → leads exist in DB but never visible.
- No `abby_score`, no `stage`, no row in `lead_activities` (only `crm_activity_log`).

**Fix:**
1. In `microsite-action/index.ts`, change the leads insert to use `author_id: author_id` (the profile id passed from the client) instead of `authorUserId`. Add `abby_score: 10`, `stage: "new"`, `nurture_stage: "welcome"`, `last_activity_at`.
2. Also write to `lead_activities` (`activity_type: "quiz_completed"`, `metadata: { quiz_stage, quiz_score }`) — this is the table `RevenueDashboard` and CRM widgets read from.
3. Wrap quiz email send in its own try/catch so a Resend failure never throws before lead insert (already mostly true — just confirm ordering: lead insert must happen BEFORE the email block).

---

### Fix 2 — `/[slug]/thank-you` returns 404

**Root cause:** `AuthorSubpageResolver` only resolves: known node slugs, dynamic microsite nodes, or live funnels with matching slug. "thank-you" matches none → falls through to `AuthorBookPage` which 404s.

**Fix:**
1. Create `src/pages/ThankYouPage.tsx` (public, no auth). Loads author by `authorSlug` param + their primary book. Shows:
   - Headline: "You're in! Check your inbox 📬"
   - Subheadline as specified
   - Primary CTA: "Get the Book on Amazon →" → `books.amazon_url` (the column exists)
   - Optional calendar section if `author_profiles.calendar_url` exists (column may not exist — gracefully hide)
   - Footer: `© [Pen Name] | Powered by Authors Bureau`
2. Add a special case in `AuthorSubpageResolver`: if `bookSlug === "thank-you"` → render `<ThankYouPage />`.
3. After successful submit in `MicrositePage` LeadMagnetPage `results` stage, replace inline message with `window.location.href = "/${authorSlug}/thank-you"` (keep it for BP-02 only so other nodes are unaffected).

---

### Fix 3 — My Funnels shows "No funnels yet" despite BP-02 Live

**Root cause:** Pauline Teo has `author_nodes` BP-02 = "live" but **zero rows in `funnels`**. The BP-02 Builder calls `deploy-bp02-to-ghl`, never `bp02-activate-funnel` (which would create the funnel row). So `FunnelsHub.loadFunnels()` returns empty.

**Fix:**
1. In `BP02Builder.tsx` activation flow, after the existing `deploy-bp02-to-ghl` call succeeds, also invoke `bp02-activate-funnel` (already deployed in Pass 1) to write the `funnels` row. Non-fatal if it fails.
2. Update `bp02-activate-funnel` to be idempotent: if a funnel for `(author_id, node_id='BP-02')` already exists, update it instead of inserting; ensure `slug='free-gift'`, `status='live'`, `cta_url='/[slug]/thank-you'`.
3. **Backfill once**: a one-shot migration that inserts a funnel row for every author who has `author_nodes.node_id='BP-02' AND status='live'` but no matching `funnels` row. Uses content from `author_nodes.content_json` for headline/copy where available, falls back to the book title.
4. `FunnelsHub` already renders the cards correctly with stats — no UI change needed beyond what's already there.

---

### Fix 4 — Revenue Dashboard "Could not load dashboard data"

**Root cause:** This message comes from `ABBYFrameworkDashboard.tsx` (line 135), which is rendered for the dashboard root, not `RevenueDashboard.tsx`. The `loadDashboard()` `try` block fetches several edge functions (`dashboard-state`, `list-my-books`) — if ANY one rejects (e.g. AbortError, 500), the whole dashboard renders the error card with a Retry button.

**Fix:**
1. In `ABBYFrameworkDashboard.tsx`, soft-fail per-call: wrap each `fetchWithTimeout` in its own try/catch and use safe defaults (0 books, empty plan) instead of throwing out of the parent. Only show the error card when ALL three calls fail.
2. Increase the per-call timeout to 15s and remove the abort throw on partial success.
3. `RevenueDashboard.tsx` — already correct (graceful zero state) — no change.

---

### Fix 5 — Review & Publish infinite loading

**Root cause:** `ReviewProductsPage.fetchDrafts` calls `builder-draft-state` with `action: "list-drafts"`. If that function is slow or returns 500, the `setLoading(false)` is in the catch path BUT only after the `await resp.json()` resolves. If the function never responds (no timeout), spinner shows forever.

**Fix:**
1. Use `fetchWithTimeout` with an 8-second timeout (already imported).
2. On timeout or error, set `products = []` and stop the spinner so the empty state renders ("Nothing published yet — go to Brand Products to build your first product").
3. Add a 3-second visual fallback: if `loading` is still true after 3s, render the empty state with a small "still loading…" hint instead of a bare spinner.

---

### Files to change
- `supabase/functions/microsite-action/index.ts` — Fix 1 (leads insert + lead_activities)
- `supabase/functions/bp02-activate-funnel/index.ts` — Fix 3 (idempotent upsert, correct cta_url)
- `supabase/migrations/<new>.sql` — Fix 3 backfill
- `src/pages/ThankYouPage.tsx` — NEW (Fix 2)
- `src/pages/AuthorSubpageResolver.tsx` — Fix 2 (thank-you special-case)
- `src/pages/MicrositePage.tsx` — Fix 2 (redirect after BP-02 submit)
- `src/components/dashboard/builders/bp02/BP02Builder.tsx` — Fix 3 (also invoke `bp02-activate-funnel`)
- `src/components/dashboard/ABBYFrameworkDashboard.tsx` — Fix 4 (soft-fail)
- `src/components/dashboard/ReviewProductsPage.tsx` — Fix 5 (timeout + empty fallback)

### Quality audit (run after deploy)
1. Submit quiz at `/pauline-teo/free-gift` → `leads` row appears with `author_id = 92326a2f-…` and `abby_score = 10`; visible in My CRM.
2. After submit, browser lands on `/pauline-teo/thank-you` (200, not 404) with Amazon CTA.
3. My Funnels lists Pauline's BP-02 funnel with opt-in + thank-you URLs.
4. Revenue Dashboard renders zero-state cards (no error card, no Retry).
5. Review & Publish shows products or empty state within 3s.
6. No console errors on any page.

