## What the audit actually found

The Sprint 6 fixes I shipped touched `CourseSalesPage.tsx` and `MembershipSalesPage.tsx`. **Those pages are never reached by readers.** Pauline's URLs `/pauline-teo/online-course` and `/pauline-teo/membership` resolve through `AuthorSubpageResolver` → `MicrositePage.tsx`. That's why she still sees "Notify Me" and "Coming Soon" even though the database now says `live`.

So the real fixes live in **MicrositePage**, **get-microsite-page**, the **My Books built-counter**, and the **Stripe banner gate**. Here's the plan node-by-node and finding-by-finding.

---

## Fixes by audit finding

### BA-10 Online Course — "Notify Me" instead of Enrol Now
`MicrositePage.tsx` line 2647 only renders an Enrol button when `paymentLink` (an external URL) exists; otherwise it falls through to the "Notify Me" form. Our Commerce Engine v1 doesn't use external links — checkout flows through `BuyNowButton` → `create-checkout-session`.

**Fix**: in the BA-10 branch of `MicrositePage`, render `<BuyNowButton authorNodeId={node.id} priceUsd={node.price_usd} ... />` whenever the node is live and has a `price_usd`. Keep the "Notify Me" form only as a fallback for nodes with no price.

### BA-12 Membership — "Coming Soon" with no benefits/price
The generic purchase branch (line 2442–2451) has the same `hasPaymentLink` gate. Same fix: route BA-12 through `<BuyNowButton mode="subscription" ...>` so readers see the membership name, monthly price, benefits, and a working Join Now button. Also surface `membership_content` benefits on this microsite view (currently only `MembershipSalesPage` reads them).

### BA-14 Podcast / BA-15 Press — 404 "Hmm, I can't find that page"
`get-microsite-page` (line 62) does `ilike("microsite_url", %slug%)`, but the column that holds the public URL is `delivery_url`, not `microsite_url`. The lookup misses, returns 404, and `AuthorSubpageResolver` falls through to `AuthorBookPage`'s not-found state.

**Fix**: in `get-microsite-page`, resolve slug → node by mapping `micrositeSlug` through `NODE_SLUG_MAP` (server-side copy) instead of LIKE-searching a URL column. Then load the row by `(author_id, node_id)`. This is deterministic and covers every node.

Also: BA-14 (podcast) and BA-15 (press) are *outbound* nodes — there's no purchase. `MicrositePage` already has an `actionType === "optin" / "enquiry"` branch; ensure these node IDs are mapped to the right action so readers see a "Book Pauline on your podcast" enquiry form (BA-14) and a "Press inquiry" form (BA-15), not a Buy button.

