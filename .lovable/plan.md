

# Allow Deletion of Book Microsites

## Overview

Add a delete button to each book card in the "My Books" dashboard section, with a confirmation dialog to prevent accidental deletion.

## Changes

### 1. Add delete action to the `list-my-books` edge function

Extend `supabase/functions/list-my-books/index.ts` to accept an optional `action` field in the request body:
- No action or `action: "list"` -- current behavior (list books)
- `action: "delete"` with `bookId` -- deletes the book, but only if `author_id` matches the authenticated user

This keeps the auth resolution logic (shared + cloud) in one place and avoids creating a new function.

### 2. Add delete UI to `src/components/dashboard/MyBooks.tsx`

- Import `Trash2` icon from lucide-react and the `AlertDialog` component
- Add a `handleDelete` function that calls the edge function with `action: "delete"` and `bookId`
- Add a small trash icon button on each book card (bottom-right of the actions area)
- Wrap with an `AlertDialog` confirmation: "Delete this microsite? This action cannot be undone."
- Show loading state during deletion
- Refresh book list after successful deletion

### Visual placement

The delete button will appear as a subtle icon button next to the existing "Publish Microsite" or "View Microsite" link, styled with a destructive/muted color that becomes more prominent on hover.

## Files to modify

- `supabase/functions/list-my-books/index.ts` -- add delete action handling
- `src/components/dashboard/MyBooks.tsx` -- add delete button with confirmation dialog

