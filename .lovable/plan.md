## Goal

Reset Pauline Teo's two books to a fresh "Step 1" state across all 28 nodes so we exercise the post-Sprint-54 architecture end-to-end (uniform `library_asset` readiness, commerce 8%, canonical labels, payout/commerce separation, ABBY engines, GHL-free flows). Keep the books, the author profile, the login, and storage files.

## Scope of wipe

Author profile: Pauline Teo (`92326a2f-3ed0-4873-a8cf-7a0b1350995a`)
Books: Be SUCKcessful (`e5b857ac…`), Invest Like Buffett for Parents (`3c65a5f1…`)

**Delete (counts):**

| Table | Rows |
|---|---|
| author_nodes | 28 |
| marketing_assets | 128 |
| email_flows (+ steps + enrollments) | 29 |
| social_posts | 20 |
| funnels (+ submissions, stage_overrides) | 5 |
| courses (+ modules, lessons, quizzes, deliverables, enrollments) | 2 |
| audiobooks | 1 |
| membership_content | 1 |
| leads (+ lead_activities) | 12 |
| generated_assets, generated_emails, email_campaigns, social_media_content, workbooks, home_study_courses, crm_contacts, crm_activity_log, crm_contact_tags, email_lists, email_send_log/logs/state, email_unsubscribe_tokens, email_sync_log (Pauline rows only), funnel_submissions, course_*, content_quality_log | as present |

**Keep (untouched):**
- `auth.users` (Pauline's login)
- `author_profiles` (her profile + slug + brand kit)
- `author_email_settings` (reply-to, sender name)
- `books` (both rows, manuscript URLs, approval state, slug)
- `manuscripts` storage bucket
- All other storage buckets (orphaned files left in place per your decision)
- `purchases`, `author_payouts*`, `payout_batches` (already empty)

## Execution

One destructive SQL transaction, child tables before parent tables, scoped strictly by Pauline's `author_profile.id`, her `user_id`, and her two `book_id`s. Wrapped in `BEGIN; … COMMIT;` so a failure mid-way leaves nothing half-deleted.

After the wipe, a verification query re-runs the same counts; expectation = all zero except the keeps.

## Post-wipe sanity check

1. Log in as Pauline → dashboard loads, both books visible, all 28 nodes show "Build Now" (status=`draft`, 0% Live).
2. Open BP-06 Workbook builder → empty form, Step 1.
3. Open Marketing Hub → no campaigns, no social posts.
4. Open Revenue → no purchases, no payouts.
5. Run `scripts/audit-stuck-live.mjs` → 0 stuck-Live rows.

## Reversibility

Once committed there is no undo from inside the app. If you want a safety net, I can dump the deleted rows to `/mnt/documents/pauline-pre-wipe-backup.sql` first (recommended; ~30 seconds extra). Tell me yes/no when you approve and I'll include it.

## Files / artifacts

No code changes. One data migration file containing the DELETEs (and optional pre-dump). No edge function changes. No memory or doc updates needed — the architecture is already documented; this is a data reset.
