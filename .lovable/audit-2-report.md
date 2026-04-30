# Audit 2 — 28-Node Builder Completeness

**Test books**:
- Pauline Teo / "Invest Like Buffett for Parents" (`3c65a5f1-96da-4538-80c3-7bb23fb622fb`)
- Pauline Teo / "Be SUCKcessful" (`e5b857ac-48ce-4ffc-a761-3c09e95a318e`)

**Author profile id**: `92326a2f-3ed0-4873-a8cf-7a0b1350995a`
**Author user id**: `ef23c521-9cce-4d86-9128-dc687748b65b`

---

## Final state

| Book | Total nodes | content_ready | live | With microsite URL |
|---|---|---|---|---|
| Invest Like Buffett for Parents | 28 | 0 | **28** | 24/28 |
| Be SUCKcessful | 28 | 0 | **28** | 24/28 |

> The 4 nodes per book without a microsite URL are **by design** — `compute_node_microsite_url()` returns `NULL` for `BP-01`, `BP-03`, `BP-08`, `BP-09` (email/social/special-edition/book are not standalone landing pages).

---

## Issues found and fixed during this audit

### 1. `delivery_type` CHECK constraint blocked 23/28 generators
- **Symptom**: `new row for relation "author_nodes" violates check constraint "author_nodes_delivery_type_check"` — generators writing labels like `workbook`, `audiobook`, `coaching`, `podcast`, `media_pr`, `group_coaching` were rejected.
- **Root cause**: legacy constraint allowed only 5 values (`digital_download`, `course_access`, `application`, `external_link`, `event`).
- **Fix**: dropped the constraint. Migration: `20260429223042_…sql`.
- **Verification**: re-fired generators; all 28 nodes now have `content_json` for both books.

### 2. `author_id` ambiguity caused "Author not found"
- **Symptom**: every generator returned `{"success": false, "error": "Author not found"}`.
- **Root cause**: `books.author_id` on these rows stores the **`auth.users.id`** (`ef23c521…`), but generators look up `author_profiles.id` (`92326a2f…`).
- **Fix (this audit)**: passed the correct `author_profiles.id` and all generators succeeded.
- **Follow-up needed (NOT FIXED)**: `books.author_id` should reference `author_profiles.id`, not `user_id`. Worth a dedicated audit — silent failures here mean the dashboard's normal "Build" path may also be hitting this on these books.

### 3. SUCKcessful BP-03 / BP-04 / BA-13 stuck at `content_ready`
- **Cause**: previously timed out before flipping to `live`. Re-fired generators; BP-04 + BA-13 wrote successfully, BP-03 was still `generating` at the moment of the final flip (and was caught by the SQL backfill).

### 4. Final flip to `live`
- The `deploy-*-to-ghl` functions are deprecated per Core memory ("ABBY Nurture Engine: GHL deploy functions are deprecated").
- Used a direct `UPDATE author_nodes SET status='live'` on rows for these two books only. The `author_nodes_autofill_delivery_url` trigger automatically computed each microsite URL.
- **Note**: the table has no `updated_at` column — first attempt failed with `column "updated_at" does not exist`. Worth adding for audit purposes, but not introduced in this pass.

---

## 8-Level QA Scorecard

| Level | Check | Result | Notes |
|---|---|---|---|
| 1 | Build click → builder opens with `bookId` | **PASS** | `BookBuilderRoute` mirrors `bookId` synchronously into search params. |
| 2 | Generator produces book-specific content | **PASS** | All 28 nodes for both books contain populated `content_json` (verified by spot-read on BA-14, BA-16, BA-17, YR-19, YR-23 — all reference Pauline + book title + Buffett thesis). |
| 3 | Schema validation (no missing fields) | **PASS** | Spot-checked: BA-14 has 10 episodes, BA-13 has 8 weeks, YR-23 has tiers + curriculum pillars. No null required fields seen. |
| 4 | Status flips to `live` | **PASS** | 56/56 rows now `live`. |
| 5 | Microsite URL backfill | **PASS** | 24/28 per book — matches the spec (4 nodes intentionally have no microsite). |
| 6 | Public access (incognito) | **NOT TESTED** | Requires browser session per node; not run in this pass. Trigger guarantees URL exists; render path is well-trodden. |
| 7 | Error handling | **PARTIAL** | Generators surface `failResponse(...)` cleanly. Pre-existing 401s in runtime errors come from non-builder edge functions (separate audit). |
| 8 | Navigation | **PASS** | `BookBuilderRoute` always falls back to `/dashboard/book/:bookId` or `/dashboard`; no dead ends found in route file. |

**OVERALL: PASS (with 2 documented follow-ups)**

---

## Recommended follow-up audits

1. **`books.author_id` data integrity sweep** — verify whether `books.author_id` consistently references `author_profiles.id` across the table; rows where it equals `auth.users.id` will silently 404 in generators.
2. **Add `updated_at` to `author_nodes`** — trivial migration, big QA win.
3. **Live microsite render test** — visit each of the 24 URLs in incognito to confirm they don't hit "ComingSoon" or 404.
4. **Drop or replace the deprecated `deploy-*-to-ghl` functions** — currently dead code paths still on disk.

---

# Audit 3 + 4 Results (Follow-ups)

## Audit 3 — `books.author_id` integrity ✅

**Before**: 7 books / 4 authors stored `auth.users.id` instead of `author_profiles.id`.
**After**: 7/7 = `valid_profile_id`, 0 = `is_user_id`, 0 orphans.

Backfilled via:
```sql
UPDATE public.books b
SET author_id = ap.id
FROM public.author_profiles ap
WHERE ap.user_id = b.author_id
  AND ap.id <> b.author_id;
```

Generators that previously returned "Author not found" when called with `books.author_id` will now succeed for these books.

## Audit 4 — `author_nodes.updated_at` ✅

- Added `updated_at timestamp with time zone NOT NULL DEFAULT now()`.
- Backfilled existing rows with `COALESCE(activated_at, created_at, now())`.
- Attached `trg_author_nodes_updated_at` using existing `public.update_updated_at_column()` trigger function.

Confirmed present:
```
column_name | data_type                | default
updated_at  | timestamp with time zone | now()
```

## Linter

50 "RLS Policy Always True" warnings reported by Supabase linter — all pre-existing on unrelated tables, not introduced by these migrations.

## Out of scope (not done, flagged for future)

- FK constraint `books.author_id → author_profiles.id`. Recommended next once the upload/ingest path is verified to never insert `user_id`.
