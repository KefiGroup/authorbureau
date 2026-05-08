---
name: Author ID Resolution
description: books.author_id and every public.*.author_id FK to author_profiles.id, NOT auth.users.id — edge fns must resolve via _shared/resolve-author-id.ts
type: constraint
---

**Rule**: `books.author_id`, `generated_assets.author_id`, `author_nodes.author_id`, `courses.author_id`, `audiobooks.author_id`, `email_flows.author_id`, `author_subscribers.author_id`, `email_campaigns.author_id`, `social_media_content.author_id`, `coaching_packages.author_id`, `speaking_topics.author_id`, `workbooks.author_id`, `webinars.author_id`, `home_study_courses.author_id`, `author_email_settings.author_id` — all foreign-key to **`author_profiles.id`**, NOT `auth.users.id`.

**Why**: Old accounts happened to have matching UUIDs (`user_id == author_profiles.id`), so `.eq("author_id", user.id)` silently worked. For every newer account (Veronica and on) the two are different — the query returns zero rows, and from the user's POV "Abby can't see my book."

**How to apply**: In every edge function, after resolving `user`, do:
```ts
import { resolveAuthorId } from "../_shared/resolve-author-id.ts";
const authorId = (await resolveAuthorId(adminClient, user.id, user.email)) || user.id;
```
Then use `authorId` for every `.eq("author_id", …)` and every `author_id:` insert/upsert. NEVER pass `user.id` to an `author_id` column.

**Guard rail**: `src/lib/__tests__/edge-fn-author-id.test.ts` fails the build if the forbidden pattern reappears.

**Sprint 60 (Veronica fix)** swept these 10 functions: abby-builder-generate, business-consultant, abby-execute, distribute-audiobook, elevenlabs-tts-audiobook, elevenlabs-tts-audiobook-v2, extract-frameworks, populate-assets, send-campaign, sync-subscribers.