### BA-11 Audiobook — "No manuscript found"
The Audiobook Studio queries `generated_assets` filtered by a `book_id` query param. Both books *do* have `source_material` rows; the symptom appears when the studio is opened without a `?bookId=...` in the URL (the book-hub Build tab passes it; an old bookmark or the dashboard nav doesn't).

**Fixes**:
- In `AudiobookStudio`, when `bookId` is missing, call `get-author-book` to fetch the user's most-recent book and use its id (consistent with the Book Ownership Lookup standard).
- Improve the empty-state copy to say "Open this audiobook from your Book Hub Build tab" instead of "Upload Manuscript Now", and link directly back to the book hub.
- Remove the false "Live" badge: `BA-11` shows Live in the Build tab because the `author_nodes.status` was flipped on a prior test before chapters existed. Tighten the Build-tab badge so BA-11 only displays "Live" when the node's `delivery_url` points at an `audiobook-audio` storage object **and** at least one chapter MP3 row exists. (The publish function `ba11-publish-audiobook` already enforces this going forward; we just need the badge to honour the same rule.)

### BA-13 Group Coaching — publish spinner hangs > 2 min
The publish call ran past the 60s edge-function timeout but the UI never received a result. Pauline's row in the DB is `content_ready` not `live`, confirming the publish silently failed.

**Fixes**:
- Wrap the BA-13 publish call in `fetchWithTimeout` (90s) with a clear failure toast: "Publishing took too long. ABBY saved your draft — try Publish again."
- Ensure the publish function returns within timeout: it currently regenerates content as part of publish; split it so generation finishes at Step 3 (Review) and Step 4 (Activate) only updates `status='live'` + `delivery_url`. That call should complete in <2s.
- After successful publish, refetch the node so the badge updates without a manual reload.

---

## Systemic findings

### S-1 / S-3 — Conflicting & resetting "built" counters
`My Books Hub` shows "2 of 56" while a single book hub shows "28 of 28". They use different definitions. Pick one rule and apply it everywhere:

**Built = author_nodes row exists with status in (`content_ready`, `live`, `published_pending_ghl`) for that book.**

- Update `useAuthorStats` / `useBookNodeProgress` to share one selector.
- The dashboard's brief "0 of 28" flash after publish is just the loader rendering before the query resolves. Add a `previousData`-style fallback (keep last value while refetching) so the counter never visibly drops to zero during a refetch.

### S-2 — False "Live" badges
The Build tab marks any node whose `author_nodes.status='live'` as Live, even when downstream artifacts (course modules, audiobook chapters, microsite payload) are missing. Add a per-node `isPubliclyLive(node)` helper that checks the matching downstream readiness:
- BA-10: linked `courses` row with `status='live'` and ≥1 module
- BA-11: ≥1 row in `audiobook_chapters` with non-empty `audio_url`
- BA-12: linked `membership_content` row with `status='live'`
- BA-13: `content_json.activated === true` AND `delivery_url` non-null
- BA-14 / BA-15: `delivery_url` non-null AND microsite resolves (we'll get this for free once the resolver fix lands)

The Build tab badge calls this helper. The DB status is the source of truth for the publish action; the badge is the source of truth for what a reader sees.

### S-4 — "Connect Stripe" banner persists after connecting
The banner reads `author_profiles.stripe_account_id` but doesn't check `stripe_charges_enabled`. Once the connection is active the flag is set but the banner doesn't re-evaluate. Replace the gate with `stripe_charges_enabled === true` and add a `queryClient.invalidateQueries(["author-profile"])` call to the Stripe OAuth callback page.

### S-5 — All 28 URLs return HTTP 200 but content varies
This is correct SPA behaviour (the React shell renders 200 then mounts the resolver), so it isn't a bug per se. The audit's underlying concern — readers seeing a working URL that has no real content — is fully covered by the BA-10/12/14/15 fixes above.

---

## Implementation order

1. **`supabase/functions/get-microsite-page/index.ts`** — replace LIKE lookup with deterministic slug→node map. Unblocks BA-14/15 in one edit.
2. **`src/pages/MicrositePage.tsx`** — replace `paymentLink`-gated buttons with `<BuyNowButton>` for BA-10 and BA-12 branches; wire BA-14/15 to enquiry form.
3. **`src/components/dashboard/.../BuildTab` (or wherever the badge lives)** — add `isPubliclyLive()` helper and use it for the Live badge.
4. **`src/components/AudiobookStudio.tsx`** — fallback to `get-author-book` when no `bookId`; improve empty state.
5. **BA-13 publish** — split content generation from status flip; add 90s `fetchWithTimeout` and toast.
6. **Built-counter unification** — single hook, keep-previous-data on refetch.
7. **Stripe banner** — gate on `stripe_charges_enabled`; invalidate on OAuth callback.

## Files I'll touch
- `supabase/functions/get-microsite-page/index.ts`
- `src/pages/MicrositePage.tsx`
- `src/components/AudiobookStudio.tsx` (or actual file path once located)
- `src/components/dashboard/...` Build tab badge component
- `src/hooks/useAuthorStats.ts`, `src/hooks/useBookNodeProgress.ts`
- BA-13 publish edge function
- Stripe banner component + OAuth callback page

## What I will NOT touch
- The `courses` / `membership_content` schema (FK constraints are correct as-is)
- `CourseSalesPage` / `MembershipSalesPage` — these become alternative direct-link pages; the primary reader path is now MicrositePage
- The Sprint 6 cascade-publish in `save-author-node` — it stays; the audit symptoms came from the wrong renderer, not the wrong DB state

## Verification
After implementation I will hit `/pauline-teo/online-course`, `/pauline-teo/membership`, `/pauline-teo/podcast`, `/pauline-teo/press` via `browser--navigate_to_sandbox` and screenshot each to confirm the buy/enquiry buttons render. I will also run `supabase--curl_edge_functions` against `get-microsite-page?author=pauline-teo&slug=podcast` to confirm 200 responses.

---

## Sprint 7 — Deferred items resolution (Apr 29, 2026)

| Finding | Resolution |
| --- | --- |
| BA-11 missing-bookId fallback | `AuthorDashboard` now redirects `?section=audiobook-studio` without `bookId` to `/my-books` (book picker). Empty-state copy updated to "Open Book Hub" + "Upload Manuscript Here". |
| BA-11 false "Live" badge | Already enforced server-side: `ba11-publish-audiobook` will not flip status to `live` unless ≥1 chapter MP3 exists in `audiobook-audio/{userId}/{bookId}/`. No client change needed. |
| BA-13 publish split | Already split — `generate-ba13-group-coaching` writes content_ready; `save-author-node:publish` flips status (no Stripe/GHL cascade). Tight DB update completes in <2s. No change needed. |
| Built-counter flash to 0 | `useAuthorStats` and `useBookNodeProgress` now keep previous data during refetch (no `setLoading(true)` after first load). Counter never visibly drops. |
| Stripe banner accuracy | `StripeConnectBanner` is already a no-op (Sprint 41 — Authors Bureau is Merchant of Record). No banner to gate. |

