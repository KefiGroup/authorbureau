## Goal

When Pauline opens the Social Calendar and her **scheduled** runway drops to **7 days or fewer**, ABBY automatically generates 30 more days of post copy and drops them into the **Unscheduled queue** — with a toast confirming the refill. This replaces the old fixed-overnight cron model with an on-demand, author-aligned trigger.

## Why this approach

Sprint 5A already disabled the nightly `auto-refill-social-calendar` cron (it now early-exits unless `force: true` is passed) because the author controls scheduling. That means the legacy "overnight job" the user is worried about will never fire. The reliable trigger point is the moment the author opens the Social Calendar tab — we evaluate runway then and call the existing forced-refill path if needed. No new cron, no schema changes, no new edge function.

## Changes

### 1. `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx`

**Add a runway calculation** (after `scheduledCount` is computed, ~line 270):
- `latestScheduledAt` = max `scheduled_at` among posts where `status !== 'posted'`.
- `daysOfRunway` = days between today and `latestScheduledAt` (0 if none scheduled).

**Add an auto-regen effect** that fires once per session per author when:
- `bp03Activated` is true,
- `loading` is false,
- `daysOfRunway <= 7`,
- `unscheduledCount < 10` (so we don't pile on if she already has plenty of drafts ready),
- and we haven't already auto-fired in this session (guarded by a `useRef<Set<string>>` keyed by `authorId`).

The effect calls the same `force: true` path `refillCalendar()` already uses, but in a quiet variant `autoRefillCalendar()` that:
- Shows an inline "ABBY is topping up your post queue…" hint while running.
- On success: `toast.success("ABBY has added 30 new post ideas to your Unscheduled queue.")` and reloads.
- On failure: silent (logs to console) — the manual "Generate 30 more days" button is still visible.

**Update the banner** (~line 498). Replace the current single banner with two states:

- If `daysOfRunway <= 7` AND `daysOfRunway > 0`:
  amber tone: *"Your scheduled posts run out in {daysOfRunway} day(s). ABBY is preparing 30 more — they'll appear as Unscheduled below."*
- Else if `unscheduledCount > 0` (existing behavior):
  *"You have {unscheduledCount} unscheduled posts ready to go — pick your dates below."*

This satisfies requirement #3 (7-day threshold) without re-introducing the misleading "overnight" copy.

### 2. `supabase/functions/auto-refill-social-calendar/index.ts`

No behavior change required — the forced path already:
- accepts `{ author_id, force: true }`,
- bypasses the early-exit,
- calls `generate-bp03-social-media` for 30 days,
- which (per Sprint 5A) inserts new rows as `status: 'draft'` / `scheduled_at: null` (Unscheduled queue). Requirement #2 is already satisfied.

We will add one small comment update to the file header so the next reader understands the new client-driven trigger model. No logic change.

## Edge cases handled

- **Author with 0 scheduled posts but many unscheduled drafts**: `daysOfRunway === 0` but `unscheduledCount >= 10` → no auto-fire (she has plenty of copy to schedule).
- **Author with 0 scheduled and 0 unscheduled**: auto-fires on first open.
- **Repeat opens in the same session**: guarded by ref, won't double-fire.
- **Refill fails**: silent fallback, manual button still works.

## Testing checklist

1. Log in as `support@paulineteo.com`, open Marketing Hub → Social Calendar.
2. With current state (scheduled posts ending May 1, today April 29 → runway = 2 days), confirm:
   - amber banner reads "Your scheduled posts run out in 2 days…"
   - auto-refill fires, toast appears: *"ABBY has added 30 new post ideas to your Unscheduled queue."*
   - Unscheduled count jumps by ~80 posts (20 days × 4 platforms).
3. Reload the page — auto-refill does NOT fire again (session guard) and unscheduled count is unchanged.
4. With a fresh author who has runway > 7 days, confirm no auto-refill and no amber banner.

## Files touched

- `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx` (add runway calc, effect, updated banner)
- `supabase/functions/auto-refill-social-calendar/index.ts` (header comment only)
