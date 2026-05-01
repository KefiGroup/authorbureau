# 05 · AB Database Schema — Current

_Version: 2026-05-01 · Verified by Sprint 53 (audit + targeted rewrite)_

Live export of all tables and columns in the `public` schema, generated directly from `information_schema.columns`. **109** tables, **1311** columns total.

> Regenerate with `node scripts/build-docs.mjs` after every migration.

## Index

- [abby_conversations](#abby_conversations) (5 cols)
- [abby_nudges](#abby_nudges) (9 cols)
- [admin_audit_log](#admin_audit_log) (8 cols)
- [ai_usage_logs](#ai_usage_logs) (10 cols)
- [audiobooks](#audiobooks) (20 cols)
- [auth_uid_warnings](#auth_uid_warnings) (5 cols)
- [author_annual_statements](#author_annual_statements) (8 cols)
- [author_applications](#author_applications) (9 cols)
- [author_context](#author_context) (14 cols)
- [author_earnings](#author_earnings) (12 cols)
- [author_email_settings](#author_email_settings) (12 cols)
- [author_nodes](#author_nodes) (26 cols)
- [author_payout_settings](#author_payout_settings) (10 cols)
- [author_payouts](#author_payouts) (17 cols)
- [author_payouts_v2](#author_payouts_v2) (16 cols)
- [author_profiles](#author_profiles) (55 cols)
- [author_profiles_public](#author_profiles_public) (29 cols)
- [author_profiles_safe](#author_profiles_safe) (33 cols)
- [author_revenue_snapshots](#author_revenue_snapshots) (10 cols)
- [author_subscribers](#author_subscribers) (10 cols)
- [author_testimonials](#author_testimonials) (9 cols)
- [books](#books) (35 cols)
- [books_public](#books_public) (27 cols)
- [bug_reports](#bug_reports) (14 cols)
- [chat_sessions](#chat_sessions) (5 cols)
- [coaching_packages](#coaching_packages) (12 cols)
- [consultation_sessions](#consultation_sessions) (7 cols)
- [contact_messages](#contact_messages) (11 cols)
- [content_quality_log](#content_quality_log) (8 cols)
- [course_deliverables](#course_deliverables) (9 cols)
- [course_enrollments](#course_enrollments) (8 cols)
- [course_lessons](#course_lessons) (8 cols)
- [course_modules](#course_modules) (15 cols)
- [course_quizzes](#course_quizzes) (8 cols)
- [courses](#courses) (22 cols)
- [crm_activity_log](#crm_activity_log) (6 cols)
- [crm_contact_tags](#crm_contact_tags) (5 cols)
- [crm_contacts](#crm_contacts) (19 cols)
- [cross_builder_pushes](#cross_builder_pushes) (16 cols)
- [email_campaigns](#email_campaigns) (15 cols)
- [email_flow_enrollments](#email_flow_enrollments) (10 cols)
- [email_flow_steps](#email_flow_steps) (10 cols)
- [email_flows](#email_flows) (14 cols)
- [email_lists](#email_lists) (8 cols)
- [email_send_log](#email_send_log) (14 cols)
- [email_send_logs](#email_send_logs) (11 cols)
- [email_send_state](#email_send_state) (7 cols)
- [email_sync_log](#email_sync_log) (11 cols)
- [email_templates](#email_templates) (8 cols)
- [email_unsubscribe_tokens](#email_unsubscribe_tokens) (5 cols)
- [feature_requests](#feature_requests) (8 cols)
- [feedback](#feedback) (10 cols)
- [funnel_stage_overrides](#funnel_stage_overrides) (7 cols)
- [funnel_submissions](#funnel_submissions) (14 cols)
- [funnels](#funnels) (20 cols)
- [generated_assets](#generated_assets) (10 cols)
- [generated_emails](#generated_emails) (15 cols)
- [home_study_courses](#home_study_courses) (16 cols)
- [lead_activities](#lead_activities) (6 cols)
- [leads](#leads) (19 cols)
- [link_audit_v](#link_audit_v) (14 cols)
- [marketing_assets](#marketing_assets) (8 cols)
- [membership_content](#membership_content) (14 cols)
- [module_progress](#module_progress) (9 cols)
- [newsletter_signups](#newsletter_signups) (4 cols)
- [node_gating](#node_gating) (6 cols)
- [notifications](#notifications) (7 cols)
- [nurture_events](#nurture_events) (5 cols)
- [payout_batches](#payout_batches) (10 cols)
- [platform_config](#platform_config) (3 cols)
- [podcast_episodes](#podcast_episodes) (21 cols)
- [podcasts](#podcasts) (22 cols)
- [profiles](#profiles) (6 cols)
- [purchases](#purchases) (20 cols)
- [quiz_responses](#quiz_responses) (6 cols)
- [rate_limits](#rate_limits) (4 cols)
- [reader_badges](#reader_badges) (6 cols)
- [reader_profiles](#reader_profiles) (11 cols)
- [reader_progress](#reader_progress) (6 cols)
- [reader_start_dates](#reader_start_dates) (5 cols)
- [reading_challenge_daily_logs](#reading_challenge_daily_logs) (5 cols)
- [reading_challenge_entries](#reading_challenge_entries) (6 cols)
- [reading_challenges](#reading_challenges) (13 cols)
- [reading_club_challenge_participants](#reading_club_challenge_participants) (5 cols)
- [reading_club_challenges](#reading_club_challenges) (7 cols)
- [reading_club_discussions](#reading_club_discussions) (6 cols)
- [reading_club_featured_books](#reading_club_featured_books) (5 cols)
- [reading_club_members](#reading_club_members) (6 cols)
- [reading_logs](#reading_logs) (7 cols)
- [service_inquiries](#service_inquiries) (9 cols)
- [social_connections](#social_connections) (21 cols)
- [social_media_content](#social_media_content) (16 cols)
- [social_posts](#social_posts) (17 cols)
- [speaking_topics](#speaking_topics) (9 cols)
- [special_edition_bonus_content](#special_edition_bonus_content) (8 cols)
- [special_edition_bundles](#special_edition_bundles) (9 cols)
- [special_edition_marketing](#special_edition_marketing) (10 cols)
- [special_editions](#special_editions) (27 cols)
- [subscriptions](#subscriptions) (16 cols)
- [suppressed_emails](#suppressed_emails) (5 cols)
- [system_error_log](#system_error_log) (12 cols)
- [testimonials](#testimonials) (10 cols)
- [training_deliverables](#training_deliverables) (9 cols)
- [training_modules](#training_modules) (16 cols)
- [training_programs](#training_programs) (17 cols)
- [user_roles](#user_roles) (3 cols)
- [webinar_registrations](#webinar_registrations) (14 cols)
- [webinars](#webinars) (21 cols)
- [workbooks](#workbooks) (15 cols)

## Storage buckets

| Bucket | Public |
|---|---|
| author-photos | Yes |
| book-covers | Yes |
| email-assets | Yes |
| manuscripts | No |
| audiobook-audio | Yes |
| social-media-graphics | Yes |
| course-videos | Yes |
| payouts | No |

## Database functions

The following `SECURITY DEFINER` functions are defined in `public`. See the source-of-truth section for full bodies.

- `admin_acknowledge_errors`
- `admin_error_summary`
- `admin_resolve_errors`
- `admin_send_broadcast`
- `admin_set_author_suspension`
- `admin_set_author_tier`
- `author_nodes_autofill_delivery_url`
- `author_nodes_scrub_content`
- `books_after_status_change`
- `bug_reports_set_sla`
- `check_rate_limit`
- `compute_node_microsite_url`
- `crm_contacts_autofill_archetype`
- `delete_email`
- `detect_microsite_violations`
- `enqueue_email`
- `generate_account_id`
- `generate_course_slug`
- `generate_unique_author_slug`
- `get_author_curated_book_id`
- `get_reading_leaderboard`
- `handle_new_user`
- `has_role`
- `list_author_profile_orphans`
- `move_to_dlq`
- `notify_all_admins`
- `notify_users`
- `read_email_batch`
- `scrub_microsite_jsonb`
- `sync_email_change_to_downstream`
- `trigger_generate_asset_pack`
- `update_reading_streak`
- `update_updated_at_column`
- `validate_reading_challenge_status`
- `warn_ghost_author_uid`

---

## Tables

### abby_conversations

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `role` | text | NO | — |
| `content` | text | NO | — |
| `created_at` | timestamp with time zone | YES | `now()` |

### abby_nudges

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `nudge_type` | text | NO | — |
| `title` | text | NO | — |
| `content` | text | NO | — |
| `action_label` | text | YES | — |
| `action_url` | text | YES | — |
| `is_read` | boolean | YES | `false` |
| `created_at` | timestamp with time zone | YES | `now()` |

### admin_audit_log

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `actor_id` | uuid | YES | — |
| `actor_email` | text | YES | — |
| `event_key` | text | NO | — |
| `target_type` | text | YES | — |
| `target_id` | text | YES | — |
| `payload` | jsonb | YES | `'{}'::jsonb` |
| `created_at` | timestamp with time zone | NO | `now()` |

### ai_usage_logs

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `feature` | text | NO | — |
| `model` | text | NO | `'unknown'::text` |
| `input_tokens` | integer | NO | `0` |
| `output_tokens` | integer | NO | `0` |
| `total_tokens` | integer | NO | `0` |
| `cost_estimate` | numeric | YES | `0` |
| `book_id` | uuid | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### audiobooks

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `book_id` | uuid | NO | — |
| `source_asset_id` | uuid | YES | — |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `script_markdown` | text | NO | `''::text` |
| `audio_url` | text | YES | — |
| `duration_minutes` | integer | YES | — |
| `narrator_type` | text | YES | `'author'::text` |
| `price` | numeric | YES | `0` |
| `currency` | text | YES | `'USD'::text` |
| `status` | text | NO | `'draft'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |
| `distribution_status` | text | YES | `'none'::text` |
| `narrator_credit` | text | YES | — |
| `preview_chapter_index` | integer | YES | — |
| `distribution_manifest` | jsonb | YES | `'{}'::jsonb` |
| `distributed_at` | timestamp with time zone | YES | — |

### auth_uid_warnings

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_profile_id` | uuid | YES | — |
| `user_id` | uuid | NO | — |
| `note` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### author_annual_statements

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `tax_year` | integer | NO | — |
| `total_gross_usd` | numeric | NO | `0` |
| `total_net_paid_usd` | numeric | NO | `0` |
| `pdf_storage_path` | text | NO | — |
| `generated_at` | timestamp with time zone | NO | `now()` |
| `emailed_at` | timestamp with time zone | YES | — |

### author_applications

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `full_name` | text | NO | — |
| `email` | text | NO | — |
| `website_url` | text | YES | — |
| `amazon_book_url` | text | NO | — |
| `bio` | text | YES | — |
| `genres` | text | YES | — |
| `status` | text | NO | `'pending'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |

### author_context

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `book_title` | text | NO | — |
| `book_subtitle` | text | YES | — |
| `core_thesis` | text | NO | — |
| `key_frameworks` | jsonb | YES | `'[]'::jsonb` |
| `target_audience_persona` | jsonb | YES | `'{}'::jsonb` |
| `unique_insights` | jsonb | YES | `'[]'::jsonb` |
| `commercial_angles` | jsonb | YES | `'{}'::jsonb` |
| `competitor_books` | jsonb | YES | `'[]'::jsonb` |
| `manuscript_url` | text | YES | — |
| `parsed_at` | timestamp with time zone | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `book_id` | uuid | YES | — |

### author_earnings

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `purchase_id` | uuid | NO | — |
| `gross_usd` | numeric | NO | — |
| `stripe_fee_usd` | numeric | NO | `0` |
| `platform_fee_usd` | numeric | NO | `0` |
| `net_usd` | numeric | NO | — |
| `earned_at` | timestamp with time zone | NO | `now()` |
| `payout_id` | uuid | YES | — |
| `paid_out` | boolean | NO | `false` |
| `refunded` | boolean | NO | `false` |
| `created_at` | timestamp with time zone | NO | `now()` |

### author_email_settings

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `sender_name` | text | NO | `''::text` |
| `reply_to_email` | text | YES | — |
| `subdomain` | text | YES | — |
| `domain_verified` | boolean | NO | `false` |
| `resend_domain_id` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |
| `verification_token` | text | YES | — |
| `verification_sent_at` | timestamp with time zone | YES | — |
| `verified_at` | timestamp with time zone | YES | — |

### author_nodes

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `node_id` | text | NO | — |
| `node_name` | text | NO | — |
| `personalised_name` | text | YES | — |
| `status` | text | NO | `'locked'::text` |
| `content_json` | jsonb | YES | — |
| `activated_at` | timestamp with time zone | YES | — |
| `revenue_to_date` | numeric | NO | `0` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `microsite_url` | text | YES | — |
| `third_party_url` | text | YES | — |
| `payment_link` | text | YES | — |
| `marketing_activated_at` | timestamp with time zone | YES | — |
| `current_step` | integer | YES | `1` |
| `workbook_pdf_url` | text | YES | — |
| `stripe_product_id` | text | YES | — |
| `stripe_price_id` | text | YES | — |
| `checkout_url` | text | YES | — |
| `price_usd` | numeric | YES | — |
| `delivery_type` | text | YES | — |
| `delivery_url` | text | YES | — |
| `currency` | text | NO | `'usd'::text` |
| `book_id` | uuid | YES | — |
| `archetype` | USER-DEFINED | YES | — |
| `updated_at` | timestamp with time zone | NO | `now()` |

### author_payout_settings

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `payout_method` | text | NO | `'stripe'::text` |
| `paypal_email` | text | YES | — |
| `refund_window_days` | integer | NO | `14` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |
| `paypal_email_v2` | text | YES | — |
| `tax_self_declared_at` | timestamp with time zone | YES | — |
| `minimum_payout_usd` | numeric | YES | `50` |

### author_payouts

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `payout_method` | text | NO | — |
| `amount` | numeric | NO | — |
| `currency` | text | NO | `'USD'::text` |
| `purchase_count` | integer | NO | `0` |
| `status` | text | NO | `'pending'::text` |
| `stripe_transfer_id` | text | YES | — |
| `paypal_batch_id` | text | YES | — |
| `wise_transfer_id` | text | YES | — |
| `reference_note` | text | YES | — |
| `initiated_by` | uuid | YES | — |
| `initiated_at` | timestamp with time zone | YES | — |
| `completed_at` | timestamp with time zone | YES | — |
| `failed_reason` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### author_payouts_v2

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `period_start` | date | NO | — |
| `period_end` | date | NO | — |
| `gross_usd` | numeric | NO | `0` |
| `total_stripe_fees_usd` | numeric | NO | `0` |
| `total_platform_fees_usd` | numeric | NO | `0` |
| `payout_fee_usd` | numeric | NO | `0` |
| `net_usd` | numeric | NO | `0` |
| `payout_method` | text | NO | — |
| `status` | text | NO | `'queued'::text` |
| `external_reference` | text | YES | — |
| `csv_batch_id` | uuid | YES | — |
| `queued_at` | timestamp with time zone | NO | `now()` |
| `paid_at` | timestamp with time zone | YES | — |
| `notes` | text | YES | — |

### author_profiles

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `pen_name` | text | YES | — |
| `bio_short` | text | YES | — |
| `bio_long` | text | YES | — |
| `tagline` | text | YES | — |
| `photo_url` | text | YES | — |
| `cover_photo_url` | text | YES | — |
| `location_city` | text | YES | — |
| `location_country` | text | YES | — |
| `website_url` | text | YES | — |
| `linkedin_url` | text | YES | — |
| `twitter_url` | text | YES | — |
| `instagram_url` | text | YES | — |
| `youtube_url` | text | YES | — |
| `genres` | ARRAY | YES | `'{}'::text[]` |
| `credentials` | jsonb | YES | `'[]'::jsonb` |
| `is_speaker` | boolean | YES | `false` |
| `speaker_fee_range` | text | YES | — |
| `availability_notes` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |
| `amazon_author_profile_url` | text | YES | — |
| `last_synced_at` | timestamp with time zone | YES | — |
| `directory_status` | text | NO | `'unlisted'::text` |
| `author_slug` | text | YES | — |
| `photo_crop_y` | text | YES | — |
| `photo_zoom` | numeric | YES | `1` |
| `frameworks` | jsonb | YES | `'[]'::jsonb` |
| `stripe_account_id` | text | YES | — |
| `stripe_onboarding_complete` | boolean | YES | `false` |
| `has_seen_journey_onboarding` | boolean | NO | `false` |
| `site_theme` | text | NO | `'classic-elegant'::text` |
| `account_id` | text | NO | `generate_account_id()` |
| `business_plan_json` | jsonb | YES | — |
| `onboarding_completed` | boolean | NO | `false` |
| `subscription_tier` | text | NO | `'free'::text` |
| `stripe_customer_id` | text | YES | — |
| `stripe_connected_account_id` | text | YES | — |
| `consultation_promo_codes` | jsonb | YES | — |
| `consultation_promo_expires_at` | timestamp with time zone | YES | — |
| `methodology_name` | text | YES | — |
| `sign_off_phrase` | text | YES | — |
| `quiz_name` | text | YES | — |
| `facebook_url` | text | YES | — |
| `podcast_spotify_url` | text | YES | — |
| `podcast_apple_url` | text | YES | — |
| `podcast_rss_url` | text | YES | — |
| `timezone` | text | NO | `'UTC'::text` |
| `suspended_at` | timestamp with time zone | YES | — |
| `suspended_reason` | text | YES | — |
| `suspended_by` | uuid | YES | — |
| `tier_expires_at` | timestamp with time zone | YES | — |
| `tier_override_by` | uuid | YES | — |
| `tier_override_at` | timestamp with time zone | YES | — |

### author_profiles_public

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | YES | — |
| `user_id` | uuid | YES | — |
| `pen_name` | text | YES | — |
| `bio_short` | text | YES | — |
| `bio_long` | text | YES | — |
| `tagline` | text | YES | — |
| `photo_url` | text | YES | — |
| `cover_photo_url` | text | YES | — |
| `photo_zoom` | numeric | YES | — |
| `photo_crop_y` | text | YES | — |
| `location_city` | text | YES | — |
| `location_country` | text | YES | — |
| `genres` | ARRAY | YES | — |
| `is_speaker` | boolean | YES | — |
| `speaker_fee_range` | text | YES | — |
| `availability_notes` | text | YES | — |
| `directory_status` | text | YES | — |
| `author_slug` | text | YES | — |
| `site_theme` | text | YES | — |
| `credentials` | jsonb | YES | — |
| `frameworks` | jsonb | YES | — |
| `website_url` | text | YES | — |
| `linkedin_url` | text | YES | — |
| `twitter_url` | text | YES | — |
| `instagram_url` | text | YES | — |
| `youtube_url` | text | YES | — |
| `amazon_author_profile_url` | text | YES | — |
| `created_at` | timestamp with time zone | YES | — |
| `updated_at` | timestamp with time zone | YES | — |

### author_profiles_safe

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | YES | — |
| `user_id` | uuid | YES | — |
| `account_id` | text | YES | — |
| `pen_name` | text | YES | — |
| `bio_short` | text | YES | — |
| `bio_long` | text | YES | — |
| `tagline` | text | YES | — |
| `photo_url` | text | YES | — |
| `cover_photo_url` | text | YES | — |
| `photo_zoom` | numeric | YES | — |
| `photo_crop_y` | text | YES | — |
| `location_city` | text | YES | — |
| `location_country` | text | YES | — |
| `genres` | ARRAY | YES | — |
| `is_speaker` | boolean | YES | — |
| `speaker_fee_range` | text | YES | — |
| `availability_notes` | text | YES | — |
| `directory_status` | text | YES | — |
| `author_slug` | text | YES | — |
| `site_theme` | text | YES | — |
| `credentials` | jsonb | YES | — |
| `frameworks` | jsonb | YES | — |
| `subscription_tier` | text | YES | — |
| `onboarding_completed` | boolean | YES | — |
| `has_seen_journey_onboarding` | boolean | YES | — |
| `website_url` | text | YES | — |
| `linkedin_url` | text | YES | — |
| `twitter_url` | text | YES | — |
| `instagram_url` | text | YES | — |
| `youtube_url` | text | YES | — |
| `amazon_author_profile_url` | text | YES | — |
| `created_at` | timestamp with time zone | YES | — |
| `updated_at` | timestamp with time zone | YES | — |

### author_revenue_snapshots

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `snapshot_date` | date | NO | — |
| `total_contacts` | integer | YES | `0` |
| `email_subscribers` | integer | YES | `0` |
| `pipeline_value_usd` | numeric | YES | `0` |
| `stripe_revenue_mtd_usd` | numeric | YES | `0` |
| `stripe_revenue_ytd_usd` | numeric | YES | `0` |
| `nodes_live` | integer | YES | `0` |
| `created_at` | timestamp with time zone | YES | `now()` |

### author_subscribers

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `email` | text | NO | — |
| `name` | text | YES | — |
| `source` | text | NO | `'manual'::text` |
| `source_detail` | text | YES | — |
| `status` | text | NO | `'active'::text` |
| `subscribed_at` | timestamp with time zone | NO | `now()` |
| `unsubscribed_at` | timestamp with time zone | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### author_testimonials

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `name` | text | NO | — |
| `role` | text | YES | — |
| `quote` | text | NO | — |
| `avatar_url` | text | YES | — |
| `sort_order` | integer | NO | `0` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### books

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `title` | text | NO | — |
| `subtitle` | text | YES | — |
| `description` | text | YES | — |
| `slug` | text | NO | — |
| `pages` | integer | YES | — |
| `rating` | numeric | YES | — |
| `review_count` | integer | YES | — |
| `genre` | text | YES | — |
| `badges` | ARRAY | YES | `'{}'::text[]` |
| `price` | text | YES | — |
| `currency` | text | YES | `'USD'::text` |
| `kindle_price` | text | YES | — |
| `paperback_price` | text | YES | — |
| `amazon_url` | text | YES | — |
| `cover_image_url` | text | YES | — |
| `ai_enriched` | boolean | YES | `false` |
| `entry_mode` | text | YES | `'manual'::text` |
| `amazon_author_profile_url` | text | YES | — |
| `author_name` | text | YES | — |
| `author_bio` | text | YES | — |
| `author_photo_url` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |
| `published_at` | timestamp with time zone | YES | — |
| `bestseller_proof_url` | text | YES | — |
| `owner_email` | text | YES | — |
| `approval_status` | text | NO | `'pending'::text` |
| `rejection_note` | text | YES | — |
| `amazon_kindle_url` | text | YES | — |
| `submitted_at` | timestamp with time zone | YES | — |
| `review_round` | integer | NO | `1` |
| `last_review_action_at` | timestamp with time zone | YES | — |
| `review_history` | jsonb | NO | `'[]'::jsonb` |

### books_public

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | YES | — |
| `author_id` | uuid | YES | — |
| `title` | text | YES | — |
| `subtitle` | text | YES | — |
| `slug` | text | YES | — |
| `description` | text | YES | — |
| `genre` | text | YES | — |
| `cover_image_url` | text | YES | — |
| `amazon_url` | text | YES | — |
| `price` | text | YES | — |
| `currency` | text | YES | — |
| `kindle_price` | text | YES | — |
| `paperback_price` | text | YES | — |
| `pages` | integer | YES | — |
| `rating` | numeric | YES | — |
| `review_count` | integer | YES | — |
| `badges` | ARRAY | YES | — |
| `bestseller_proof_url` | text | YES | — |
| `author_name` | text | YES | — |
| `author_bio` | text | YES | — |
| `author_photo_url` | text | YES | — |
| `amazon_author_profile_url` | text | YES | — |
| `published_at` | timestamp with time zone | YES | — |
| `created_at` | timestamp with time zone | YES | — |
| `updated_at` | timestamp with time zone | YES | — |
| `entry_mode` | text | YES | — |
| `ai_enriched` | boolean | YES | — |

### bug_reports

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | YES | — |
| `page_url` | text | NO | — |
| `description` | text | NO | — |
| `screenshot_url` | text | YES | — |
| `priority` | text | NO | `'low'::text` |
| `status` | text | NO | `'new'::text` |
| `admin_notes` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `resolved_at` | timestamp with time zone | YES | — |
| `assigned_to` | uuid | YES | — |
| `first_response_at` | timestamp with time zone | YES | — |
| `first_response_due_at` | timestamp with time zone | YES | — |
| `resolution_due_at` | timestamp with time zone | YES | — |

### chat_sessions

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | YES | — |
| `messages` | jsonb | NO | `'[]'::jsonb` |
| `page_url` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### coaching_packages

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `type` | text | NO | `'1on1'::text` |
| `price` | numeric | NO | `0` |
| `currency` | text | YES | `'USD'::text` |
| `duration_minutes` | integer | YES | `60` |
| `sessions_count` | integer | YES | `1` |
| `status` | text | NO | `'active'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### consultation_sessions

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `book_id` | uuid | NO | — |
| `messages` | jsonb | NO | `'[]'::jsonb` |
| `is_active` | boolean | NO | `true` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### contact_messages

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `sender_name` | text | NO | — |
| `sender_email` | text | NO | — |
| `message` | text | NO | — |
| `source` | text | NO | `'contact_form'::text` |
| `source_detail` | text | YES | — |
| `status` | text | NO | `'open'::text` |
| `admin_notes` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### content_quality_log

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `node_id` | text | NO | — |
| `rule` | text | NO | — |
| `sample` | text | YES | — |
| `field_path` | text | YES | — |
| `source` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### course_deliverables

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `course_id` | uuid | NO | — |
| `type` | text | NO | `'workbook'::text` |
| `title` | text | NO | `''::text` |
| `content` | text | YES | `''::text` |
| `file_url` | text | YES | — |
| `status` | text | NO | `'pending'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### course_enrollments

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `course_id` | uuid | NO | — |
| `user_id` | uuid | NO | — |
| `progress_percent` | integer | YES | `0` |
| `enrolled_at` | timestamp with time zone | NO | `now()` |
| `completed_at` | timestamp with time zone | YES | — |
| `status` | text | NO | `'active'::text` |
| `certificate_url` | text | YES | — |

### course_lessons

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `module_id` | uuid | NO | — |
| `title` | text | NO | — |
| `content` | text | YES | — |
| `video_url` | text | YES | — |
| `position` | integer | NO | `0` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `outline` | text | YES | — |

### course_modules

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `course_id` | uuid | NO | — |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `position` | integer | NO | `0` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `blooms_level` | text | YES | — |
| `kolbs_stage` | text | YES | — |
| `learning_objectives` | jsonb | YES | `'[]'::jsonb` |
| `facilitator_activity` | text | YES | — |
| `debrief_points` | jsonb | YES | `'[]'::jsonb` |
| `workbook_page_description` | text | YES | — |
| `duration_minutes` | integer | YES | `60` |
| `source_chapters` | jsonb | YES | `'[]'::jsonb` |
| `module_number` | integer | YES | `0` |

### course_quizzes

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `lesson_id` | uuid | NO | — |
| `question` | text | NO | — |
| `options` | jsonb | NO | `'[]'::jsonb` |
| `correct_answer` | integer | NO | `0` |
| `explanation` | text | YES | — |
| `position` | integer | NO | `0` |
| `created_at` | timestamp with time zone | NO | `now()` |

### courses

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `cover_image_url` | text | YES | — |
| `price` | numeric | YES | `0` |
| `currency` | text | YES | `'USD'::text` |
| `status` | text | NO | `'draft'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |
| `book_id` | uuid | YES | — |
| `source_asset_id` | uuid | YES | — |
| `course_format` | text | YES | `'2_day'::text` |
| `target_student` | text | YES | — |
| `transformation_promises` | jsonb | YES | `'[]'::jsonb` |
| `workshop_schedule` | jsonb | YES | `'{}'::jsonb` |
| `subtitle` | text | YES | — |
| `course_slug` | text | YES | — |
| `delivery_url` | text | YES | — |
| `stripe_product_id` | text | YES | — |
| `stripe_price_id` | text | YES | — |
| `tagline` | text | YES | — |

### crm_activity_log

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `contact_id` | uuid | NO | — |
| `type` | text | NO | `'note'::text` |
| `content` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### crm_contact_tags

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `contact_id` | uuid | NO | — |
| `tag` | text | NO | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### crm_contacts

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `full_name` | text | NO | — |
| `email` | text | YES | — |
| `phone` | text | YES | — |
| `company` | text | YES | — |
| `notes` | text | YES | — |
| `source` | text | YES | `'manual'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |
| `stage` | text | NO | `'new_lead'::text` |
| `abby_score` | integer | NO | `0` |
| `last_activity_at` | timestamp with time zone | YES | `now()` |
| `quiz_stage` | text | YES | — |
| `quiz_score` | integer | YES | — |
| `quiz_completed_at` | timestamp with time zone | YES | — |
| `last_node_id` | text | YES | — |
| `archetype` | USER-DEFINED | YES | — |
| `book_id` | uuid | YES | — |

### cross_builder_pushes

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `book_id` | uuid | NO | — |
| `source_builder` | text | NO | — |
| `destination_builder` | text | NO | — |
| `push_type` | text | NO | — |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `content_json` | jsonb | NO | `'{}'::jsonb` |
| `status` | text | NO | `'pending'::text` |
| `source_asset_id` | uuid | YES | — |
| `destination_record_id` | uuid | YES | — |
| `destination_table` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `imported_at` | timestamp with time zone | YES | — |
| `dismissed_at` | timestamp with time zone | YES | — |

### email_campaigns

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `template_id` | uuid | YES | — |
| `subject` | text | NO | `''::text` |
| `preview_text` | text | YES | — |
| `content_json` | jsonb | NO | `'{}'::jsonb` |
| `content_html` | text | YES | — |
| `status` | text | NO | `'draft'::text` |
| `scheduled_at` | timestamp with time zone | YES | — |
| `sent_at` | timestamp with time zone | YES | — |
| `recipient_count` | integer | YES | `0` |
| `open_count` | integer | YES | `0` |
| `click_count` | integer | YES | `0` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### email_flow_enrollments

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `flow_id` | uuid | NO | — |
| `subscriber_id` | uuid | NO | — |
| `current_step` | integer | NO | `0` |
| `enrolled_at` | timestamp with time zone | NO | `now()` |
| `completed_at` | timestamp with time zone | YES | — |
| `status` | text | NO | `'active'::text` |
| `last_sent_at` | timestamp with time zone | YES | — |
| `next_send_at` | timestamp with time zone | YES | — |
| `last_message_id` | text | YES | — |

### email_flow_steps

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `flow_id` | uuid | NO | — |
| `step_number` | integer | NO | `1` |
| `trigger_delay_days` | integer | NO | `0` |
| `subject` | text | NO | `''::text` |
| `preview_text` | text | YES | — |
| `body_markdown` | text | NO | `''::text` |
| `status` | text | NO | `'active'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### email_flows

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `flow_type` | text | NO | — |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `book_id` | uuid | YES | — |
| `status` | text | NO | `'draft'::text` |
| `ai_generated` | boolean | NO | `false` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |
| `total_subscribers` | integer | NO | `0` |
| `open_rate` | numeric | NO | `0` |
| `click_rate` | numeric | NO | `0` |
| `node_id` | text | YES | — |

### email_lists

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `name` | text | NO | — |
| `description` | text | YES | — |
| `source` | text | YES | `'manual'::text` |
| `subscriber_count` | integer | NO | `0` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### email_send_log

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `message_id` | text | YES | — |
| `template_name` | text | NO | — |
| `recipient_email` | text | NO | — |
| `status` | text | NO | — |
| `error_message` | text | YES | — |
| `metadata` | jsonb | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `lead_id` | uuid | YES | — |
| `sequence_step_id` | uuid | YES | — |
| `author_id` | uuid | YES | — |
| `opened_at` | timestamp with time zone | YES | — |
| `clicked_at` | timestamp with time zone | YES | — |
| `to_name` | text | YES | — |

### email_send_logs

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `campaign_id` | uuid | NO | — |
| `subscriber_id` | uuid | YES | — |
| `email` | text | NO | — |
| `status` | text | NO | `'queued'::text` |
| `resend_message_id` | text | YES | — |
| `sent_at` | timestamp with time zone | YES | — |
| `opened_at` | timestamp with time zone | YES | — |
| `clicked_at` | timestamp with time zone | YES | — |
| `bounced_at` | timestamp with time zone | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### email_send_state

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | integer | NO | `1` |
| `retry_after_until` | timestamp with time zone | YES | — |
| `batch_size` | integer | NO | `10` |
| `send_delay_ms` | integer | NO | `200` |
| `auth_email_ttl_minutes` | integer | NO | `15` |
| `transactional_email_ttl_minutes` | integer | NO | `60` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### email_sync_log

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | YES | — |
| `old_email` | text | YES | — |
| `new_email` | text | NO | — |
| `source` | text | NO | `'publishnow'::text` |
| `auth_updated` | boolean | YES | `false` |
| `books_updated_count` | integer | YES | `0` |
| `settings_updated` | boolean | YES | `false` |
| `error_message` | text | YES | — |
| `synced_at` | timestamp with time zone | NO | `now()` |
| `stripe_customers_updated_count` | integer | NO | `0` |

### email_templates

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `name` | text | NO | — |
| `subject` | text | NO | `''::text` |
| `content_json` | jsonb | NO | `'{}'::jsonb` |
| `thumbnail_url` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### email_unsubscribe_tokens

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `token` | text | NO | — |
| `email` | text | NO | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `used_at` | timestamp with time zone | YES | — |

### feature_requests

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `book_id` | uuid | NO | — |
| `request_type` | text | NO | `'reading_club'::text` |
| `status` | text | NO | `'pending'::text` |
| `admin_notes` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### feedback

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | YES | — |
| `type` | text | NO | `'general'::text` |
| `description` | text | NO | — |
| `importance` | text | NO | `'nice_to_have'::text` |
| `status` | text | NO | `'new'::text` |
| `admin_notes` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `assigned_to` | uuid | YES | — |
| `first_response_at` | timestamp with time zone | YES | — |

### funnel_stage_overrides

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `funnel_id` | uuid | NO | — |
| `author_id` | uuid | NO | — |
| `stage_id` | text | NO | — |
| `field_overrides` | jsonb | NO | `'{}'::jsonb` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### funnel_submissions

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `funnel_id` | uuid | NO | — |
| `author_id` | uuid | NO | — |
| `email` | text | NO | — |
| `name` | text | YES | — |
| `phone` | text | YES | — |
| `custom_fields` | jsonb | YES | `'{}'::jsonb` |
| `ip_address` | text | YES | — |
| `utm_source` | text | YES | — |
| `utm_medium` | text | YES | — |
| `utm_campaign` | text | YES | — |
| `utm_term` | text | YES | — |
| `utm_content` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### funnels

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `node_id` | text | YES | — |
| `funnel_type` | text | NO | `'opt_in'::text` |
| `title` | text | NO | — |
| `slug` | text | NO | — |
| `headline` | text | YES | — |
| `subheadline` | text | YES | — |
| `body_copy` | text | YES | — |
| `cta_text` | text | YES | `'Get Instant Access'::text` |
| `cta_url` | text | YES | — |
| `hero_image_url` | text | YES | — |
| `background_color` | text | YES | `'#0B1220'::text` |
| `accent_color` | text | YES | `'#D4AF37'::text` |
| `status` | text | NO | `'draft'::text` |
| `page_views` | integer | NO | `0` |
| `conversions` | integer | NO | `0` |
| `published_at` | timestamp with time zone | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### generated_assets

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `book_id` | uuid | NO | — |
| `author_id` | uuid | NO | — |
| `asset_type` | text | NO | — |
| `content` | text | NO | `''::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |
| `description` | text | YES | — |
| `status` | text | YES | `'draft'::text` |
| `title` | text | YES | — |

### generated_emails

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `lead_id` | uuid | YES | — |
| `author_id` | uuid | NO | — |
| `book_id` | uuid | YES | — |
| `subject` | text | NO | — |
| `body_html` | text | YES | — |
| `body_markdown` | text | YES | — |
| `trigger_condition` | text | NO | `'welcome'::text` |
| `status` | text | NO | `'queued'::text` |
| `scheduled_at` | timestamp with time zone | YES | — |
| `sent_at` | timestamp with time zone | YES | — |
| `resend_message_id` | text | YES | — |
| `metadata` | jsonb | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### home_study_courses

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `book_id` | uuid | NO | — |
| `source_asset_id` | uuid | YES | — |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `content_markdown` | text | NO | `''::text` |
| `study_schedule_json` | jsonb | YES | `'[]'::jsonb` |
| `duration_days` | integer | YES | `30` |
| `cover_image_url` | text | YES | — |
| `price` | numeric | YES | `0` |
| `currency` | text | YES | `'USD'::text` |
| `download_url` | text | YES | — |
| `status` | text | NO | `'draft'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### lead_activities

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `lead_id` | uuid | NO | — |
| `author_id` | uuid | NO | — |
| `activity_type` | text | NO | — |
| `metadata` | jsonb | YES | `'{}'::jsonb` |
| `created_at` | timestamp with time zone | NO | `now()` |

### leads

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `email` | text | NO | — |
| `name` | text | YES | — |
| `book_id` | uuid | YES | — |
| `author_id` | uuid | NO | — |
| `source` | text | NO | `'microsite'::text` |
| `status` | text | NO | `'active'::text` |
| `nurture_stage` | text | NO | `'welcome'::text` |
| `captured_at` | timestamp with time zone | NO | `now()` |
| `last_activity_at` | timestamp with time zone | YES | — |
| `metadata` | jsonb | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |
| `quiz_stage` | text | YES | — |
| `quiz_score` | integer | YES | — |
| `quiz_completed_at` | timestamp with time zone | YES | — |
| `abby_score` | integer | NO | `0` |
| `total_revenue` | numeric | NO | `0` |
| `stage` | text | NO | `'new'::text` |

### link_audit_v

| Column | Type | Nullable | Default |
|---|---|---|---|
| `author_node_id` | uuid | YES | — |
| `author_id` | uuid | YES | — |
| `pen_name` | text | YES | — |
| `author_slug` | text | YES | — |
| `node_id` | text | YES | — |
| `node_name` | text | YES | — |
| `archetype` | USER-DEFINED | YES | — |
| `status` | text | YES | — |
| `price_usd` | numeric | YES | — |
| `stripe_price_id` | text | YES | — |
| `delivery_type` | text | YES | — |
| `delivery_url` | text | YES | — |
| `expected_microsite_url` | text | YES | — |
| `link_status` | text | YES | — |

### marketing_assets

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `book_id` | uuid | YES | — |
| `author_id` | uuid | NO | — |
| `asset_type` | text | NO | — |
| `content` | jsonb | NO | `'{}'::jsonb` |
| `status` | text | NO | `'draft'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### membership_content

| Column | Type | Nullable | Default |
|---|---|---|---|
| `author_id` | uuid | NO | — |
| `name` | text | NO | `'Membership'::text` |
| `tagline` | text | YES | — |
| `benefits` | jsonb | NO | `'[]'::jsonb` |
| `sales_copy` | jsonb | NO | `'{}'::jsonb` |
| `welcome_emails` | jsonb | NO | `'[]'::jsonb` |
| `monthly_newsletter_template` | jsonb | YES | — |
| `monthly_price` | numeric | NO | `27.00` |
| `currency` | text | NO | `'usd'::text` |
| `stripe_product_id` | text | YES | — |
| `stripe_price_id` | text | YES | — |
| `status` | text | NO | `'draft'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### module_progress

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `enrollment_id` | uuid | NO | — |
| `module_id` | uuid | NO | — |
| `status` | text | NO | `'not_started'::text` |
| `started_at` | timestamp with time zone | YES | — |
| `completed_at` | timestamp with time zone | YES | — |
| `activity_completed` | boolean | YES | `false` |
| `debrief_completed` | boolean | YES | `false` |
| `workbook_completed` | boolean | YES | `false` |

### newsletter_signups

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `book_id` | uuid | NO | — |
| `email` | text | NO | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### node_gating

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `node_id` | text | NO | — |
| `category` | text | NO | — |
| `is_open` | boolean | NO | `false` |
| `updated_at` | timestamp with time zone | NO | `now()` |
| `updated_by` | uuid | YES | — |

### notifications

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `title` | text | NO | — |
| `message` | text | NO | — |
| `link` | text | YES | — |
| `read` | boolean | NO | `false` |
| `created_at` | timestamp with time zone | NO | `now()` |

### nurture_events

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `lead_id` | uuid | NO | — |
| `event_type` | text | NO | — |
| `metadata` | jsonb | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### payout_batches

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `provider` | text | NO | — |
| `period_start` | date | NO | — |
| `period_end` | date | NO | — |
| `csv_storage_path` | text | NO | — |
| `total_authors` | integer | NO | `0` |
| `total_amount_usd` | numeric | NO | `0` |
| `status` | text | NO | `'pending'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `completed_at` | timestamp with time zone | YES | — |

### platform_config

| Column | Type | Nullable | Default |
|---|---|---|---|
| `key` | text | NO | — |
| `value` | text | NO | — |
| `updated_at` | timestamp with time zone | NO | `now()` |

### podcast_episodes

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `podcast_id` | uuid | NO | — |
| `author_id` | uuid | NO | — |
| `episode_number` | integer | NO | `1` |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `format` | text | NO | `'solo_teaching'::text` |
| `script_markdown` | text | NO | `''::text` |
| `show_notes` | text | YES | — |
| `intro_script` | text | YES | — |
| `outro_script` | text | YES | — |
| `pull_quotes` | jsonb | YES | `'[]'::jsonb` |
| `guest_questions` | jsonb | YES | `'[]'::jsonb` |
| `ad_markers` | jsonb | YES | `'[]'::jsonb` |
| `duration_minutes` | integer | YES | — |
| `audio_url` | text | YES | — |
| `tts_voice_id` | text | YES | — |
| `tts_status` | text | YES | `'pending'::text` |
| `status` | text | NO | `'draft'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### podcasts

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `book_id` | uuid | NO | — |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `cover_image_url` | text | YES | — |
| `rss_title` | text | YES | — |
| `rss_description` | text | YES | — |
| `rss_author` | text | YES | — |
| `rss_language` | text | YES | `'en'::text` |
| `rss_category` | text | YES | — |
| `episode_count` | integer | YES | `0` |
| `episode_format` | text | YES | `'mix'::text` |
| `tone` | text | YES | `'Conversational'::text` |
| `target_audience` | text | YES | — |
| `monetization_goals` | ARRAY | YES | — |
| `sponsorship_media_kit` | text | YES | — |
| `rate_card_json` | jsonb | YES | `'{}'::jsonb` |
| `status` | text | NO | `'draft'::text` |
| `source_asset_id` | uuid | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### profiles

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `display_name` | text | YES | — |
| `avatar_url` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### purchases

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `customer_email` | text | NO | — |
| `customer_name` | text | YES | — |
| `author_id` | uuid | NO | — |
| `product_type` | text | NO | — |
| `product_id` | uuid | NO | — |
| `product_title` | text | NO | — |
| `amount` | numeric | NO | — |
| `platform_fee` | numeric | NO | `0` |
| `author_earnings` | numeric | NO | `0` |
| `currency` | text | NO | `'USD'::text` |
| `stripe_payment_intent_id` | text | YES | — |
| `stripe_checkout_session_id` | text | YES | — |
| `refund_status` | text | NO | `'none'::text` |
| `refunded_at` | timestamp with time zone | YES | — |
| `payout_status` | text | NO | `'pending'::text` |
| `payout_eligible_at` | timestamp with time zone | YES | — |
| `payout_id` | uuid | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### quiz_responses

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `lead_id` | uuid | YES | — |
| `question_number` | integer | NO | — |
| `answer_selected` | text | YES | — |
| `answer_text` | text | YES | — |
| `created_at` | timestamp with time zone | YES | `now()` |

### rate_limits

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `key` | text | NO | — |
| `count` | integer | NO | `1` |
| `window_start` | timestamp with time zone | NO | `now()` |

### reader_badges

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `reader_id` | uuid | NO | — |
| `badge_type` | text | NO | — |
| `badge_name` | text | NO | — |
| `earned_at` | timestamp with time zone | NO | `now()` |
| `metadata` | jsonb | YES | `'{}'::jsonb` |

### reader_profiles

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `display_name` | text | YES | — |
| `avatar_url` | text | YES | — |
| `bio` | text | YES | — |
| `reading_goal` | integer | YES | `12` |
| `favorite_genres` | jsonb | YES | `'[]'::jsonb` |
| `total_books_read` | integer | YES | `0` |
| `total_streak_days` | integer | YES | `0` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### reader_progress

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `purchase_id` | uuid | NO | — |
| `user_email` | text | NO | — |
| `day_number` | integer | NO | — |
| `completed_at` | timestamp with time zone | NO | `now()` |
| `start_date` | date | YES | — |

### reader_start_dates

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `purchase_id` | uuid | NO | — |
| `user_email` | text | NO | — |
| `start_date` | date | NO | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### reading_challenge_daily_logs

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `entry_id` | uuid | NO | — |
| `log_date` | date | NO | `CURRENT_DATE` |
| `minutes_read` | integer | NO | `2` |
| `created_at` | timestamp with time zone | NO | `now()` |

### reading_challenge_entries

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `book_id` | uuid | NO | — |
| `started_at` | timestamp with time zone | NO | `now()` |
| `status` | text | NO | `'active'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |

### reading_challenges

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `reader_id` | uuid | NO | — |
| `book_id` | uuid | NO | — |
| `challenge_config_id` | uuid | YES | — |
| `start_date` | date | NO | `CURRENT_DATE` |
| `target_days` | integer | NO | `100` |
| `commitment_minutes` | integer | YES | `2` |
| `current_streak` | integer | YES | `0` |
| `longest_streak` | integer | YES | `0` |
| `total_days_read` | integer | YES | `0` |
| `status` | text | NO | `'active'::text` |
| `completed_at` | timestamp with time zone | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### reading_club_challenge_participants

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `challenge_id` | uuid | NO | — |
| `member_id` | uuid | NO | — |
| `progress` | integer | NO | `0` |
| `joined_at` | timestamp with time zone | NO | `now()` |

### reading_club_challenges

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `book_id` | uuid | NO | — |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `duration_days` | integer | NO | `30` |
| `status` | text | NO | `'active'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |

### reading_club_discussions

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `book_id` | uuid | NO | — |
| `member_id` | uuid | NO | — |
| `content` | text | NO | — |
| `parent_id` | uuid | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### reading_club_featured_books

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `book_id` | uuid | NO | — |
| `featured_month` | text | NO | — |
| `discussion_prompt` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### reading_club_members

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `email` | text | NO | — |
| `display_name` | text | YES | — |
| `user_id` | uuid | YES | — |
| `joined_at` | timestamp with time zone | NO | `now()` |
| `status` | text | NO | `'active'::text` |

### reading_logs

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `challenge_id` | uuid | NO | — |
| `reader_id` | uuid | NO | — |
| `log_date` | date | NO | `CURRENT_DATE` |
| `minutes_read` | integer | YES | `2` |
| `notes` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### service_inquiries

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_slug` | text | NO | — |
| `service_type` | text | NO | — |
| `full_name` | text | NO | — |
| `email` | text | NO | — |
| `phone` | text | YES | — |
| `message` | text | YES | — |
| `status` | text | NO | `'pending'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |

### social_connections

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `channel_id` | text | NO | — |
| `platform` | text | NO | — |
| `channel_name` | text | YES | — |
| `status` | text | NO | `'active'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |
| `buffer_api_key` | text | YES | — |
| `user_id` | uuid | YES | — |
| `account_id` | text | YES | — |
| `account_name` | text | YES | — |
| `account_avatar_url` | text | YES | — |
| `access_token` | text | YES | — |
| `refresh_token` | text | YES | — |
| `token_expires_at` | timestamp with time zone | YES | — |
| `page_id` | text | YES | — |
| `ig_business_id` | text | YES | — |
| `scopes` | ARRAY | YES | — |
| `last_error` | text | YES | — |
| `connected_at` | timestamp with time zone | NO | `now()` |

### social_media_content

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `book_id` | uuid | NO | — |
| `source_asset_id` | uuid | YES | — |
| `platform` | text | NO | `'all'::text` |
| `content_type` | text | NO | `'post'::text` |
| `content_text` | text | NO | `''::text` |
| `image_prompt` | text | YES | — |
| `scheduled_date` | date | YES | — |
| `day_number` | integer | YES | — |
| `status` | text | NO | `'draft'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `published_post_url` | text | YES | — |
| `published_post_id` | text | YES | — |
| `publish_error` | text | YES | — |
| `published_at` | timestamp with time zone | YES | — |

### social_posts

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `node_id` | text | NO | `'BP-03'::text` |
| `channel_id` | text | YES | — |
| `platform` | text | NO | — |
| `content` | text | NO | — |
| `scheduled_at` | timestamp with time zone | YES | — |
| `published_at` | timestamp with time zone | YES | — |
| `status` | text | NO | `'draft'::text` |
| `error_message` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |
| `graphic_url` | text | YES | — |
| `post_index` | integer | YES | — |
| `post_type` | text | YES | — |
| `posted_at` | timestamp with time zone | YES | — |
| `book_id` | uuid | YES | — |

### speaking_topics

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `duration_minutes` | integer | YES | `60` |
| `fee` | numeric | YES | — |
| `fee_currency` | text | YES | `'USD'::text` |
| `status` | text | NO | `'active'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |

### special_edition_bonus_content

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `special_edition_id` | uuid | NO | — |
| `content_type` | text | NO | — |
| `title` | text | NO | — |
| `content` | text | NO | `''::text` |
| `is_custom_upload` | boolean | YES | `false` |
| `sort_order` | integer | YES | `0` |
| `created_at` | timestamp with time zone | NO | `now()` |

### special_edition_bundles

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `special_edition_id` | uuid | NO | — |
| `tier` | text | NO | — |
| `name` | text | NO | — |
| `description` | text | YES | — |
| `price_cents` | integer | NO | `0` |
| `included_items` | jsonb | NO | `'[]'::jsonb` |
| `stripe_price_id` | text | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### special_edition_marketing

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `special_edition_id` | uuid | NO | — |
| `day_number` | integer | NO | — |
| `week_theme` | text | YES | — |
| `channel` | text | NO | — |
| `title` | text | NO | — |
| `body` | text | NO | `''::text` |
| `scheduled_date` | date | YES | — |
| `is_published` | boolean | YES | `false` |
| `created_at` | timestamp with time zone | NO | `now()` |

### special_editions

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `book_id` | uuid | NO | — |
| `title` | text | NO | — |
| `edition_type` | text | NO | `'signed'::text` |
| `print_run` | text | NO | `'limited'::text` |
| `print_quantity` | integer | YES | `100` |
| `extras` | text | YES | — |
| `price` | numeric | YES | `0` |
| `currency` | text | YES | `'USD'::text` |
| `occasion` | text | YES | `'none'::text` |
| `occasion_date` | date | YES | — |
| `occasion_tagline` | text | YES | — |
| `cover_concept` | text | YES | — |
| `gift_buyer_persona` | text | YES | — |
| `edition_identity_json` | jsonb | YES | `'{}'::jsonb` |
| `sales_copy_json` | jsonb | YES | `'{}'::jsonb` |
| `bundle_strategy_json` | jsonb | YES | `'{}'::jsonb` |
| `print_specs_json` | jsonb | YES | `'{}'::jsonb` |
| `cross_builder_json` | jsonb | YES | `'{}'::jsonb` |
| `marketing_calendar_json` | jsonb | YES | `'{}'::jsonb` |
| `source_asset_id` | uuid | YES | — |
| `status` | text | NO | `'draft'::text` |
| `slug` | text | YES | — |
| `published_at` | timestamp with time zone | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### subscriptions

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `subscriber_email` | text | NO | — |
| `subscriber_name` | text | YES | — |
| `subscriber_user_id` | uuid | YES | — |
| `stripe_subscription_id` | text | YES | — |
| `stripe_customer_id` | text | YES | — |
| `stripe_price_id` | text | YES | — |
| `status` | text | NO | `'incomplete'::text` |
| `price_usd` | numeric | NO | `0` |
| `currency` | text | NO | `'usd'::text` |
| `current_period_start` | timestamp with time zone | YES | — |
| `current_period_end` | timestamp with time zone | YES | — |
| `cancelled_at` | timestamp with time zone | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### suppressed_emails

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `email` | text | NO | — |
| `reason` | text | NO | — |
| `metadata` | jsonb | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### system_error_log

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `source` | text | NO | — |
| `function_name` | text | YES | — |
| `severity` | text | NO | `'error'::text` |
| `message` | text | NO | — |
| `stack` | text | YES | — |
| `context` | jsonb | YES | — |
| `acknowledged_by` | uuid | YES | — |
| `acknowledged_at` | timestamp with time zone | YES | — |
| `resolved_by` | uuid | YES | — |
| `resolved_at` | timestamp with time zone | YES | — |
| `created_at` | timestamp with time zone | NO | `now()` |

### testimonials

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `product_id` | uuid | YES | — |
| `book_id` | uuid | YES | — |
| `author_id` | uuid | NO | — |
| `reviewer_name` | text | NO | — |
| `reviewer_title` | text | YES | — |
| `review_text` | text | NO | — |
| `rating` | integer | YES | `5` |
| `is_verified` | boolean | YES | `false` |
| `created_at` | timestamp with time zone | NO | `now()` |

### training_deliverables

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `training_id` | uuid | NO | — |
| `type` | text | NO | `'workbook'::text` |
| `title` | text | NO | `''::text` |
| `content` | text | YES | `''::text` |
| `file_url` | text | YES | — |
| `status` | text | NO | `'pending'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### training_modules

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `training_id` | uuid | NO | — |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `module_number` | integer | YES | `0` |
| `position` | integer | NO | `0` |
| `blooms_level` | text | YES | — |
| `kolbs_stage` | text | YES | — |
| `learning_objectives` | jsonb | YES | `'[]'::jsonb` |
| `facilitator_activity` | text | YES | — |
| `debrief_points` | jsonb | YES | `'[]'::jsonb` |
| `workbook_page_description` | text | YES | — |
| `slide_content` | text | YES | — |
| `duration_minutes` | integer | YES | `60` |
| `source_chapters` | jsonb | YES | `'[]'::jsonb` |
| `created_at` | timestamp with time zone | NO | `now()` |

### training_programs

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `book_id` | uuid | YES | — |
| `source_asset_id` | uuid | YES | — |
| `title` | text | NO | — |
| `subtitle` | text | YES | — |
| `description` | text | YES | — |
| `course_format` | text | YES | `'2_day'::text` |
| `target_student` | text | YES | — |
| `transformation_promises` | jsonb | YES | `'[]'::jsonb` |
| `workshop_schedule` | jsonb | YES | `'{}'::jsonb` |
| `cover_image_url` | text | YES | — |
| `price` | numeric | YES | `0` |
| `currency` | text | YES | `'USD'::text` |
| `status` | text | NO | `'draft'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

### user_roles

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | — |
| `role` | USER-DEFINED | NO | — |

### webinar_registrations

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `webinar_id` | uuid | NO | — |
| `email` | text | NO | — |
| `name` | text | YES | — |
| `attended` | boolean | YES | `false` |
| `registered_at` | timestamp with time zone | NO | `now()` |
| `author_id` | uuid | YES | — |
| `confirmation_sent_at` | timestamp with time zone | YES | — |
| `reminder_24h_sent_at` | timestamp with time zone | YES | — |
| `reminder_1h_sent_at` | timestamp with time zone | YES | — |
| `reminder_15m_sent_at` | timestamp with time zone | YES | — |
| `followup_sameday_sent_at` | timestamp with time zone | YES | — |
| `followup_day3_sent_at` | timestamp with time zone | YES | — |
| `followup_day7_sent_at` | timestamp with time zone | YES | — |

### webinars

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `book_id` | uuid | NO | — |
| `source_asset_id` | uuid | YES | — |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `script_markdown` | text | NO | `''::text` |
| `slide_deck_url` | text | YES | — |
| `registration_page_copy` | text | YES | — |
| `replay_url` | text | YES | — |
| `scheduled_at` | timestamp with time zone | YES | — |
| `duration_minutes` | integer | YES | `60` |
| `price` | numeric | YES | `0` |
| `currency` | text | YES | `'USD'::text` |
| `is_free` | boolean | YES | `true` |
| `status` | text | NO | `'draft'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |
| `slug` | text | YES | — |
| `room_url` | text | YES | — |
| `cover_image_url` | text | YES | — |

### workbooks

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `author_id` | uuid | NO | — |
| `book_id` | uuid | NO | — |
| `source_asset_id` | uuid | YES | — |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `content_markdown` | text | NO | `''::text` |
| `cover_image_url` | text | YES | — |
| `page_count` | integer | YES | — |
| `price` | numeric | YES | `0` |
| `currency` | text | YES | `'USD'::text` |
| `download_url` | text | YES | — |
| `status` | text | NO | `'draft'::text` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |

