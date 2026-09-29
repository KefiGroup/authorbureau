---
name: Author welcome flow mode (BP-01)
description: Author-level master welcome sequence with optional per-book welcome sequences, chosen via author_email_settings.welcome_flow_mode
type: feature
---

- `email_flows` BP-01 rows: MASTER = `book_id IS NULL` (one per author); BOOK = `book_id = <book>` (one per book). Legacy `uniq_node_flow_per_author` constraint was dropped because it blocked per-book rows.
- `author_email_settings.welcome_flow_mode` = `master` (default) | `book_specific`. Authors switch it in Email Marketing via `WelcomeFlowModeCard`.
- Book-specific mode falls back to the master flow when a book has no active sequence, so nobody is left without a welcome.
- BP-01 publish has a "Make this my main welcome sequence" toggle; it writes `set_as_master_welcome` into the node content, which `syncBp01Flow` uses to overwrite the master. Publishing a book never wipes another book's sequence.
- All of this is owned by `_shared/bp01-flow-sync.ts` (`syncBp01Flow`, `ensureBp01FlowActive`, `resolveWelcomeFlowIds`); enroll-subscriber self-heals on every sign-up.
