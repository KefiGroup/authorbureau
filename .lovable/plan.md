

# Fix: Manuscript Upload Auth Mismatch

## Problem
`ManuscriptUpload.tsx` imports `supabase` from `@/integrations/supabase/client` (local Cloud), but users authenticate via the shared backend (`@/lib/shared-backend`). This means:

1. `supabase.auth.getUser()` fails (no session on local client) — the user sees an error
2. Even if it somehow got a user ID, the storage RLS policy checks `auth.uid()` from the local JWT, which won't match

## Solution

**Switch ManuscriptUpload to use the shared backend client** for auth operations, and **route the file upload through the parse-manuscript edge function** (which already has service role access and bypasses storage RLS).

### Changes:

**1. `src/components/dashboard/ManuscriptUpload.tsx`**
- Change import from `@/integrations/supabase/client` to `@/lib/shared-backend` for auth calls (`getUser`, `getSession`)
- For storage upload: instead of uploading client-side (which hits RLS), send the file as a `FormData` body to the `parse-manuscript` edge function
- For checking existing manuscripts and removal: use the shared backend client for auth, and call the edge function for storage operations

**2. `supabase/functions/parse-manuscript/index.ts`**
- Accept file upload directly via `FormData` (in addition to current JSON mode with `storagePath`)
- When a file is received directly, upload it to storage using the admin client (bypasses RLS), then proceed with parsing
- This eliminates the client-side storage upload entirely

### Alternative (simpler):
Instead of restructuring the edge function, just change ManuscriptUpload to use the shared backend client for auth, and upload to storage using the shared backend's service. But since storage is on the local Cloud project, this won't work either.

### Recommended approach:
The simplest fix is to make the `parse-manuscript` edge function accept the file directly as base64 or FormData, so the client never touches storage directly.

**File 1: `src/components/dashboard/ManuscriptUpload.tsx`**
- Import `supabase` from `@/lib/shared-backend` instead of `@/integrations/supabase/client`
- Change `handleFileSelect` to send the file directly to the edge function as FormData
- Change `checkExisting` to use shared backend auth for the token, then call the edge function for status
- Change `handleRemove` to call the edge function with a `remove` action

**File 2: `supabase/functions/parse-manuscript/index.ts`**
- Add support for receiving files via FormData (multipart)
- Handle storage upload server-side with the admin client
- Add a `check` action to query existing source_material
- Add a `remove` action to delete source_material and storage files

### Technical Details

The edge function will accept three modes:
- **POST with FormData** (file + bookId + fileName): Upload to storage + parse
- **POST with JSON** `{ action: "check", bookId }`: Return existing manuscript status
- **POST with JSON** `{ action: "remove", bookId }`: Delete manuscript + storage files

The client will use `supabase` from `@/lib/shared-backend` exclusively for `getSession()` to obtain the auth token, then call the edge function URL directly with `fetch()`.

