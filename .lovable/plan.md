# Audit results + fix plan

I verified all 6 bugs against the codebase, edge functions, and live database. Findings + minimal fixes below.

---

## Bug 1 — "Go back to [Hub]" lands on /dashboard

**Confirmed.** The legacy routes `/brand-products`, `/build-authority`, `/yield-revenue` are still emitted by `PublishSuccessScreen.tsx` and a few builder back-buttons (BP-03, BP-04, BP-05). Those routes render `HubRedirect`, which calls `useBookContext()` to find the active book. When the user has no curated `author_context` row (or context resolution returns no bookId), `HubRedirect` falls back to `/dashboard`, which is what the user is seeing.

`NodeBuilder.tsx` already builds the correct `/book-hub/{bookId}?tab=…` link via `getHubPath`, but only when `?bookId=` is in the URL. The legacy routes strip that context.

**Fix:**
- In `PublishSuccessScreen.tsx` and the BP-03/BP-04/BP-05 back buttons, replace hard-coded `/brand-products` / `/build-authority` / `/yield-revenue` with `/book-hub/${bookId}?tab=revenue-streams|marketing-channels|authority-builders` when a bookId is available, and fall back to `/dashboard?section=my-books` otherwise.
- Update `HubRedirect` to also read `?bookId=` from the URL before falling back to `useBookContext`, so callers can hint the active book.

---

## Bug 2 — BA-14…BA-18 "Open & Manage" do nothing

**Confirmed via code.** `PortfolioStepView` calls `getStudioPath(n.id, …)` which looks up `NODE_TO_SECTION` in `src/config/abbyFrameworkConfig.ts`. The map is missing entries for `in-house-speaker` (BA-15), `affiliates` (BA-16), `upsells` (BA-17), and `revenue-sharing` (BA-18) → `getStudioPath` returns `null` → the click is a no-op. BA-14 (`podcast-guest`) IS mapped, but the resolved section "podcast" goes through `isSectionGated` (closed for non-superadmins until DB gating opens it).

**Fix:**
- Add direct `/node-builder/BA-15`, `/node-builder/BA-16`, `/node-builder/BA-17`, `/node-builder/BA-18` routing in `getStudioPath` so the user lands in the existing `BA15Builder`–`BA18Builder` regardless of `NODE_TO_SECTION`. (Each builder file already exists.)
- Same for BA-14: bypass the gated "podcast" section and route straight to `/node-builder/BA-14`.
- Keep the existing book/title query string (`?bookId=…&bookTitle=…`).

---

## Bug 3 — BA-13 publish hangs forever

**Partially fixed already.** Database confirms the prior fix landed: BA-13 row for Pauline Teo is `status = content_ready`, `current_step = 2`. Edge function logs show **no `save-author-node:publish` requests for BA-13** — meaning the click never reaches the network. Possible causes seen in `BA13Builder.tsx`:

1. `handlePublish` calls `publishNodeToSite(authorId!, "BA-13", authorSlug)` **without `bookId`**. The publish handler in `save-author-node` then matches by `(author_id, node_id)` only — fine for now, but fragile if multiple books exist.
2. `authorSlug` is fetched async; if the user clicks before `useEffect` resolves, `publishNodeToSite` runs with empty slug and computes a broken `microsite_url`.
3. The animated "Publishing your group coaching programme…" card is rendered when `isPublishing && !content?.activated`. If `publishNodeToSite` throws a network error that the toast doesn't surface clearly, the user can't tell.

**Fix:**
- Pass `bookId` through `publishNodeToSite(authorId, "BA-13", authorSlug, bookId)` in BA-13 (matches the signature already exported).
- Disable the Publish button until `authorSlug` is loaded, and show a small "Preparing…" state instead.
- In the publish `catch`, set `error` AND clear the animated spinner, plus log to console with the response status so the next "hang" report has actionable data.
- Keep the half-published recovery from the previous sprint — it works.

---

## Bug 4 — My Books shows 0/28 built

