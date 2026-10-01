# Response to the 1 Oct Post-Fix Verdict — comments and fix plan

## My comments on the audit

The audit is fair and accurate. I agree with the verdict: not production-ready yet. Notes on each point:

1. **Builders (27 strong / 1 weak)** — Agreed. YR-28 is the one builder that still doesn't name the book in its welcome text.
2. **Counts 11/28 and 66/84** — Agreed, these are fixed.
3. **Review & Publish / Live Microsites (54 of 66)** — Mostly already fixed in the preview, but **not published yet**. The auditor tested the live site, so they saw the old version. One gap is still open: when you come from a book's page, Review & Publish should open on that book, not on "All books".
4. **Funnels and CRM** — Agreed, still not fixed. Funnels list every book's funnels. CRM shows all 41 contacts. Contacts can already be tagged with a book, but the CRM screen never filters by it.
5. **Revenue Dashboard** — Agreed. It still says "across all 28 nodes". The "Abby is scheduling 4 posts per week" message is still in the code. That claim is false and has to go.
6. **BA-11 / BP-05 / BA-10 / BA-13 "Live"** — Agreed, and this corrects me. I said these were truly Live because their content existed. The audit is right that "Live" must mean a reader can actually use it. A funnel still in draft, or a page that says "coming soon", cannot count as Live. The live/ready rules need tightening.
7. **YR-21 Speaking** — Agreed. The builder still says "fee schedule" in its welcome text, loading messages and a "Fee Schedule" tab.
8. **BP-03 Social** — Agreed. The welcome box still says "Auto-scheduled to your connected social accounts" and asks authors to connect their social accounts.
9. **Marketing Hub post counts (242 / 80 / 20)** — Agreed. These are three different numbers with no labels to explain them.
10. **Admin checks "Unverified"** — Fair. I checked these signed in as your admin, but the auditor couldn't. They should stay unverified until someone else confirms them.
11. **Suggested improvements to the audit itself:**
    - Check the preview as well as the live site, or note which version was tested.
    - Run the 8-point release gate on the hidden test author's test book as well as Pauline's books, so it can be repeated every day without risking Pauline's real content.

## Fix plan

1. **Every page opens on the selected book.** From a book's page, these all open on that book: Review & Publish, Live Microsites, Library, Marketing Hub, Funnels, CRM and Revenue. "All books" is an option you choose and is clearly labelled.
2. **Funnels by book.** Funnels can be filtered by book. Funnels with no book are labelled "Unattributed".
3. **CRM by book.** The CRM filters contacts by book. Contacts with no book are shown under "Unattributed". Older contacts get their book filled in from the funnel or lead magnet they signed up through.
4. **Revenue Dashboard.** In "All books" view it says "across all your books (84 possible streams)". In a single book's view, every figure follows that book. The duplicate social alert and the "Abby is scheduling" claim are removed and replaced with the manual copy-and-post steps.
5. **Stricter "Live" rule, used on every screen.**
   - BP-05 Webinars counts as Live only when its webinar funnel is published.
   - BA-10 Courses and BA-13 Group Coaching count as Live only when their funnel or reader page is published.
   - BA-11 Audiobook: the builder now uses the same rule, so it can no longer say "Published" for a book that has no audiobook. Invest Like Buffett will show "Ready to Build".
   - A one-time check re-labels any existing module that no longer passes, so all counters agree.
6. **Wording fixes.**
   - YR-21 Speaking: "fee schedule" becomes "speaker profile, topics and enquiry form". The Fee tab becomes "Booking Enquiries", with "By application" routing.
   - BP-03 Social: copy changed to "copy, post yourself, mark as done".
   - The "4 posts per week" message is removed.
   - A full search confirms none of these phrases remain anywhere.
7. **Marketing Hub counts.** Clear labels — Generated, Queued and Posted — all from one source and all for the selected book.
8. **YR-28** names the selected book in its welcome text.
9. **Tests and checks.**
   - New automated tests for book filtering, the stricter Live rule and banned wording.
   - The daily audit gains a check that fails if any "Live" module leads to a draft or "coming soon" page.
   - I then click through every page for all three of Pauline's books as Pauline, and the admin pages as admin. After that I'll recommend publishing so the auditor can re-run the 8-point gate on the live site.

## Technical details
- Selected book comes from `resolveScopedBookId()` (path/`?book`/`?bookId`). Review & Publish and Library currently start on "all" when the route has no book. Change this to fall back to the Book Hub's selected book.
- `funnels-manage` `list`: accept `book_id`, filter `funnels.book_id` via `author_nodes.book_id` join on node_id. FunnelsHub gets a book selector.
- CRM: `crm_contacts.book_id` exists (index on author_id, book_id). Add a book filter to ContactListView/PipelineView and backfill from `funnel_submissions` → funnel → book.
- `RevenueFullDashboard.tsx:446` copy; remove `abby-next-step.ts:214` claim; `BuilderIntroBlock.tsx:63-66` BP-03 copy; `YR21Builder.tsx` lines 19/168/181.
- `_shared/node-readiness.ts`: for BP-05/BA-10/BA-13, require a published funnel or public page as part of the readiness context. BA-11 builder status must go through `hasRequiredAssets` with the exact book_id. Migration to reconcile `author_nodes` (status `live` → `ready` where the gate fails), logged to admin_audit_log.
- Update AGENTS.md: "Live = status live + required assets + publicly reachable, enforced only in _shared/node-readiness.ts".
