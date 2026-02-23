

# Fix ProfileEditor Reading from Wrong Database

## Root Cause

The `ProfileEditor` component imports its Supabase client from `@/lib/shared-backend` (the PublishNow shared database), but the `sync-author-profile` edge function writes synced data to the **Cloud database** (this project's own backend). The editor has been reading from the wrong database the entire time, which is why it always shows empty fields -- the shared backend has the raw profiles, but the synced/mapped data lives in the Cloud database.

## Fix

### 1. Change the database import in `ProfileEditor.tsx`

On line 3, change:
```typescript
import { supabase } from "@/lib/shared-backend";
```
to:
```typescript
import { supabase } from "@/integrations/supabase/client";
```

And remove the now-unused cloud import on line 4:
```typescript
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
```

Since the main `supabase` import now IS the cloud client, the `cloudSupabase` alias is no longer needed. Update the one usage of `cloudSupabase` (line 240, fetching book titles for bio generation) to use `supabase` instead.

### 2. Photo upload storage bucket

The photo upload on line 206 uses `supabase.storage` -- this will now correctly point to the Cloud storage bucket (`author-photos`) which already exists and is public. No changes needed here.

## Files to modify

- `src/components/dashboard/ProfileEditor.tsx` -- switch database client from shared backend to Cloud

## What this fixes

- Profile data (pen name, bio, tagline, LinkedIn, etc.) synced by the edge function will now be visible in the editor
- Saves will write to the same database the sync writes to
- Photo uploads will continue working with the Cloud storage bucket
