

# Fix — Thinkific-ready export + ordered "What's Live" sequence

## What you're asking for
1. On the Home Study Distribution card, give the author a **Thinkific-loadable file** (not just a generic PDF) plus the live `thinkific.com` link they can paste into.
2. On the **Connected Accounts → What's Live** list, show the live nodes **in the ABBY journey sequence** (BP-01 → BP-09 → BA-10 → BA-18 → YR-19 → YR-28), not in random order as they currently appear.

---

## Fix A — Thinkific-ready export from BP-07

**File:** `src/lib/builder-pdf.ts` (add helper) and `src/components/dashboard/builders/bp07/HomeStudyDistributionCard.tsx`

Add a new exporter `downloadThinkificPackage({ content })` that generates a **ZIP bundle** containing:
- `thinkific-course-import.csv` — Thinkific's "Bulk Import Lessons" CSV format with one row per day:
  - Columns: `Chapter Name`, `Lesson Name`, `Lesson Type` (Text), `Lesson Content` (HTML body of the day), `Is Free Preview` (FALSE except Day 1)
- `course-description.txt` — programme title, transformation promise, tagline (paste into Thinkific course landing page)
- `lessons/` folder — one `Day-XX.html` file per day, pre-formatted with headings/exercises so the author can paste a single lesson at a time if they prefer manual entry over CSV
- `README.txt` — 5-line instruction: "1. Log in to Thinkific. 2. Create a new course. 3. Settings → Bulk Import → upload `thinkific-course-import.csv`. 4. Paste `course-description.txt` into Course Landing Page. 5. Publish."

Use `jszip` (already in the project from other exports — confirm during impl).

In `HomeStudyDistributionCard.tsx`:
- Replace the current single "Download package" button with **two buttons**:
  - `Download Thinkific bundle (.zip)` → calls `downloadThinkificPackage(...)` (primary)
  - `Download PDF (printable)` → keeps existing `downloadBuilderPackage(...)` for offline/printable use
- Tighten the instruction list to match the CSV flow:
  1. Download the Thinkific bundle below
  2. Log in at `thinkific.com` and create a new course
  3. Go to **Bulk Import Lessons** → upload `thinkific-course-import.csv`
  4. Paste `course-description.txt` into the Course Landing Page
  5. Copy your Thinkific course URL back here so buyers receive it
- Keep the existing **Open Thinkific →** button (links to `https://www.thinkific.com/`)
- Keep the **"Your Thinkific URL"** input row with copy button

This gives the author a real Thinkific-loadable artifact instead of a generic PDF, while staying honest that we don't push to Thinkific via API.

---

## Fix B — Order "What's Live" by the ABBY journey sequence

**File:** `src/components/settings/ConnectedAccountsTab.tsx`

Currently nodes load from `author_nodes` and render in whatever order Postgres returns. Change to:

1. Define `NODE_SEQUENCE` array (single source of truth, matches the 9-9-10 progression):
   ```
   BP-01, BP-02, BP-03, BP-04, BP-05, BP-06, BP-07, BP-08, BP-09,
   BA-10, BA-11, BA-12, BA-13, BA-14, BA-15, BA-16, BA-17, BA-18,
   YR-19, YR-20, YR-21, YR-22, YR-23, YR-24, YR-25, YR-26, YR-27, YR-28
   ```
2. After fetching, sort `nodes` by `NODE_SEQUENCE.indexOf(node.node_id)` (unknown IDs go to the bottom).
3. Group visually with three subheaders:
   - **Brand Products** (BP-01 → BP-09)
   - **Build Authority** (BA-10 → BA-18)
   - **Yield Revenue** (YR-19 → YR-28)
4. If a group has zero live nodes, hide its subheader entirely (keeps the panel clean for early-stage authors).
5. Keep the existing per-row layout (rocket icon + node_name + Live badge).

This matches the ABBY Journey Framework already documented in memory (`abby-journey-framework-comprehensive-specs`) and gives the author a clear "where am I in the build journey" view instead of a random list.

---

## Out of scope
- Real Thinkific API push — the existing `deploy-bp07-to-thinkific` placeholder logic stays as-is. We're improving the manual/self-serve path only.
- Reordering anywhere else (sidebar, dashboard) — those already follow node sequence; only the Connections panel needs this fix.

## Files to change
- `src/lib/builder-pdf.ts` — add `downloadThinkificPackage` (or new `src/lib/builder-thinkific-export.ts` if cleaner)
- `src/components/dashboard/builders/bp07/HomeStudyDistributionCard.tsx` — two-button export + tightened CSV instructions
- `src/components/settings/ConnectedAccountsTab.tsx` — sequence ordering + grouped subheaders

## Validation
1. From a live BP-07, click **Download Thinkific bundle** → ZIP downloads with CSV + description + per-day HTML + README
2. Open the CSV — has 21 rows (or N rows = number of generated days), correct columns, content populated
3. Open Account Settings → Connected Accounts → Live nodes appear grouped under Brand / Build / Yield in correct numeric order
4. With only Brand-tier nodes live, only the Brand Products group renders

