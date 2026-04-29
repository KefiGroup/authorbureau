## Sprint 6 — Make BA-10, BA-11, BA-12 Revenue-Ready

The platform's biggest single gap: ABBY publishes great content, but the public pages still say "Coming Soon" / "Notify Me" with no Buy button. The Stripe checkout function actually already supports courses, memberships, and nodes — the bug is **upstream**: publish never flips the right rows to `live`, and the lookup uses the wrong author id.

---

### Root causes (verified against the database)

**BA-10 Online Course — "Notify Me When Enrollment Opens"**
- `generate-ba10-online-course` writes into `courses` with `status: 'draft'` and uses the **shared-backend user id** as `courses.author_id` (Pauline's row is under `ef23c521…`, not her `author_profiles.id` `92326a2f…`).
- `CourseSalesPage.tsx` queries `courses` by `author_id = author_profiles.id` → **0 rows** → falls through to `ComingSoonScreen`.
- "Publish to My Site" only flips `author_nodes.status` to `live`. It never touches the matching `courses` row, so even when the row is found it stays `draft` and the buy button is hidden.

**BA-12 Memberships — "Coming Soon" badge**
- `membership_content` row exists for Pauline, but `status = 'draft'`. Same publish-gap as above: publish flips `author_nodes` only, the `membership_content.status` stays `draft`.
- `MembershipSalesPage.tsx` requires `status === 'live'` to show the "Join Now" button, otherwise it shows a disabled "Coming Soon".

**BA-11 Audiobook — "No manuscript found"**
- `ba11-audiobook-generate` does not load the manuscript from the parent `books` row the way other BA/BP nodes do via `bookId`. The Audiobook Studio expects its own separate manuscript.
- The Build tab shows a hard-coded `Live` badge before generation has actually succeeded.

The good news: `create-checkout-session` already accepts `course_id`, `membership_author_id`, and `author_node_id`, and dispatches `payment` vs `subscription` correctly. No checkout-side rewrite is needed.

---

### What I'll change

**1. Fix the publish handoff (`save-author-node`, action `publish`)**

After flipping `author_nodes` to `live`, also flip the sister product row, scoped by `author_profiles.id` AND by `user_id` (covers the dual-id case):

- `BA-10` → `UPDATE courses SET status='live' WHERE (author_id = author_profiles.id OR author_id = author_profiles.user_id) AND book_id = bookId`
- `BA-12` → `UPDATE membership_content SET status='live' WHERE author_id = author_profiles.id OR author_id = author_profiles.user_id`
- `BA-11` → set `audiobook_*` row to `live` only when audio assets are confirmed present (otherwise return `404 audiobook_not_generated`).

This is additive — existing call sites unchanged.

**2. Normalise the author id used by BA-10 / BA-12 generators**

Update `generate-ba10-online-course` and `generate-ba12-membership` so the row they create/update uses **`author_profiles.id`** as the canonical `author_id` (matches what `CourseSalesPage` / `MembershipSalesPage` already query). Backfill the two existing Pauline rows in a one-shot migration.

**3. Public page status tolerance**

Both pages currently treat anything other than `'live'` as Coming Soon. Update them to accept `'live' | 'published' | 'content_ready'` (the three states the publish flow can leave behind), so a previously-published row that was never re-flipped still shows the buy button. Belt-and-braces for backfill.

**4. BA-10 sales page → existing checkout**

`CourseSalesPage` already has a working `CourseBuyButton` that calls `create-checkout-session` with `course_id`. No code change needed once the data flow is fixed — the button will simply appear because `isLive` becomes true.

**5. BA-12 sales page → existing checkout**

Same story: `MembershipSalesPage` already calls `create-checkout-session` with `membership_author_id` + `mode: "subscription"`. Just needs the `status='live'` flip.

**6. BA-11 Audiobook — manuscript inheritance + honest "Live" badge**

- Update `ba11-audiobook-generate` to load `books.manuscript_text` (or the parsed manuscript_url payload) the same way other generators do, keyed on `bookId`. Drop the separate-upload requirement.
- Remove the optimistic "Live" badge on the Build tab; derive it from `author_nodes.status === 'live' AND audiobook_chapters_count > 0`.
- After generation completes, the audiobook public page already supports a Buy button via the shared `BuyNowButton` (BA-11 has `price_usd = 14.99` in `author_nodes`); we just need publish to flip the row honestly.

**7. One-shot backfill migration (Pauline + any other affected authors)**

```sql
UPDATE courses c
   SET status = 'live'
  FROM author_nodes n
 WHERE n.node_id = 'BA-10'
   AND n.status  = 'live'
   AND n.book_id = c.book_id
   AND (c.author_id = n.author_id
        OR c.author_id = (SELECT user_id FROM author_profiles WHERE id = n.author_id));

UPDATE membership_content m
   SET status = 'live'
  FROM author_nodes n
 WHERE n.node_id = 'BA-12'
   AND n.status  = 'live'
   AND (m.author_id = n.author_id
        OR m.author_id = (SELECT user_id FROM author_profiles WHERE id = n.author_id));
```

Plus a UPDATE that reassigns `courses.author_id` and `membership_content.author_id` from the shared-backend user_id to the canonical `author_profiles.id`, so future selects in the public pages work without OR-clauses.

---

### Files to edit

- `supabase/functions/save-author-node/index.ts` — publish action: cascade status to sister tables
- `supabase/functions/generate-ba10-online-course/index.ts` — write `author_profiles.id`
- `supabase/functions/generate-ba12-membership/index.ts` — write `author_profiles.id`
- `supabase/functions/ba11-audiobook-generate/index.ts` — inherit manuscript from `books`
- `src/pages/CourseSalesPage.tsx` — accept `live | published | content_ready`
- `src/pages/MembershipSalesPage.tsx` — same status tolerance
- Audiobook Build tab component — derive `Live` badge from real state
- One migration for the backfill

### Test plan (Pauline, support@paulineteo.com)

1. Visit `/pauline-teo/online-course` → see the **Enrol Now** button at $297; click it → Stripe checkout opens with the right amount.
2. Visit `/pauline-teo/membership` → see benefits + **Join Now** at $27/month; click it → Stripe checkout opens in subscription mode.
3. Open Audiobook Studio for "Be SUCKcessful" → no "No manuscript found" error; generation proceeds. Build tab `Live` badge only appears after generation finishes.
4. Re-publish each node → confirm `author_nodes`, `courses`, and `membership_content` all show `status='live'` in one round-trip.

After approval I'll switch to build mode, run the migration, ship the edge-function changes, and re-test against Pauline's live data.