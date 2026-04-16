

# Multi-Author Quiz Email Architecture Fix

## Problem
The quiz result email pipeline has hardcoded references to Pauline Teo's book ("Be SUCKcessful"), her methodology ("SUCKCESS"), and her stage descriptions. When a second author activates BP-02, their readers would receive Pauline's branding.

## Current State (What Already Works)
- `microsite-action` already pulls `pen_name` from `author_profiles` and `title`/`amazon_url` from `books` dynamically
- The email template (`quiz-result.tsx`) accepts `penName`, `bookTitle`, `bookUrl` as props — these are already dynamic

## What's Still Hardcoded (Must Fix)

| Item | Location | Current Value | Fix |
|------|----------|---------------|-----|
| Fallback book title | `microsite-action/index.ts:266` | `"Be SUCKcessful"` | Change to generic `"the book"` |
| Fallback book URL | `microsite-action/index.ts:267` | Pauline's Amazon link | Change to `""` (template hides CTA if empty) |
| Template default `bookTitle` | `quiz-result.tsx:34` | `"Be SUCKcessful"` | Change to `"the book"` |
| Template default `bookUrl` | `quiz-result.tsx:35` | Pauline's Amazon link | Change to `""` |
| Template default `penName` | `quiz-result.tsx:33` | `"the author"` | Keep (this is already generic) |
| Stage descriptions map | `quiz-result.tsx:16-27` | 6 SUCKCESS-specific stages | Make dynamic — pass `stageMessage` from microsite-action |
| `SUCKCESS` regex in stage normalisation | `microsite-action/index.ts:254` | `.replace(/Suckcess/gi, "SUCKCESS")` | Remove — stage names should come correctly capitalised from the quiz config |
| Activity log string | `microsite-action/index.ts:195` | `"Completed SUCKCESS Quiz"` | Change to `"Completed quiz"` or use quiz name from DB |
| Activity log string | `microsite-action/index.ts:241` | References "quiz_completed" | Already generic — OK |
| Template `previewData` | `quiz-result.tsx:74-81` | Pauline's data | Keep (preview-only, not user-facing) |

## Implementation Steps

### Step 1 — Make stage descriptions dynamic
In `microsite-action/index.ts`, after fetching the book data, look up the lead magnet's generated content for this author's BP-02 quiz to get stage descriptions. If a `stageMessage` can be resolved from stored quiz result tiers, pass it to the email template. If not available, the template falls back to a generic message.

### Step 2 — Remove Pauline-specific hardcoding from microsite-action
- Remove the `SUCKCESS` regex replacement (line 254) — just do basic title-case normalisation
- Change fallback book title to `"the book"` and fallback URL to `""`
- Change activity log from `"Completed SUCKCESS Quiz"` to `"Completed quiz"`

### Step 3 — Update quiz-result email template
- Remove the hardcoded `stageDescriptions` map (lines 16-27)
- Use the `stageMessage` prop passed from microsite-action; if absent, use a generic fallback message
- Change default `bookTitle` to `"the book"` and `bookUrl` to `""`
- If `bookUrl` is empty, hide the CTA button entirely

### Step 4 — Deploy both edge functions
Deploy `microsite-action` and `send-transactional-email`.

## What This Does NOT Change
- Sender name ("Authors Bureau") and from address — already correct and universal
- The template's visual design — stays the same
- Pauline's live quiz — her data is already in the DB, so her emails will continue to work correctly with dynamic lookups

## Technical Detail
No database migrations needed. The `author_profiles.pen_name`, `books.title`, and `books.amazon_url` columns already exist and are populated. Stage descriptions will use the `stageMessage` prop (already defined in the template interface) as the primary source, with a generic fallback.

