

# Seamless Audiobook Save & Distribute Flow

## Overview

Build a post-generation "Review & Distribute" workflow into the existing `AudiobookStudio.tsx` component, plus a 3-step distribution modal and a new edge function to package and send audiobook data to PublishNow.

## Architecture

```text
AudiobookStudio.tsx
  ├─ Post-generation chapter list (already exists, section 3)
  ├─ "Save & Distribute Audiobook" CTA (new, shown when all chapters done)
  └─ DistributeAudiobookModal.tsx (new component)
       ├─ Step 1: Narrator & Preview Chapter selection
       ├─ Step 2: Metadata & Cover Art review
       └─ Step 3: Confirmation & Send

Edge Function: distribute-audiobook/index.ts (new)
  └─ Packages manifest + sends to PublishNow shared backend

Database: audiobooks table update (status → 'distributing' / 'distributed')
```

## Changes

### 1. New Component: `src/components/dashboard/audiobook/DistributeAudiobookModal.tsx`

A `Dialog`-based 3-step modal:

**Step 1 — Narrator & Preview**
- Text input for narrator credit, pre-filled with "Narrated by a digital voice using ElevenLabs technology"
- Dropdown to select a chapter for the 5-min storefront preview
- Help text explaining the preview purpose

**Step 2 — Metadata & Cover Art**
- Read-only: book title, author name (from book/profile data)
- Editable: book description textarea
- Cover art display with "Upload New Cover" button (uses existing `book-covers` bucket)

**Step 3 — Confirm & Send**
- Summary of package (chapter count, cover, metadata)
- Mandatory rights confirmation checkbox
- "Send to PublishNow" button (disabled until checkbox ticked)
- On click: calls `distribute-audiobook` edge function, then shows success state

**Post-send state**: Modal closes, studio shows "Distribution in Progress" banner with link to PublishNow.

### 2. Modify: `src/components/dashboard/AudiobookStudio.tsx`

- Add `distributionStatus` state (tracks `'idle' | 'distributing' | 'distributed'`)
- When `doneCount === chapters.length && chapters.length > 0`, show a prominent "Save & Distribute Audiobook" button above the chapter list
- When `distributionStatus === 'distributed'`, replace main content with a congratulations banner and "Go to AI Publishing Studio" button
- Load existing audiobook record on mount to check if already distributed
- Import and render `DistributeAudiobookModal`

### 3. New Edge Function: `supabase/functions/distribute-audiobook/index.ts`

- Authenticates via JWT (`supabase.auth.getUser()`)
- Accepts: `bookId`, `narratorCredit`, `previewChapterIndex`, `description`, `coverImageUrl`
- Fetches book data, author profile, and chapter audio URLs from storage
- Builds a manifest JSON with all metadata
- Calls PublishNow shared backend via `SHARED_BACKEND_SERVICE_ROLE_KEY` to submit the audiobook package (POST to a distribution endpoint with `source_platform: "authorsbureau"`)
- Updates local `audiobooks` table: sets `status = 'distributing'`
- Returns success/failure

### 4. Database Migration

Update the `audiobooks` table to support distribution tracking:

```sql
ALTER TABLE public.audiobooks 
  ADD COLUMN IF NOT EXISTS distribution_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS narrator_credit text,
  ADD COLUMN IF NOT EXISTS preview_chapter_index integer,
  ADD COLUMN IF NOT EXISTS distribution_manifest jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS distributed_at timestamptz;
```

### 5. Props & Data Flow

- `DistributeAudiobookModal` receives: `bookId`, `bookTitle`, `userId`, `chapters` (with audio URLs), book metadata (description, cover, author name), and an `onDistributed` callback
- Book metadata is fetched from the `books` table on modal open
- Author name comes from the `books.author_name` field
- Cover art from `books.cover_image_url`

### 6. Enterprise Gate

The "Save & Distribute" button checks the user's subscription tier. Only Enterprise ($499/mo) users see it enabled; others see a locked state with "Upgrade to Enterprise" prompt, consistent with the existing tier access matrix.