**Confirmed via DB.** For book `Be SUCKcessful` (`e5b857ac…`):
- `author_nodes`: 28 rows, **24 live**, 4 content_ready
- `generated_assets` with `asset_type LIKE 'builder_content_%'`: **0 rows**

`supabase/functions/list-my-books/index.ts` (lines 360–408) counts products from `generated_assets.asset_type` and a few legacy product tables — none of which the new builder pipeline writes to. The canonical source is `author_nodes`.

**Fix in `list-my-books`:**
- Replace the `generated_assets` query with a query against `author_nodes` for the user's books: count rows where `status IN ('live','content_ready','published_pending_ghl')`.
- Bucket by node prefix: `BP-*` → brand, `BA-*` → build, `YR-*` → yield.
- Also expose `liveMicrositeCount` (rows where `status='live' AND microsite_url IS NOT NULL`) so the "0 Live Microsites" card on My Books reflects reality.
- Keep the legacy `generated_assets` count as a fallback for very old accounts (max of the two).

---

## Bug 5 — BP-05 shows "Live" badge but the builder is empty

**Confirmed via DB.** BP-05 row is `status=live` with a 9.6 KB `content_json` containing `webinar_topics`, `registration_page`, `follow_up_emails`, etc. The "Live" badge on the Brand tab is correct. The builder appears empty because `BP05Builder.tsx` (lines 99–112) reads via the **project-local Supabase client**, which under shared-backend sessions often runs with `auth.uid() = null`. The `author_nodes` "Public can read live nodes" RLS policy normally rescues this — but only if PostgREST evaluates the row at all. In practice users on shared-backend sessions intermittently see empty results from project-local queries.

**Fix:**
- Route BP-05's load through the existing `save-author-node` edge function (`action: "load"`), the same pattern BA-11/BA-13 already use. This bypasses the RLS/uid mismatch and uses the service role.
- Apply the same fix to BP-04 load (already affected) and any other builder still reading `author_nodes` directly via project-local client.

---

## Bug 6 — BP-04 "Your Pages" shows "No products yet"

**Confirmed via code.** `WebsiteBlueprintPage.tsx` (lines 111–141) populates "Your Pages" from `home_study_courses`, `courses`, `coaching_packages`, `audiobooks`, `podcasts` — all empty for this user. The author has 24 live products, all in `author_nodes`.

**Fix:**
- Replace the multi-table fetch in `WebsiteBlueprintPage.tsx` with a single `author_nodes` query (status='live') routed through a small read endpoint (re-use `list-my-books` extended payload from Bug 4, or add `action: "list-live-nodes"` to `save-author-node`).
- Map `BP-06`→workbook, `BP-07`→home-study, `BP-09`→book, `BA-10`→course, `BA-11`→audiobook, `BA-12`→membership, `BA-13`→group-coaching, `BA-14`→podcast, etc., using the existing `compute_node_microsite_url` slugs so each row links to the correct live page.

---

## Files to change

```text
src/components/dashboard/builders/shared/PublishSuccessScreen.tsx   (Bug 1)
src/components/dashboard/builders/bp03/BP03Builder.tsx              (Bug 1)
src/components/dashboard/builders/bp04/BP04Builder.tsx              (Bug 1, Bug 5/6)
src/components/dashboard/builders/bp05/BP05Builder.tsx              (Bug 1, Bug 5)
src/components/dashboard/HubRedirect.tsx                            (Bug 1)
src/config/abbyFrameworkConfig.ts                                   (Bug 2)
src/components/dashboard/builders/ba13/BA13Builder.tsx              (Bug 3)
src/components/dashboard/microsite/WebsiteBlueprintPage.tsx         (Bug 6)
supabase/functions/list-my-books/index.ts                           (Bug 4, Bug 6)
supabase/functions/save-author-node/index.ts                        (Bug 5; optional helper for Bug 6)
```

No DB schema changes required. No new secrets required.

## Out of scope

- Re-running BP-05 generation: not needed — content already exists, the bug is in the read path.
- Touching the working BA-10/BA-11/BA-12 publish paths.
- Migrating away from `generated_assets` entirely — only the count source is corrected.
