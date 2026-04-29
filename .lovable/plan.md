# Display-Only BP Chip Renumber for Brand Tab

## Goal
Make the Brand tab read as one continuous sequence:

| Position | Chip | Card | Group |
|---|---|---|---|
| 1 | BP-01 | Email Marketing | Branding & Marketing |
| 2 | BP-02 | Lead Magnets | Branding & Marketing |
| 3 | BP-03 | Social Media | Branding & Marketing |
| 4 | BP-04 | Website | Branding & Marketing |
| 5 | BP-05 | Webinars | Branding & Marketing |
| 6 | **BP-06** | **Book Sales** (Live Audience Toolkit) | **Branding & Marketing** |
| 7 | **BP-07** | Workbook | Digital Products |
| 8 | **BP-08** | Home Study Course | Digital Products |
| 9 | BP-09 | Special Editions | Digital Products |

This is **purely the visible chip + grouping**. Internal `author_nodes.node_id` storage strings, edge function names, microsite slugs, builder filenames, and DB rows stay untouched.

## Files to change

### 1. `src/hooks/useBookNodeProgress.ts` — `NODE_CODE_MAP`
Renumber the visible chip codes:
- `book-sales-events`: `BP-08` → `BP-06`
- `workbooks`: `BP-06` → `BP-07`
- `home-study`: `BP-07` → `BP-08`
- `special-editions`: `BP-09` (unchanged)

### 2. `src/config/abbyFrameworkConfig.ts` — move Book Sales into Branding & Marketing
For the `book-sales-events` node:
- Change `subCategory: "Digital Products"` → `subCategory: "Branding & Marketing"`
- Keep `sequence: 6`

Workbook (7), Home Study (8), Special Editions (9) keep current sequence and stay in `Digital Products`.

### 3. Sort verification
`PortfolioStepView.tsx` (line ~202) already sorts each subCategory group by `code` with natural numeric compare. After step 1, Branding & Marketing chips sort BP-01..BP-06 and Digital Products sort BP-07..BP-09 — exactly the desired order.

## What does NOT change
- `author_nodes.node_id` storage values (no DB migration).
- Edge function names like `generate-bp05-webinars`.
- Microsite slugs in `node-slug-map.ts`.
- Builder filenames `BP06Builder.tsx`..`BP09Builder.tsx` and the storage `node_id` strings they upsert.
- Routing in `AuthorDashboard.tsx` — `?section=book-sales` already routes to the Book Sales builder from the previous fix.

## Risk
Zero data risk. Only the visible chip text and one card's group change. All persistence layers continue to use existing storage IDs.
