# Bug Triage — BUG-10 to BUG-13

I checked the code paths and database for each report. Results below, then a minimal fix plan.

---

## BUG-10 — Book page missing all products → CONFIRMED (real bug)

`/pauline-teo/be-suckcessful` resolves via `AuthorSubpageResolver` → `AuthorBookPage.tsx`.

DB state for Pauline's book `e5b857ac…`: **27 of 28 nodes are live** (incl. BA-11 audiobook, BP-06 workbook $0, BP-07 home study $47, BA-10 $497, BA-12 $17, plus YR-19–28 work-with). RLS allows public read of `status='live'` nodes.

`AuthorBookPage` already has the three reader buckets (Sprint 66) at lines 810–933:
- `formatNodes` = BA-11 / BP-06 / BP-07
- `courseNodes` = BA-10 / BA-12
- `workNodes`  = YR-19 / BA-13 / YR-20–24 / YR-26 / YR-27

But `buyableNodes` is only fetched **inside the `if (profile?.id)` branch** at line 449, which is the *second* author-lookup branch in `loadBookData()`. There is an earlier branch (when only `bookData.author_id` resolves and no profile is found by slug) that returns before setting `buyableNodes`, so `buyableNodes` stays `[]` and the entire Section 3 block is skipped — leaving only the hero's Kindle/Paperback/Hardcover row and the Amazon CTA visible. That matches exactly what the user is seeing.

**Fix**: hoist the `buyableNodes` fetch so it always runs once we have an `author_profile.id` — either by using `bookData.author_id` directly (it already references `author_profiles.id`) or by ensuring `profile` is set from both lookup paths before the Promise.all.

---

## BUG-11 — Revenue Dashboard "0 Total Contacts" vs CRM "35" → CONFIRMED (real bug)

DB: 35 `crm_contacts` rows for `author_id = ef23c521…` (user.id). RLS: `auth.uid() = author_id` ✓.

`RevenueFullDashboard.tsx` line 142 queries:
```
.from("crm_contacts").select("id", { count: "exact", head: true }).eq("author_id", user.id)
```
This is correct and should return 35. But line 376 then sets:
```
subscribers: contactsCount, // direct count — no GHL dependency
```
…and line 384 immediately starts a background `sync-stripe-metrics` call that on success **overwrites** `revenueMtd` but not contacts. So contacts shouldn't drop to 0.

The actual culprit: this page renders **before** `useAuth` finishes restoring the session. The first effect bails on `if (!user) return;`, but the snapshot subscription/initial render of `MetricCard` shows `metrics.contacts = 0` (the initial state) and there's no loading skeleton on that card. When the user lands directly on `/revenue`, `user` is briefly null → query never runs → card sticks at 0 because the effect's dependency array (`[user]`) only re-runs once but the state setter call may be inside a `cancelled` guard race. Per memory `auth-session-restoration-pattern`, the page should gate on `useAuthReady`, which it doesn't.

**Fix**: gate the initial fetch on `useAuthReady()` and show a loading state on the metric cards until `contactsCount` resolves, OR add a `subscription_tier`-style realtime refetch on auth changes.

---

## BUG-12 — "First $1,000 — Achieved ✓" with $0 revenue → CONFIRMED (real bug)

`RevenueFullDashboard.tsx` lines 371–376:
```
revenue_mtd: metrics.revenueMtd,
revenue_ytd: snapshots.length > 0
  ? Number(snapshots[snapshots.length - 1]?.stripe_revenue_ytd_usd || 0)
  : metrics.revenueMtd,
```

DB: `purchases` table has **0 rows** for this author; `stripe_connected_account_id` is set but `purchases` is empty and no Stripe-revenue snapshot has been written. So both should be 0.

Milestone check at line 647: `const achieved = current >= ms.target;` — with target `1000` and current `0`, this is `false`. So "Achieved ✓" should never display unless `metrics.revenueMtd` was somehow inflated.

Likely cause: the background `sync-stripe-metrics` call returns a stale/cached `stripe_revenue_mtd_usd` value (possibly from test-mode data or from another author's snapshot via wrong author_id resolution). Line 217 then runs `Math.max(m.revenueMtd, stripe.data.stripe_revenue_mtd_usd)` — so any non-zero value sticks. There is no validation that the figure is for this author/book.

**Fix**: (a) verify `sync-stripe-metrics` scopes by the calling author's `stripe_connected_account_id` (not just author_id row lookup), and (b) only count a milestone as Achieved when `current > 0 AND current >= target`, so an under-target value of `0` can never trip the rule even if floating-point/NaN weirdness happens.

---

## BUG-13 — "Subscribe for Updates" button does nothing → PARTIALLY CONFIRMED

There is **no button labeled "Subscribe for Updates"** in the codebase. The closest matches are:
- `AuthorBookPage` line 759: **"Get Updates"** → scrolls to `#book-subscribe`. That target exists at line 1078. Working.
- `AuthorHeroSection` line 172: **"Get the Free Starter Kit"** → scrolls to `#subscribe-section`. Target exists in `AuthorSubscribeSection`. Working.

Need clarification on **which page** the user clicked — author profile (`/pauline-teo`) or book page (`/pauline-teo/be-suckcessful`)? Either way, the scroll target IDs exist. Possible real cause: if the section is conditionally hidden (e.g. `AuthorSubscribeSection` returns null when there is no email-capture configured for the author), the scroll target won't exist and clicking does nothing. Quick check needed.

**Fix**: confirm which CTA, then either (a) ensure target section always renders an anchor even when hidden, or (b) change the button to open a modal subscribe form so it works regardless of section visibility.

---

## Proposed implementation order (smallest blast radius first)

1. **BUG-10** — hoist `buyableNodes` fetch in `AuthorBookPage.tsx` so it runs whenever we have `author_profile.id`.
2. **BUG-12** — tighten milestone check to `current > 0 && current >= ms.target`, and verify `sync-stripe-metrics` author scoping.
3. **BUG-11** — gate `RevenueFullDashboard` initial fetch on `useAuthReady()` and add skeletons on metric cards.
4. **BUG-13** — confirm which button with the user; then ensure the subscribe section always renders an anchor or convert the CTA to a modal.

Out of scope for this plan: redesigning the dashboard hero/portfolio bar (already in flight from the prior turn), and any backend changes to `sync-stripe-metrics` beyond confirming its author scoping.
