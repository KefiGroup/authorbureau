## Goal

Give Pauline (and every author) full control over WHEN each AI-generated social post goes live. Posts come out of the AI generator as **Unscheduled drafts**. The author chooses a date+time per post (or "Post Now"). Nothing is auto-dated.

## What changes (author-visible)

1. **Generator output** — When ABBY produces 20 posts (or "Generate 30 more"), each post lands as **Unscheduled / Draft**. No date is assigned.
2. **New "Unscheduled" tray** — Below the calendar, a section listing every post without a date, grouped by platform with filter chips. Each card shows:
   - Platform icon + caption preview
   - **Schedule** button → opens date + time picker (default 9:00 AM)
   - **Post Now** button → marks `posted` immediately with current timestamp + opens platform composer with caption pre-copied
   - **Copy caption** button (kept from today)
   - Stays visible until the author either schedules it, posts it, or deletes it
3. **Calendar grid** — Only shows posts the author has actually scheduled. Today still highlighted as a blue dot. Clicking a date opens the day panel (already exists) with the same Schedule/Post Now/Reschedule controls.
4. **Drag-and-drop** — Author can drag an Unscheduled card onto any future calendar cell. Drop sets `scheduled_at` to that day at 9:00 AM. (Date-picker is the always-available fallback.)
5. **Top counter** — `X of Y posted` where Y = total posts generated, X = posts with `status='posted'`. (Today already does this; we just confirm it counts correctly when nothing is scheduled.)
6. **Banner copy swap** — Replace "Calendar runs out in N days" with **"You have N unscheduled posts ready to go — pick your dates."** Only show when N > 0. If N = 0 and scheduled posts also = 0, hide.
7. **Generate 30 more days button** — Stays. New behavior: it generates **post copy only** and inserts as Unscheduled (no dates).
8. **Auto-refill removed** — The nightly `auto-refill-social-calendar` cron behavior that silently extends the calendar is disabled (the function will no longer self-schedule; it can still be invoked manually but only inserts unscheduled posts via the "Generate 30 more" button).

## Technical changes

### Edge functions

- **`supabase/functions/bp03-node-state/index.ts`** — `rebuildSocialPosts()` currently spreads posts on dates 1, 4, 7… every 3 days at 9 AM. Change so every inserted row has `scheduled_at: null` and `status: 'draft'`. Keep idempotency (delete previous `draft`/`ready` rows that have no `posted_at`). Removes `computeScheduleDates` usage.
- **`supabase/functions/marketing-hub-state/index.ts`**
  - Loosen `reschedule_social_post`: accept either a date-only string (apply 09:00) or a full ISO timestamp (use as-is). Keep author-scoped `eq("author_id", authorProfile.id)` guard.
  - Add new action `post_social_now`: sets `status='posted'`, `posted_at=now()`, leaves `scheduled_at` as today if null. Returns updated row.
  - Existing `update_social_post` and `social_calendar` action stay.
- **`supabase/functions/auto-refill-social-calendar/index.ts`** — Remove the cron self-trigger logic that pushes 30 more days onto the calendar with auto-dates. The "force" branch (called from the UI button) just kicks `generate-bp03-social-media` which now writes Unscheduled posts via the `bp03-node-state` rebuild path. Optionally short-circuit cron-mode (no `force`) to a no-op.

### Frontend — `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx`

- Add `unscheduledPosts = posts.filter(p => !p.scheduled_at && p.status !== 'posted')`.
- Replace the amber **lowRunway** banner block with a teal **"You have N unscheduled posts ready to go — pick your dates."** banner driven by `unscheduledPosts.length`.
- Add a new **`<UnscheduledTray>`** section between the platform-filter row and the calendar grid:
  - Heading + count + "Schedule all evenly across N days" optional helper (out of scope for this sprint)
  - Card list (uses same row UI as the day-panel cards) with: Schedule (opens existing date input drawer, now also accepting time), Post Now (calls `post_social_now` + opens composer), Copy caption.
  - Drag handle on each card; cards are `draggable`. Calendar cells become drop targets that call `reschedule_social_post` with the dropped date.
- Upgrade reschedule UI from date-only `<Input type="date">` to date + time (`<Input type="datetime-local">`) so authors can pick the exact go-live moment. Send full ISO to the edge function.
- Update top counter label: `{postedCount} of {totalCount} posted` (already correct — verify wording).
- Add a `postNow(post)` helper that calls the new `post_social_now` action, then opens the composer URL like `copyAndOpen` already does.
- Remove `lowRunway` / `daysRemaining` math (no longer relevant).

### Database

No schema migration needed — `scheduled_at` is already nullable, and `status='draft'` is already a supported value used in queries today.

### Behavior matrix

```text
Generated post           → status=draft,  scheduled_at=null  (Unscheduled tray)
Schedule clicked         → status=ready,  scheduled_at=picked timestamp
Drag-drop on day         → status=ready,  scheduled_at=that day @ 09:00
Post Now clicked         → status=posted, posted_at=now,  scheduled_at=now if null
Mark as Posted (panel)   → status=posted, posted_at=now   (existing)
Undo                     → status=ready,  posted_at=null  (existing)
```

## Test plan (Pauline scenario)

1. Sign in as `support@paulineteo.com`.
2. Open Marketing Hub → Social Calendar.
3. If she already has scheduled posts: those remain on the calendar (no migration needed).
4. Click **Generate 30 more days** → posts appear in the new **Unscheduled** tray, calendar cells unchanged.
5. On one card, click **Schedule**, pick a date+time, save → card moves to that calendar cell with a blue dot.
6. Drag another card onto a future date → same effect.
7. Click **Post Now** on a third card → status flips to Posted ✓, composer opens, counter increments.
8. Top banner now reads "You have N unscheduled posts ready to go — pick your dates." with N decreasing as she schedules.
9. The amber "Calendar runs out in X days" banner is gone.

## Out of scope (deferred)

- Buffer auto-publish — UI here is "copy + open composer" today; we keep that.
- Bulk "Schedule all across N days" helper — easy follow-up but not in this sprint.
- Migrating existing auto-scheduled posts back to Unscheduled — leave Pauline's current rows alone; only new generations will be Unscheduled.
