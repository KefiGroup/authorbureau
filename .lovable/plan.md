

Current `SocialCalendarTab.tsx` already loads from `social_posts` and renders a flat 3-column grid of cards. I'll replace the layout with a real calendar while keeping data fetching, sync, and types untouched.

## Plan: Visual calendar layout for Social Calendar tab

**Single file:** `src/components/dashboard/marketing-hub/SocialCalendarTab.tsx`

### 1. Keep as-is
- `load()` fetch logic, `posts`/`connections` state, `syncAccounts`, loading spinner.
- Imports for supabase, toast, icons, Card/Badge/Button.

### 2. New helpers (top of file)
- `PLATFORM_COLORS = { linkedin: "bg-[#0A66C2]", instagram: "bg-pink-500", facebook: "bg-[#1877F2]", x: "bg-black", twitter: "bg-black" }`
- `groupPostsByDay(posts)` → `Map<string (YYYY-MM-DD), SocialPost[]>` keyed in local time.
- `buildMonthGrid(monthDate)` → array of 42 `Date` cells (6 weeks, starting Sunday) for month view.
- `buildWeekGrid(anchorDate)` → 7 `Date` cells.

### 3. New state
- `view: "month" | "week"` (default `"month"`)
- `cursor: Date` (the displayed month/week anchor; default = today or first scheduled post month)
- `expandedDay: string | null` (YYYY-MM-DD)

### 4. Empty state (when `posts.length === 0`)
Replace the current ABBY card + grid with a single ABBY-styled card:
- Sparkles icon, "ABBY" label
- Body: "Your social calendar is empty. Go to Social Media in Brand Products and click Activate — I'll schedule all your posts automatically."
- Button "Go to Social Media →" → `window.location.href = "/dashboard?section=brand-products"` (matches dashboard query-param routing per Core memory)
- Keep the Sync button row hidden in empty state to reduce noise (or keep it — I'll keep it for parity).

### 5. Summary row (above calendar, when posts exist)
Single Card with three inline stats:
- **Total posts scheduled:** `posts.length`
- **Platforms:** four chips (LinkedIn, Instagram, Facebook, X). Each shows ✅ if `connections` contains that platform, else greyed out with no checkmark.
- **Calendar runs until:** `lastScheduled` formatted as `MMM D, YYYY` (reuse existing `lastScheduled` computation).

### 6. View toggle + nav row
- Left: two buttons "Month" / "Week" (default + outline variants).
- Center: month/week label (e.g. "April 2026" or "Apr 14 – Apr 20, 2026").
- Right: ‹ Prev / Today / Next › buttons that shift `cursor` by 1 month or 7 days.
- Keep the existing platform filter chips row right below.

### 7. Calendar grid
**Month view** (default):
- 7-column grid with weekday headers (Sun–Sat).
- 6 rows of day cells. Each cell:
  - Date number top-left (muted if outside current month, ring if today).
  - Up to 3 colored dots (one per post that day, colored by platform). If >3 posts, show `+N`.
  - Post count badge bottom-right when ≥1.
  - Clickable → sets `expandedDay = YYYY-MM-DD`.
  - Highlights when `expandedDay` matches.
- Respect `filter` (existing platform filter) when computing dots.

**Week view**:
- Same 7-column grid, single row, taller cells, shows up to 5 mini post chips (colored bar + truncated content) instead of dots.

### 8. Expanded-day panel
When `expandedDay` is set, render a Card directly below the calendar:
- Header: formatted date + close (X) button.
- List of post cards for that day (filtered by platform filter), each showing:
  - Platform icon + capitalized name (existing `platformIcon`)
  - First 80 chars of content + ellipsis
  - Status badge (existing `statusBadge`)
  - Time (`HH:mm`) on the right
- If no posts that day: "No posts scheduled for this day."

### 9. Default expansion behavior
- On first load with posts, set `cursor` to month of the earliest queued post and leave `expandedDay = null`.

### Out of scope
- No edge function changes, no other files, no schema changes, no edit/delete actions on posts.

