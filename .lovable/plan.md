

# Unpublish Microsite Instead of Deleting Book

## Problem

The current "delete" action removes the entire book record from the database. The user wants to only take down the microsite (unpublish) while keeping the book data intact.

## Changes

### 1. Update `supabase/functions/list-my-books/index.ts`

Replace the `action: "delete"` handler with `action: "unpublish"`:
- Instead of deleting the row, set `published_at` to `null` on the matching book
- This removes the public microsite at `/books/:slug` while preserving all book data

### 2. Update `src/components/dashboard/MyBooks.tsx`

- Rename `handleDelete` to `handleUnpublish`
- Change the edge function call to send `action: "unpublish"` instead of `action: "delete"`
- Update the confirmation dialog text:
  - Title: "Take down this microsite?"
  - Description: "This will unpublish the microsite for '[title]'. The book will remain in your dashboard and can be re-published later."
- Only show the unpublish button on published books (where `published_at` is not null)
- Change the icon/button styling to be less destructive (e.g., keep `Trash2` or switch to a more appropriate icon like `GlobeLock` or `EyeOff`)
- Update toast message to "Microsite taken down" instead of "Book deleted"

## Files to modify

- `supabase/functions/list-my-books/index.ts` -- change delete to unpublish (set `published_at = null`)
- `src/components/dashboard/MyBooks.tsx` -- update UI labels, confirmation text, and only show on published books

