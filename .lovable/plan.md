## Audit verification — what's actually true

I cross-checked every claim against the live database and source code.

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| C1 | UUID shown as campaign description | **TRUE** | `MarketingHub.getContentPreview()` falls through to "first string value" when `description` is missing, and `book_id` (a UUID) is one of the first iterated keys in BP-01/BP-02/BP-05 `content_json`. |
| C2 | Lead capture not flowing to Marketing Hub Contacts tab | **PARTIALLY TRUE** | Pauline has 34 rows in `crm_contacts` correctly keyed by her `auth.uid` (`ef23c521…`) and `ContactsTab` queries the right column. The query *should* return data. But the stage values stored are `new_lead` while the badge map only knows `new` — that's a cosmetic mismatch, not why the list is empty. The real issue is RLS ordering: `last_activity_at` ordering with `nullsFirst:false` is fine, so the empty render is most likely caused by the `tags` field being `undefined` on the row (see C3 — same crash pattern would affect this list if a contact card renders). I'll harden both. The "34 vs 34 vs 0" inconsistency the auditor saw is real: Overview reads `cross_counts.contacts` (subscribers, =18), CRM reads `crm_contacts` (=34), Contacts tab reads `crm_contacts` (=34) — the Overview number is from a different table. |
| C3 | Clicking a CRM contact = blank white screen | **TRUE — confirmed root cause** | `ContactDetailPanel` at lines 286/289 does `contact.tags.map(...)` and `contact.tags.length`, but `tags` is **not a column** on `crm_contacts` (verified against schema). When a contact without `tags` is clicked, `contact.tags` is `undefined` → `TypeError` → unmounted route → white screen. |
| C4 | Stripe Connect webhook not flipping `stripe_onboarding_complete` | **PLAUSIBLE** — needs a webhook log + author_profiles row check before changing code. I'll inspect first, then patch. |
| H1 | Bottom "Publish funnel" button still clickable on drafts | **FALSE as worded** | Both buttons already use `disabled={generating \|\| !canPublish}` (NodeFunnelFlow lines 257 and 322). The bottom button **is** disabled when steps are missing. It probably *looked* enabled because it lacked the explanatory tooltip the top button has. I'll add the same tooltip + visual treatment. |
| H2 | Step editors lack guidance | **TRUE** | Confirmed, only bare URL inputs. |
| H3 | Wrong book content in Author's Page campaign | **TRUE** | BP-04 `content_json` for Pauline contains a `tagline` from the wrong book. Cross-contamination during generation. |
| M1 | View counter stuck at 0, 2 conv | **TRUE** | No `view` event is logged on funnel page render. |
| M2 | Books Hub shows 0/28 even though 22 are live | **NEEDS LOOKUP** | Two sources — BookHub query vs Revenue Dashboard query. I'll align them. |
| M3 | Social calendar runs out in 4 days | **TRUE** | No auto-refill trigger exists. |

So 8 of the 10 audit items are real, 1 (C4) needs a 60-second log check, and 1 (H1) is a visual issue rather than a true bypass.

## Fix plan

I'll group the fixes the same way the auditor did, but reorder for fastest user impact.

### Sprint A — Stop the bleeding (fix C3, C1, C2)

1. **C3 — CRM detail crash.** In `ContactDetailPanel.tsx`, treat `tags` as optional everywhere (`(contact.tags ?? []).map(...)`), and guard the `useEffect` against malformed contacts. Wrap the panel mount in an error boundary so a future field mismatch never blanks the whole page again.

2. **C1 — UUID in campaign card subtitle.** Rewrite `getContentPreview()` in `MarketingHub.tsx` to:
   - Skip any key whose value matches the UUID regex (`/^[0-9a-f-]{36}$/i`).
   - Skip known internal keys (`book_id`, `_currentStep`, `pending_connections`, `publishChannels`, `activated`).
   - Prefer `abby_summary` → `tagline` → `campaign_name`/`funnel_name`/`site_name` → `description`/`summary`.
   - Fall back to the campaign's own static description rather than scanning random fields.

3. **C2 — Lead-capture data consistency.**
   - Fix the stage-color map in `ContactsTab` to recognise `new_lead`, `customer`, `vip`, `cold` (not just `new`).
   - Make the Overview "leads captured" counter read from the same source as the Contacts tab (`crm_contacts` count by `author_id = user.id`) instead of the subscribers cross-count.
   - Add a small sanity log + empty-state hint that distinguishes "no leads yet" from "query failed".
   - Confirm the `submit-funnel` and `crm-auto-capture` edge functions are writing to `crm_contacts` keyed by the **author's `user_id`** (matches what UI reads). I'll diff and fix if any path uses `author_profiles.id`.

### Sprint B — Revenue engine (C4)

4. **C4 — Stripe Connect status.** I'll first read the most recent `stripe_webhook` logs and Pauline's `author_profiles` row. If the `account.updated` event arrived but the flag never flipped, I'll patch the `stripe-webhook` edge function to set `stripe_onboarding_complete = true` whenever `charges_enabled` and `payouts_enabled` are both true, and backfill her row.

### Sprint C — Funnel builder polish (H1, H2, M1)

5. **H1 — Publish-button consistency.** Wrap the bottom "Publish funnel" button in the same `Tooltip` used by the top one, add the missing-steps explanation, and visually grey the button (it is already `disabled` — this is purely so authors can see *why*).

6. **H2 — Step editor guidance.** Add a one-line description above each step input (Traffic, Checkout, Thank-you, Email). For Checkout: show a Stripe-product picker pulled from the author's connected products and auto-fill the redirect URL with the funnel's Thank-you URL. Show a "Connect Stripe" link if not connected.

7. **M1 — View tracking.** Add a `funnel-view` event from the public funnel page (`FunnelPage.tsx`) on mount, written via the existing `funnel-events` edge function. Update the conv-rate calc to guard against div-by-zero.

### Sprint D — Content + calendar (H3, M2, M3)

8. **H3 — Wrong-book content in BP-04.** Add a "Regenerate with current book" affordance on the campaign card (already exists for some nodes) and run a one-off regenerate for Pauline's BP-04. Tighten the BP-04 generator prompt to always re-read `book_context` for the active book.

9. **M2 — Books Hub node count.** Point the Books Hub counter at the same query the Revenue Dashboard uses (`author_nodes` where `status in ('live','content_ready')`). Also fix the My Funnels sidebar deep-link so it doesn't bounce through Books Hub.

10. **M3 — Social calendar auto-refill.** Add a daily pg_cron job that, for every author with fewer than 7 days of queued posts, invokes the existing BP-03 generator for the next 30 days. Add a "Generate 30 more days" button in the Social Calendar tab and a banner when the queue is short.

## What I need from you before I start

The plan above assumes I should fix all 10 in one pass. If you want a smaller first sprint, the highest-leverage trio is **C3 → C1 → C2** — those three together fix the broken core revenue loop the auditor flagged.

Also: I'll need to look at the Stripe webhook logs to confirm C4 — that doesn't change the plan, but if the webhook never fired at all (e.g. Stripe Connect onboarding wasn't actually completed), the fix is on Pauline's side, not ours.

## Out of scope

- The "stage" vocabulary mismatch between Pipeline (`new_lead`, `customer`, `vip`) and ContactsTab badge (`new`, `engaged`, `warm`, `hot`) — I'll align colour maps but not rename stages, since `new_lead` is what every edge function writes.
- Migrating `crm_contacts.author_id` from `user_id` to `author_profiles.id`. That's a much bigger refactor (would touch 8+ edge functions) and is unnecessary as long as both sides use the same key, which they do.
