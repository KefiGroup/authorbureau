export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      abby_conversations: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "abby_conversations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abby_conversations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abby_conversations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      abby_nudges: {
        Row: {
          action_label: string | null
          action_url: string | null
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          nudge_type: string
          title: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          nudge_type: string
          title: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          nudge_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "abby_nudges_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abby_nudges_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abby_nudges_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          author_id: string
          book_id: string | null
          cost_estimate: number | null
          created_at: string
          feature: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          total_tokens: number
        }
        Insert: {
          author_id: string
          book_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          feature: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          total_tokens?: number
        }
        Update: {
          author_id?: string
          book_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          feature?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          total_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
        ]
      }
      audiobooks: {
        Row: {
          audio_url: string | null
          author_id: string
          book_id: string
          created_at: string
          currency: string | null
          description: string | null
          distributed_at: string | null
          distribution_manifest: Json | null
          distribution_status: string | null
          duration_minutes: number | null
          id: string
          narrator_credit: string | null
          narrator_type: string | null
          preview_chapter_index: number | null
          price: number | null
          script_markdown: string
          source_asset_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          author_id: string
          book_id: string
          created_at?: string
          currency?: string | null
          description?: string | null
          distributed_at?: string | null
          distribution_manifest?: Json | null
          distribution_status?: string | null
          duration_minutes?: number | null
          id?: string
          narrator_credit?: string | null
          narrator_type?: string | null
          preview_chapter_index?: number | null
          price?: number | null
          script_markdown?: string
          source_asset_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          author_id?: string
          book_id?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          distributed_at?: string | null
          distribution_manifest?: Json | null
          distribution_status?: string | null
          duration_minutes?: number | null
          id?: string
          narrator_credit?: string | null
          narrator_type?: string | null
          preview_chapter_index?: number | null
          price?: number | null
          script_markdown?: string
          source_asset_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audiobooks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audiobooks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audiobooks_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "generated_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      author_applications: {
        Row: {
          amazon_book_url: string
          bio: string | null
          created_at: string
          email: string
          full_name: string
          genres: string | null
          id: string
          status: string
          website_url: string | null
        }
        Insert: {
          amazon_book_url: string
          bio?: string | null
          created_at?: string
          email: string
          full_name: string
          genres?: string | null
          id?: string
          status?: string
          website_url?: string | null
        }
        Update: {
          amazon_book_url?: string
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          genres?: string | null
          id?: string
          status?: string
          website_url?: string | null
        }
        Relationships: []
      }
      author_context: {
        Row: {
          author_id: string
          book_subtitle: string | null
          book_title: string
          commercial_angles: Json | null
          competitor_books: Json | null
          core_thesis: string
          created_at: string
          id: string
          key_frameworks: Json | null
          manuscript_url: string | null
          parsed_at: string | null
          target_audience_persona: Json | null
          unique_insights: Json | null
        }
        Insert: {
          author_id: string
          book_subtitle?: string | null
          book_title: string
          commercial_angles?: Json | null
          competitor_books?: Json | null
          core_thesis: string
          created_at?: string
          id?: string
          key_frameworks?: Json | null
          manuscript_url?: string | null
          parsed_at?: string | null
          target_audience_persona?: Json | null
          unique_insights?: Json | null
        }
        Update: {
          author_id?: string
          book_subtitle?: string | null
          book_title?: string
          commercial_angles?: Json | null
          competitor_books?: Json | null
          core_thesis?: string
          created_at?: string
          id?: string
          key_frameworks?: Json | null
          manuscript_url?: string | null
          parsed_at?: string | null
          target_audience_persona?: Json | null
          unique_insights?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "author_context_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "author_context_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "author_context_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      author_email_settings: {
        Row: {
          author_id: string
          created_at: string
          domain_verified: boolean
          id: string
          reply_to_email: string | null
          resend_domain_id: string | null
          sender_name: string
          subdomain: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          domain_verified?: boolean
          id?: string
          reply_to_email?: string | null
          resend_domain_id?: string | null
          sender_name?: string
          subdomain?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          domain_verified?: boolean
          id?: string
          reply_to_email?: string | null
          resend_domain_id?: string | null
          sender_name?: string
          subdomain?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      author_nodes: {
        Row: {
          activated_at: string | null
          author_id: string
          content_json: Json | null
          created_at: string
          current_step: number | null
          ghl_resource_id: string | null
          id: string
          marketing_activated_at: string | null
          microsite_url: string | null
          node_id: string
          node_name: string
          payment_link: string | null
          personalised_name: string | null
          revenue_to_date: number
          status: string
          third_party_url: string | null
        }
        Insert: {
          activated_at?: string | null
          author_id: string
          content_json?: Json | null
          created_at?: string
          current_step?: number | null
          ghl_resource_id?: string | null
          id?: string
          marketing_activated_at?: string | null
          microsite_url?: string | null
          node_id: string
          node_name: string
          payment_link?: string | null
          personalised_name?: string | null
          revenue_to_date?: number
          status?: string
          third_party_url?: string | null
        }
        Update: {
          activated_at?: string | null
          author_id?: string
          content_json?: Json | null
          created_at?: string
          current_step?: number | null
          ghl_resource_id?: string | null
          id?: string
          marketing_activated_at?: string | null
          microsite_url?: string | null
          node_id?: string
          node_name?: string
          payment_link?: string | null
          personalised_name?: string | null
          revenue_to_date?: number
          status?: string
          third_party_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "author_nodes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "author_nodes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "author_nodes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      author_payout_settings: {
        Row: {
          author_id: string
          created_at: string
          id: string
          payout_method: string
          paypal_email: string | null
          refund_window_days: number
          updated_at: string
          wise_account_number: string | null
          wise_currency: string | null
          wise_email: string | null
          wise_routing_number: string | null
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          payout_method?: string
          paypal_email?: string | null
          refund_window_days?: number
          updated_at?: string
          wise_account_number?: string | null
          wise_currency?: string | null
          wise_email?: string | null
          wise_routing_number?: string | null
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          payout_method?: string
          paypal_email?: string | null
          refund_window_days?: number
          updated_at?: string
          wise_account_number?: string | null
          wise_currency?: string | null
          wise_email?: string | null
          wise_routing_number?: string | null
        }
        Relationships: []
      }
      author_payouts: {
        Row: {
          amount: number
          author_id: string
          completed_at: string | null
          created_at: string
          currency: string
          failed_reason: string | null
          id: string
          initiated_at: string | null
          initiated_by: string | null
          payout_method: string
          paypal_batch_id: string | null
          purchase_count: number
          reference_note: string | null
          status: string
          stripe_transfer_id: string | null
          updated_at: string
          wise_transfer_id: string | null
        }
        Insert: {
          amount: number
          author_id: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          failed_reason?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          payout_method: string
          paypal_batch_id?: string | null
          purchase_count?: number
          reference_note?: string | null
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
          wise_transfer_id?: string | null
        }
        Update: {
          amount?: number
          author_id?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          failed_reason?: string | null
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          payout_method?: string
          paypal_batch_id?: string | null
          purchase_count?: number
          reference_note?: string | null
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
          wise_transfer_id?: string | null
        }
        Relationships: []
      }
      author_profiles: {
        Row: {
          account_id: string
          amazon_author_profile_url: string | null
          author_slug: string | null
          availability_notes: string | null
          bio_long: string | null
          bio_short: string | null
          business_plan_json: Json | null
          consultation_promo_codes: Json | null
          consultation_promo_expires_at: string | null
          cover_photo_url: string | null
          created_at: string
          credentials: Json | null
          directory_status: string
          frameworks: Json | null
          genres: string[] | null
          ghl_api_key: string | null
          ghl_provision_status: string | null
          ghl_provisioned_at: string | null
          ghl_provisioning_attempts: number | null
          ghl_provisioning_failed: boolean | null
          ghl_sub_account_id: string | null
          ghl_sub_account_name: string | null
          has_seen_journey_onboarding: boolean
          id: string
          instagram_url: string | null
          is_speaker: boolean | null
          last_synced_at: string | null
          linkedin_url: string | null
          location_city: string | null
          location_country: string | null
          methodology_name: string | null
          onboarding_completed: boolean
          pen_name: string | null
          photo_crop_y: string | null
          photo_url: string | null
          photo_zoom: number | null
          quiz_name: string | null
          sign_off_phrase: string | null
          site_theme: string
          speaker_fee_range: string | null
          stripe_account_id: string | null
          stripe_connected_account_id: string | null
          stripe_customer_id: string | null
          stripe_onboarding_complete: boolean | null
          subscription_tier: string
          tagline: string | null
          twitter_url: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          account_id?: string
          amazon_author_profile_url?: string | null
          author_slug?: string | null
          availability_notes?: string | null
          bio_long?: string | null
          bio_short?: string | null
          business_plan_json?: Json | null
          consultation_promo_codes?: Json | null
          consultation_promo_expires_at?: string | null
          cover_photo_url?: string | null
          created_at?: string
          credentials?: Json | null
          directory_status?: string
          frameworks?: Json | null
          genres?: string[] | null
          ghl_api_key?: string | null
          ghl_provision_status?: string | null
          ghl_provisioned_at?: string | null
          ghl_provisioning_attempts?: number | null
          ghl_provisioning_failed?: boolean | null
          ghl_sub_account_id?: string | null
          ghl_sub_account_name?: string | null
          has_seen_journey_onboarding?: boolean
          id?: string
          instagram_url?: string | null
          is_speaker?: boolean | null
          last_synced_at?: string | null
          linkedin_url?: string | null
          location_city?: string | null
          location_country?: string | null
          methodology_name?: string | null
          onboarding_completed?: boolean
          pen_name?: string | null
          photo_crop_y?: string | null
          photo_url?: string | null
          photo_zoom?: number | null
          quiz_name?: string | null
          sign_off_phrase?: string | null
          site_theme?: string
          speaker_fee_range?: string | null
          stripe_account_id?: string | null
          stripe_connected_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_onboarding_complete?: boolean | null
          subscription_tier?: string
          tagline?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          account_id?: string
          amazon_author_profile_url?: string | null
          author_slug?: string | null
          availability_notes?: string | null
          bio_long?: string | null
          bio_short?: string | null
          business_plan_json?: Json | null
          consultation_promo_codes?: Json | null
          consultation_promo_expires_at?: string | null
          cover_photo_url?: string | null
          created_at?: string
          credentials?: Json | null
          directory_status?: string
          frameworks?: Json | null
          genres?: string[] | null
          ghl_api_key?: string | null
          ghl_provision_status?: string | null
          ghl_provisioned_at?: string | null
          ghl_provisioning_attempts?: number | null
          ghl_provisioning_failed?: boolean | null
          ghl_sub_account_id?: string | null
          ghl_sub_account_name?: string | null
          has_seen_journey_onboarding?: boolean
          id?: string
          instagram_url?: string | null
          is_speaker?: boolean | null
          last_synced_at?: string | null
          linkedin_url?: string | null
          location_city?: string | null
          location_country?: string | null
          methodology_name?: string | null
          onboarding_completed?: boolean
          pen_name?: string | null
          photo_crop_y?: string | null
          photo_url?: string | null
          photo_zoom?: number | null
          quiz_name?: string | null
          sign_off_phrase?: string | null
          site_theme?: string
          speaker_fee_range?: string | null
          stripe_account_id?: string | null
          stripe_connected_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_onboarding_complete?: boolean | null
          subscription_tier?: string
          tagline?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      author_revenue_snapshots: {
        Row: {
          author_id: string
          created_at: string | null
          email_subscribers: number | null
          id: string
          nodes_live: number | null
          pipeline_value_usd: number | null
          snapshot_date: string
          stripe_revenue_mtd_usd: number | null
          stripe_revenue_ytd_usd: number | null
          total_contacts: number | null
        }
        Insert: {
          author_id: string
          created_at?: string | null
          email_subscribers?: number | null
          id?: string
          nodes_live?: number | null
          pipeline_value_usd?: number | null
          snapshot_date: string
          stripe_revenue_mtd_usd?: number | null
          stripe_revenue_ytd_usd?: number | null
          total_contacts?: number | null
        }
        Update: {
          author_id?: string
          created_at?: string | null
          email_subscribers?: number | null
          id?: string
          nodes_live?: number | null
          pipeline_value_usd?: number | null
          snapshot_date?: string
          stripe_revenue_mtd_usd?: number | null
          stripe_revenue_ytd_usd?: number | null
          total_contacts?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "author_revenue_snapshots_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "author_revenue_snapshots_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "author_revenue_snapshots_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      author_subscribers: {
        Row: {
          author_id: string
          created_at: string
          email: string
          id: string
          name: string | null
          source: string
          source_detail: string | null
          status: string
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          author_id: string
          created_at?: string
          email: string
          id?: string
          name?: string | null
          source?: string
          source_detail?: string | null
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          author_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          source?: string
          source_detail?: string | null
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      books: {
        Row: {
          ai_enriched: boolean | null
          amazon_author_profile_url: string | null
          amazon_url: string | null
          approval_status: string
          author_bio: string | null
          author_id: string
          author_name: string | null
          author_photo_url: string | null
          badges: string[] | null
          bestseller_proof_url: string | null
          cover_image_url: string | null
          created_at: string
          currency: string | null
          description: string | null
          entry_mode: string | null
          genre: string | null
          id: string
          kindle_price: string | null
          owner_email: string | null
          pages: number | null
          paperback_price: string | null
          price: string | null
          published_at: string | null
          rating: number | null
          rejection_note: string | null
          review_count: number | null
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_enriched?: boolean | null
          amazon_author_profile_url?: string | null
          amazon_url?: string | null
          approval_status?: string
          author_bio?: string | null
          author_id: string
          author_name?: string | null
          author_photo_url?: string | null
          badges?: string[] | null
          bestseller_proof_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          entry_mode?: string | null
          genre?: string | null
          id?: string
          kindle_price?: string | null
          owner_email?: string | null
          pages?: number | null
          paperback_price?: string | null
          price?: string | null
          published_at?: string | null
          rating?: number | null
          rejection_note?: string | null
          review_count?: number | null
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_enriched?: boolean | null
          amazon_author_profile_url?: string | null
          amazon_url?: string | null
          approval_status?: string
          author_bio?: string | null
          author_id?: string
          author_name?: string | null
          author_photo_url?: string | null
          badges?: string[] | null
          bestseller_proof_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          entry_mode?: string | null
          genre?: string | null
          id?: string
          kindle_price?: string | null
          owner_email?: string | null
          pages?: number | null
          paperback_price?: string | null
          price?: string | null
          published_at?: string | null
          rating?: number | null
          rejection_note?: string | null
          review_count?: number | null
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          id: string
          page_url: string
          priority: string
          resolved_at: string | null
          screenshot_url: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          id?: string
          page_url: string
          priority?: string
          resolved_at?: string | null
          screenshot_url?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          id?: string
          page_url?: string
          priority?: string
          resolved_at?: string | null
          screenshot_url?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          messages: Json
          page_url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          page_url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          page_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      coaching_packages: {
        Row: {
          author_id: string
          created_at: string
          currency: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          price: number
          sessions_count: number | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          price?: number
          sessions_count?: number | null
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          price?: number
          sessions_count?: number | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      consultation_sessions: {
        Row: {
          book_id: string
          created_at: string
          id: string
          is_active: boolean
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_sessions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_sessions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          admin_notes: string | null
          author_id: string
          created_at: string
          id: string
          message: string
          sender_email: string
          sender_name: string
          source: string
          source_detail: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          author_id: string
          created_at?: string
          id?: string
          message: string
          sender_email: string
          sender_name: string
          source?: string
          source_detail?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          author_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_email?: string
          sender_name?: string
          source?: string
          source_detail?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_deliverables: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          file_url: string | null
          id: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          file_url?: string | null
          id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          file_url?: string | null
          id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_deliverables_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          certificate_url: string | null
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          progress_percent: number | null
          status: string
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          progress_percent?: number | null
          status?: string
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          progress_percent?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          content: string | null
          created_at: string
          id: string
          module_id: string
          position: number
          title: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          module_id: string
          position?: number
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          module_id?: string
          position?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          blooms_level: string | null
          course_id: string
          created_at: string
          debrief_points: Json | null
          description: string | null
          duration_minutes: number | null
          facilitator_activity: string | null
          id: string
          kolbs_stage: string | null
          learning_objectives: Json | null
          module_number: number | null
          position: number
          source_chapters: Json | null
          title: string
          workbook_page_description: string | null
        }
        Insert: {
          blooms_level?: string | null
          course_id: string
          created_at?: string
          debrief_points?: Json | null
          description?: string | null
          duration_minutes?: number | null
          facilitator_activity?: string | null
          id?: string
          kolbs_stage?: string | null
          learning_objectives?: Json | null
          module_number?: number | null
          position?: number
          source_chapters?: Json | null
          title: string
          workbook_page_description?: string | null
        }
        Update: {
          blooms_level?: string | null
          course_id?: string
          created_at?: string
          debrief_points?: Json | null
          description?: string | null
          duration_minutes?: number | null
          facilitator_activity?: string | null
          id?: string
          kolbs_stage?: string | null
          learning_objectives?: Json | null
          module_number?: number | null
          position?: number
          source_chapters?: Json | null
          title?: string
          workbook_page_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_quizzes: {
        Row: {
          correct_answer: number
          created_at: string
          explanation: string | null
          id: string
          lesson_id: string
          options: Json
          position: number
          question: string
        }
        Insert: {
          correct_answer?: number
          created_at?: string
          explanation?: string | null
          id?: string
          lesson_id: string
          options?: Json
          position?: number
          question: string
        }
        Update: {
          correct_answer?: number
          created_at?: string
          explanation?: string | null
          id?: string
          lesson_id?: string
          options?: Json
          position?: number
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          author_id: string
          book_id: string | null
          course_format: string | null
          cover_image_url: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          price: number | null
          source_asset_id: string | null
          status: string
          subtitle: string | null
          target_student: string | null
          title: string
          transformation_promises: Json | null
          updated_at: string
          workshop_schedule: Json | null
        }
        Insert: {
          author_id: string
          book_id?: string | null
          course_format?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          price?: number | null
          source_asset_id?: string | null
          status?: string
          subtitle?: string | null
          target_student?: string | null
          title: string
          transformation_promises?: Json | null
          updated_at?: string
          workshop_schedule?: Json | null
        }
        Update: {
          author_id?: string
          book_id?: string | null
          course_format?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          price?: number | null
          source_asset_id?: string | null
          status?: string
          subtitle?: string | null
          target_student?: string | null
          title?: string
          transformation_promises?: Json | null
          updated_at?: string
          workshop_schedule?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "generated_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activity_log: {
        Row: {
          author_id: string
          contact_id: string
          content: string | null
          created_at: string
          id: string
          type: string
        }
        Insert: {
          author_id: string
          contact_id: string
          content?: string | null
          created_at?: string
          id?: string
          type?: string
        }
        Update: {
          author_id?: string
          contact_id?: string
          content?: string | null
          created_at?: string
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activity_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contact_tags: {
        Row: {
          author_id: string
          contact_id: string
          created_at: string
          id: string
          tag: string
        }
        Insert: {
          author_id: string
          contact_id: string
          created_at?: string
          id?: string
          tag: string
        }
        Update: {
          author_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          abby_score: number
          author_id: string
          company: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_activity_at: string | null
          notes: string | null
          phone: string | null
          quiz_completed_at: string | null
          quiz_score: number | null
          quiz_stage: string | null
          source: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          abby_score?: number
          author_id: string
          company?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          last_activity_at?: string | null
          notes?: string | null
          phone?: string | null
          quiz_completed_at?: string | null
          quiz_score?: number | null
          quiz_stage?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          abby_score?: number
          author_id?: string
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_activity_at?: string | null
          notes?: string | null
          phone?: string | null
          quiz_completed_at?: string | null
          quiz_score?: number | null
          quiz_stage?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: []
      }
      cross_builder_pushes: {
        Row: {
          author_id: string
          book_id: string
          content_json: Json
          created_at: string
          description: string | null
          destination_builder: string
          destination_record_id: string | null
          destination_table: string | null
          dismissed_at: string | null
          id: string
          imported_at: string | null
          push_type: string
          source_asset_id: string | null
          source_builder: string
          status: string
          title: string
        }
        Insert: {
          author_id: string
          book_id: string
          content_json?: Json
          created_at?: string
          description?: string | null
          destination_builder: string
          destination_record_id?: string | null
          destination_table?: string | null
          dismissed_at?: string | null
          id?: string
          imported_at?: string | null
          push_type: string
          source_asset_id?: string | null
          source_builder: string
          status?: string
          title: string
        }
        Update: {
          author_id?: string
          book_id?: string
          content_json?: Json
          created_at?: string
          description?: string | null
          destination_builder?: string
          destination_record_id?: string | null
          destination_table?: string | null
          dismissed_at?: string | null
          id?: string
          imported_at?: string | null
          push_type?: string
          source_asset_id?: string | null
          source_builder?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_builder_pushes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_builder_pushes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_builder_pushes_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "generated_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          author_id: string
          click_count: number | null
          content_html: string | null
          content_json: Json
          created_at: string
          id: string
          open_count: number | null
          preview_text: string | null
          recipient_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          click_count?: number | null
          content_html?: string | null
          content_json?: Json
          created_at?: string
          id?: string
          open_count?: number | null
          preview_text?: string | null
          recipient_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          click_count?: number | null
          content_html?: string | null
          content_json?: Json
          created_at?: string
          id?: string
          open_count?: number | null
          preview_text?: string | null
          recipient_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_flow_enrollments: {
        Row: {
          completed_at: string | null
          current_step: number
          enrolled_at: string
          flow_id: string
          id: string
          status: string
          subscriber_id: string
        }
        Insert: {
          completed_at?: string | null
          current_step?: number
          enrolled_at?: string
          flow_id: string
          id?: string
          status?: string
          subscriber_id: string
        }
        Update: {
          completed_at?: string | null
          current_step?: number
          enrolled_at?: string
          flow_id?: string
          id?: string
          status?: string
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_flow_enrollments_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "email_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_flow_enrollments_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "author_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_flow_steps: {
        Row: {
          body_markdown: string
          created_at: string
          flow_id: string
          id: string
          preview_text: string | null
          status: string
          step_number: number
          subject: string
          trigger_delay_days: number
          updated_at: string
        }
        Insert: {
          body_markdown?: string
          created_at?: string
          flow_id: string
          id?: string
          preview_text?: string | null
          status?: string
          step_number?: number
          subject?: string
          trigger_delay_days?: number
          updated_at?: string
        }
        Update: {
          body_markdown?: string
          created_at?: string
          flow_id?: string
          id?: string
          preview_text?: string | null
          status?: string
          step_number?: number
          subject?: string
          trigger_delay_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_flow_steps_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "email_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      email_flows: {
        Row: {
          ai_generated: boolean
          author_id: string
          book_id: string | null
          click_rate: number
          created_at: string
          description: string | null
          flow_type: string
          id: string
          node_id: string | null
          open_rate: number
          status: string
          title: string
          total_subscribers: number
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          author_id: string
          book_id?: string | null
          click_rate?: number
          created_at?: string
          description?: string | null
          flow_type: string
          id?: string
          node_id?: string | null
          open_rate?: number
          status?: string
          title: string
          total_subscribers?: number
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          author_id?: string
          book_id?: string | null
          click_rate?: number
          created_at?: string
          description?: string | null
          flow_type?: string
          id?: string
          node_id?: string | null
          open_rate?: number
          status?: string
          title?: string
          total_subscribers?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_flows_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_flows_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
        ]
      }
      email_lists: {
        Row: {
          author_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          source: string | null
          subscriber_count: number
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          source?: string | null
          subscriber_count?: number
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          source?: string | null
          subscriber_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_lists_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_lists_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_lists_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          author_id: string | null
          clicked_at: string | null
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          message_id: string | null
          metadata: Json | null
          opened_at: string | null
          recipient_email: string
          sequence_step_id: string | null
          status: string
          template_name: string
          to_name: string | null
        }
        Insert: {
          author_id?: string | null
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          message_id?: string | null
          metadata?: Json | null
          opened_at?: string | null
          recipient_email: string
          sequence_step_id?: string | null
          status: string
          template_name: string
          to_name?: string | null
        }
        Update: {
          author_id?: string | null
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          message_id?: string | null
          metadata?: Json | null
          opened_at?: string | null
          recipient_email?: string
          sequence_step_id?: string | null
          status?: string
          template_name?: string
          to_name?: string | null
        }
        Relationships: []
      }
      email_send_logs: {
        Row: {
          bounced_at: string | null
          campaign_id: string
          clicked_at: string | null
          created_at: string
          email: string
          id: string
          opened_at: string | null
          resend_message_id: string | null
          sent_at: string | null
          status: string
          subscriber_id: string | null
        }
        Insert: {
          bounced_at?: string | null
          campaign_id: string
          clicked_at?: string | null
          created_at?: string
          email: string
          id?: string
          opened_at?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          subscriber_id?: string | null
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string
          email?: string
          id?: string
          opened_at?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_send_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_logs_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "author_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          author_id: string
          content_json: Json
          created_at: string
          id: string
          name: string
          subject: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          content_json?: Json
          created_at?: string
          id?: string
          name: string
          subject?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          content_json?: Json
          created_at?: string
          id?: string
          name?: string
          subject?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          admin_notes: string | null
          author_id: string
          book_id: string
          created_at: string
          id: string
          request_type: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          author_id: string
          book_id: string
          created_at?: string
          id?: string
          request_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          author_id?: string
          book_id?: string
          created_at?: string
          id?: string
          request_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_requests_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          id: string
          importance: string
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          id?: string
          importance?: string
          status?: string
          type?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          id?: string
          importance?: string
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      funnel_submissions: {
        Row: {
          author_id: string
          created_at: string
          custom_fields: Json | null
          email: string
          funnel_id: string
          id: string
          ip_address: string | null
          name: string | null
          phone: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          author_id: string
          created_at?: string
          custom_fields?: Json | null
          email: string
          funnel_id: string
          id?: string
          ip_address?: string | null
          name?: string | null
          phone?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          author_id?: string
          created_at?: string
          custom_fields?: Json | null
          email?: string
          funnel_id?: string
          id?: string
          ip_address?: string | null
          name?: string | null
          phone?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_submissions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_submissions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_submissions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_submissions_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          accent_color: string | null
          author_id: string
          background_color: string | null
          body_copy: string | null
          conversions: number
          created_at: string
          cta_text: string | null
          cta_url: string | null
          funnel_type: string
          headline: string | null
          hero_image_url: string | null
          id: string
          node_id: string | null
          page_views: number
          published_at: string | null
          slug: string
          status: string
          subheadline: string | null
          title: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          author_id: string
          background_color?: string | null
          body_copy?: string | null
          conversions?: number
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          funnel_type?: string
          headline?: string | null
          hero_image_url?: string | null
          id?: string
          node_id?: string | null
          page_views?: number
          published_at?: string | null
          slug: string
          status?: string
          subheadline?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          author_id?: string
          background_color?: string | null
          body_copy?: string | null
          conversions?: number
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          funnel_type?: string
          headline?: string | null
          hero_image_url?: string | null
          id?: string
          node_id?: string | null
          page_views?: number
          published_at?: string | null
          slug?: string
          status?: string
          subheadline?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnels_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnels_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnels_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_assets: {
        Row: {
          asset_type: string
          author_id: string
          book_id: string
          content: string
          created_at: string
          description: string | null
          id: string
          status: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          asset_type: string
          author_id: string
          book_id: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          asset_type?: string
          author_id?: string
          book_id?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_assets_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_assets_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_emails: {
        Row: {
          author_id: string
          body_html: string | null
          body_markdown: string | null
          book_id: string | null
          created_at: string
          id: string
          lead_id: string | null
          metadata: Json | null
          resend_message_id: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string
          trigger_condition: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body_html?: string | null
          body_markdown?: string | null
          book_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          resend_message_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          trigger_condition?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body_html?: string | null
          body_markdown?: string | null
          book_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          resend_message_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          trigger_condition?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_emails_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_emails_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_emails_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_deployments: {
        Row: {
          author_id: string
          content_snapshot: Json | null
          deployed_at: string | null
          deployment_status: string | null
          error_message: string | null
          ghl_campaign_ids: Json | null
          ghl_form_ids: Json | null
          ghl_pipeline_ids: Json | null
          ghl_workflow_ids: Json | null
          id: string
          node_id: string
        }
        Insert: {
          author_id: string
          content_snapshot?: Json | null
          deployed_at?: string | null
          deployment_status?: string | null
          error_message?: string | null
          ghl_campaign_ids?: Json | null
          ghl_form_ids?: Json | null
          ghl_pipeline_ids?: Json | null
          ghl_workflow_ids?: Json | null
          id?: string
          node_id: string
        }
        Update: {
          author_id?: string
          content_snapshot?: Json | null
          deployed_at?: string | null
          deployment_status?: string | null
          error_message?: string | null
          ghl_campaign_ids?: Json | null
          ghl_form_ids?: Json | null
          ghl_pipeline_ids?: Json | null
          ghl_workflow_ids?: Json | null
          id?: string
          node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghl_deployments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ghl_deployments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ghl_deployments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      home_study_courses: {
        Row: {
          author_id: string
          book_id: string
          content_markdown: string
          cover_image_url: string | null
          created_at: string
          currency: string | null
          description: string | null
          download_url: string | null
          duration_days: number | null
          id: string
          price: number | null
          source_asset_id: string | null
          status: string
          study_schedule_json: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          book_id: string
          content_markdown?: string
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          download_url?: string | null
          duration_days?: number | null
          id?: string
          price?: number | null
          source_asset_id?: string | null
          status?: string
          study_schedule_json?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          book_id?: string
          content_markdown?: string
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          download_url?: string | null
          duration_days?: number | null
          id?: string
          price?: number | null
          source_asset_id?: string | null
          status?: string
          study_schedule_json?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_study_courses_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_study_courses_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_study_courses_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "generated_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          author_id: string
          created_at: string
          id: string
          lead_id: string
          metadata: Json | null
        }
        Insert: {
          activity_type: string
          author_id: string
          created_at?: string
          id?: string
          lead_id: string
          metadata?: Json | null
        }
        Update: {
          activity_type?: string
          author_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "author_profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          abby_score: number
          author_id: string
          book_id: string | null
          captured_at: string
          created_at: string
          email: string
          id: string
          last_activity_at: string | null
          metadata: Json | null
          name: string | null
          nurture_stage: string
          quiz_completed_at: string | null
          quiz_score: number | null
          quiz_stage: string | null
          source: string
          stage: string
          status: string
          total_revenue: number
          updated_at: string
        }
        Insert: {
          abby_score?: number
          author_id: string
          book_id?: string | null
          captured_at?: string
          created_at?: string
          email: string
          id?: string
          last_activity_at?: string | null
          metadata?: Json | null
          name?: string | null
          nurture_stage?: string
          quiz_completed_at?: string | null
          quiz_score?: number | null
          quiz_stage?: string | null
          source?: string
          stage?: string
          status?: string
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          abby_score?: number
          author_id?: string
          book_id?: string | null
          captured_at?: string
          created_at?: string
          email?: string
          id?: string
          last_activity_at?: string | null
          metadata?: Json | null
          name?: string | null
          nurture_stage?: string
          quiz_completed_at?: string | null
          quiz_score?: number | null
          quiz_stage?: string | null
          source?: string
          stage?: string
          status?: string
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_assets: {
        Row: {
          asset_type: string
          author_id: string
          book_id: string | null
          content: Json
          created_at: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          asset_type: string
          author_id: string
          book_id?: string | null
          content?: Json
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          author_id?: string
          book_id?: string | null
          content?: Json
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_assets_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_assets_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
        ]
      }
      module_progress: {
        Row: {
          activity_completed: boolean | null
          completed_at: string | null
          debrief_completed: boolean | null
          enrollment_id: string
          id: string
          module_id: string
          started_at: string | null
          status: string
          workbook_completed: boolean | null
        }
        Insert: {
          activity_completed?: boolean | null
          completed_at?: string | null
          debrief_completed?: boolean | null
          enrollment_id: string
          id?: string
          module_id: string
          started_at?: string | null
          status?: string
          workbook_completed?: boolean | null
        }
        Update: {
          activity_completed?: boolean | null
          completed_at?: string | null
          debrief_completed?: boolean | null
          enrollment_id?: string
          id?: string
          module_id?: string
          started_at?: string | null
          status?: string
          workbook_completed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "module_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "course_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_signups: {
        Row: {
          book_id: string
          created_at: string
          email: string
          id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_signups_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_signups_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
        ]
      }
      node_gating: {
        Row: {
          category: string
          id: string
          is_open: boolean
          node_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          id?: string
          is_open?: boolean
          node_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          id?: string
          is_open?: boolean
          node_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      nurture_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          lead_id: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          lead_id: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "nurture_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_episodes: {
        Row: {
          ad_markers: Json | null
          audio_url: string | null
          author_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          episode_number: number
          format: string
          guest_questions: Json | null
          id: string
          intro_script: string | null
          outro_script: string | null
          podcast_id: string
          pull_quotes: Json | null
          script_markdown: string
          show_notes: string | null
          status: string
          title: string
          tts_status: string | null
          tts_voice_id: string | null
          updated_at: string
        }
        Insert: {
          ad_markers?: Json | null
          audio_url?: string | null
          author_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          episode_number?: number
          format?: string
          guest_questions?: Json | null
          id?: string
          intro_script?: string | null
          outro_script?: string | null
          podcast_id: string
          pull_quotes?: Json | null
          script_markdown?: string
          show_notes?: string | null
          status?: string
          title: string
          tts_status?: string | null
          tts_voice_id?: string | null
          updated_at?: string
        }
        Update: {
          ad_markers?: Json | null
          audio_url?: string | null
          author_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          episode_number?: number
          format?: string
          guest_questions?: Json | null
          id?: string
          intro_script?: string | null
          outro_script?: string | null
          podcast_id?: string
          pull_quotes?: Json | null
          script_markdown?: string
          show_notes?: string | null
          status?: string
          title?: string
          tts_status?: string | null
          tts_voice_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_episodes_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      podcasts: {
        Row: {
          author_id: string
          book_id: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          episode_count: number | null
          episode_format: string | null
          id: string
          monetization_goals: string[] | null
          rate_card_json: Json | null
          rss_author: string | null
          rss_category: string | null
          rss_description: string | null
          rss_language: string | null
          rss_title: string | null
          source_asset_id: string | null
          sponsorship_media_kit: string | null
          status: string
          target_audience: string | null
          title: string
          tone: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          book_id: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          episode_count?: number | null
          episode_format?: string | null
          id?: string
          monetization_goals?: string[] | null
          rate_card_json?: Json | null
          rss_author?: string | null
          rss_category?: string | null
          rss_description?: string | null
          rss_language?: string | null
          rss_title?: string | null
          source_asset_id?: string | null
          sponsorship_media_kit?: string | null
          status?: string
          target_audience?: string | null
          title: string
          tone?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          book_id?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          episode_count?: number | null
          episode_format?: string | null
          id?: string
          monetization_goals?: string[] | null
          rate_card_json?: Json | null
          rss_author?: string | null
          rss_category?: string | null
          rss_description?: string | null
          rss_language?: string | null
          rss_title?: string | null
          source_asset_id?: string | null
          sponsorship_media_kit?: string | null
          status?: string
          target_audience?: string | null
          title?: string
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcasts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcasts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcasts_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "generated_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          author_earnings: number
          author_id: string
          created_at: string
          currency: string
          customer_email: string
          customer_name: string | null
          id: string
          payout_eligible_at: string | null
          payout_id: string | null
          payout_status: string
          platform_fee: number
          product_id: string
          product_title: string
          product_type: string
          refund_status: string
          refunded_at: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          author_earnings?: number
          author_id: string
          created_at?: string
          currency?: string
          customer_email: string
          customer_name?: string | null
          id?: string
          payout_eligible_at?: string | null
          payout_id?: string | null
          payout_status?: string
          platform_fee?: number
          product_id: string
          product_title: string
          product_type: string
          refund_status?: string
          refunded_at?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          author_earnings?: number
          author_id?: string
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string | null
          id?: string
          payout_eligible_at?: string | null
          payout_id?: string | null
          payout_status?: string
          platform_fee?: number
          product_id?: string
          product_title?: string
          product_type?: string
          refund_status?: string
          refunded_at?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_responses: {
        Row: {
          answer_selected: string | null
          answer_text: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          question_number: number
        }
        Insert: {
          answer_selected?: string | null
          answer_text?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          question_number: number
        }
        Update: {
          answer_selected?: string | null
          answer_text?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          question_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          id: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          id?: string
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          id?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      reader_badges: {
        Row: {
          badge_name: string
          badge_type: string
          earned_at: string
          id: string
          metadata: Json | null
          reader_id: string
        }
        Insert: {
          badge_name: string
          badge_type: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          reader_id: string
        }
        Update: {
          badge_name?: string
          badge_type?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          reader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_badges_reader_id_fkey"
            columns: ["reader_id"]
            isOneToOne: false
            referencedRelation: "reader_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          favorite_genres: Json | null
          id: string
          reading_goal: number | null
          total_books_read: number | null
          total_streak_days: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          favorite_genres?: Json | null
          id?: string
          reading_goal?: number | null
          total_books_read?: number | null
          total_streak_days?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          favorite_genres?: Json | null
          id?: string
          reading_goal?: number | null
          total_books_read?: number | null
          total_streak_days?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reader_progress: {
        Row: {
          completed_at: string
          day_number: number
          id: string
          purchase_id: string
          start_date: string | null
          user_email: string
        }
        Insert: {
          completed_at?: string
          day_number: number
          id?: string
          purchase_id: string
          start_date?: string | null
          user_email: string
        }
        Update: {
          completed_at?: string
          day_number?: number
          id?: string
          purchase_id?: string
          start_date?: string | null
          user_email?: string
        }
        Relationships: []
      }
      reader_start_dates: {
        Row: {
          created_at: string
          id: string
          purchase_id: string
          start_date: string
          user_email: string
        }
        Insert: {
          created_at?: string
          id?: string
          purchase_id: string
          start_date: string
          user_email: string
        }
        Update: {
          created_at?: string
          id?: string
          purchase_id?: string
          start_date?: string
          user_email?: string
        }
        Relationships: []
      }
      reading_challenge_daily_logs: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          log_date: string
          minutes_read: number
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          log_date?: string
          minutes_read?: number
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          log_date?: string
          minutes_read?: number
        }
        Relationships: [
          {
            foreignKeyName: "reading_challenge_daily_logs_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "reading_challenge_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_challenge_entries: {
        Row: {
          book_id: string
          created_at: string
          id: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_challenge_entries_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_challenge_entries_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_challenges: {
        Row: {
          book_id: string
          challenge_config_id: string | null
          commitment_minutes: number | null
          completed_at: string | null
          created_at: string
          current_streak: number | null
          id: string
          longest_streak: number | null
          reader_id: string
          start_date: string
          status: string
          target_days: number
          total_days_read: number | null
        }
        Insert: {
          book_id: string
          challenge_config_id?: string | null
          commitment_minutes?: number | null
          completed_at?: string | null
          created_at?: string
          current_streak?: number | null
          id?: string
          longest_streak?: number | null
          reader_id: string
          start_date?: string
          status?: string
          target_days?: number
          total_days_read?: number | null
        }
        Update: {
          book_id?: string
          challenge_config_id?: string | null
          commitment_minutes?: number | null
          completed_at?: string | null
          created_at?: string
          current_streak?: number | null
          id?: string
          longest_streak?: number | null
          reader_id?: string
          start_date?: string
          status?: string
          target_days?: number
          total_days_read?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_challenges_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_challenges_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_challenges_challenge_config_id_fkey"
            columns: ["challenge_config_id"]
            isOneToOne: false
            referencedRelation: "reading_club_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_challenges_reader_id_fkey"
            columns: ["reader_id"]
            isOneToOne: false
            referencedRelation: "reader_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_club_challenge_participants: {
        Row: {
          challenge_id: string
          id: string
          joined_at: string
          member_id: string
          progress: number
        }
        Insert: {
          challenge_id: string
          id?: string
          joined_at?: string
          member_id: string
          progress?: number
        }
        Update: {
          challenge_id?: string
          id?: string
          joined_at?: string
          member_id?: string
          progress?: number
        }
        Relationships: [
          {
            foreignKeyName: "reading_club_challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "reading_club_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_club_challenge_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "reading_club_members"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_club_challenges: {
        Row: {
          book_id: string
          created_at: string
          description: string | null
          duration_days: number
          id: string
          status: string
          title: string
        }
        Insert: {
          book_id: string
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          status?: string
          title: string
        }
        Update: {
          book_id?: string
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_club_challenges_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_club_challenges_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_club_discussions: {
        Row: {
          book_id: string
          content: string
          created_at: string
          id: string
          member_id: string
          parent_id: string | null
        }
        Insert: {
          book_id: string
          content: string
          created_at?: string
          id?: string
          member_id: string
          parent_id?: string | null
        }
        Update: {
          book_id?: string
          content?: string
          created_at?: string
          id?: string
          member_id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_club_discussions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_club_discussions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_club_discussions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "reading_club_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_club_discussions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "reading_club_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_club_featured_books: {
        Row: {
          book_id: string
          created_at: string
          discussion_prompt: string | null
          featured_month: string
          id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          discussion_prompt?: string | null
          featured_month: string
          id?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          discussion_prompt?: string | null
          featured_month?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_club_featured_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_club_featured_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_club_members: {
        Row: {
          display_name: string | null
          email: string
          id: string
          joined_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          display_name?: string | null
          email: string
          id?: string
          joined_at?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          display_name?: string | null
          email?: string
          id?: string
          joined_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reading_logs: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          log_date: string
          minutes_read: number | null
          notes: string | null
          reader_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          log_date?: string
          minutes_read?: number | null
          notes?: string | null
          reader_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          log_date?: string
          minutes_read?: number | null
          notes?: string | null
          reader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_logs_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "reading_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_logs_reader_id_fkey"
            columns: ["reader_id"]
            isOneToOne: false
            referencedRelation: "reader_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_inquiries: {
        Row: {
          author_slug: string
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string | null
          service_type: string
          status: string
        }
        Insert: {
          author_slug: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone?: string | null
          service_type: string
          status?: string
        }
        Update: {
          author_slug?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string | null
          service_type?: string
          status?: string
        }
        Relationships: []
      }
      social_connections: {
        Row: {
          author_id: string
          channel_id: string
          channel_name: string | null
          created_at: string
          id: string
          platform: string
          status: string
          updated_at: string
        }
        Insert: {
          author_id: string
          channel_id: string
          channel_name?: string | null
          created_at?: string
          id?: string
          platform: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          channel_id?: string
          channel_name?: string | null
          created_at?: string
          id?: string
          platform?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_media_content: {
        Row: {
          author_id: string
          book_id: string
          content_text: string
          content_type: string
          created_at: string
          day_number: number | null
          id: string
          image_prompt: string | null
          platform: string
          scheduled_date: string | null
          source_asset_id: string | null
          status: string
        }
        Insert: {
          author_id: string
          book_id: string
          content_text?: string
          content_type?: string
          created_at?: string
          day_number?: number | null
          id?: string
          image_prompt?: string | null
          platform?: string
          scheduled_date?: string | null
          source_asset_id?: string | null
          status?: string
        }
        Update: {
          author_id?: string
          book_id?: string
          content_text?: string
          content_type?: string
          created_at?: string
          day_number?: number | null
          id?: string
          image_prompt?: string | null
          platform?: string
          scheduled_date?: string | null
          source_asset_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_media_content_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_content_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_media_content_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "generated_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          author_id: string
          buffer_post_id: string | null
          channel_id: string | null
          content: string
          created_at: string
          error_message: string | null
          id: string
          node_id: string
          platform: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          author_id: string
          buffer_post_id?: string | null
          channel_id?: string | null
          content: string
          created_at?: string
          error_message?: string | null
          id?: string
          node_id?: string
          platform: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          buffer_post_id?: string | null
          channel_id?: string | null
          content?: string
          created_at?: string
          error_message?: string | null
          id?: string
          node_id?: string
          platform?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      speaking_topics: {
        Row: {
          author_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          fee: number | null
          fee_currency: string | null
          id: string
          status: string
          title: string
        }
        Insert: {
          author_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          fee?: number | null
          fee_currency?: string | null
          id?: string
          status?: string
          title: string
        }
        Update: {
          author_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          fee?: number | null
          fee_currency?: string | null
          id?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      special_edition_bonus_content: {
        Row: {
          content: string
          content_type: string
          created_at: string
          id: string
          is_custom_upload: boolean | null
          sort_order: number | null
          special_edition_id: string
          title: string
        }
        Insert: {
          content?: string
          content_type: string
          created_at?: string
          id?: string
          is_custom_upload?: boolean | null
          sort_order?: number | null
          special_edition_id: string
          title: string
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          id?: string
          is_custom_upload?: boolean | null
          sort_order?: number | null
          special_edition_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_edition_bonus_content_special_edition_id_fkey"
            columns: ["special_edition_id"]
            isOneToOne: false
            referencedRelation: "special_editions"
            referencedColumns: ["id"]
          },
        ]
      }
      special_edition_bundles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          included_items: Json
          name: string
          price_cents: number
          special_edition_id: string
          stripe_price_id: string | null
          tier: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          included_items?: Json
          name: string
          price_cents?: number
          special_edition_id: string
          stripe_price_id?: string | null
          tier: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          included_items?: Json
          name?: string
          price_cents?: number
          special_edition_id?: string
          stripe_price_id?: string | null
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_edition_bundles_special_edition_id_fkey"
            columns: ["special_edition_id"]
            isOneToOne: false
            referencedRelation: "special_editions"
            referencedColumns: ["id"]
          },
        ]
      }
      special_edition_marketing: {
        Row: {
          body: string
          channel: string
          created_at: string
          day_number: number
          id: string
          is_published: boolean | null
          scheduled_date: string | null
          special_edition_id: string
          title: string
          week_theme: string | null
        }
        Insert: {
          body?: string
          channel: string
          created_at?: string
          day_number: number
          id?: string
          is_published?: boolean | null
          scheduled_date?: string | null
          special_edition_id: string
          title: string
          week_theme?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          day_number?: number
          id?: string
          is_published?: boolean | null
          scheduled_date?: string | null
          special_edition_id?: string
          title?: string
          week_theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_edition_marketing_special_edition_id_fkey"
            columns: ["special_edition_id"]
            isOneToOne: false
            referencedRelation: "special_editions"
            referencedColumns: ["id"]
          },
        ]
      }
      special_editions: {
        Row: {
          author_id: string
          book_id: string
          bundle_strategy_json: Json | null
          cover_concept: string | null
          created_at: string
          cross_builder_json: Json | null
          currency: string | null
          edition_identity_json: Json | null
          edition_type: string
          extras: string | null
          gift_buyer_persona: string | null
          id: string
          marketing_calendar_json: Json | null
          occasion: string | null
          occasion_date: string | null
          occasion_tagline: string | null
          price: number | null
          print_quantity: number | null
          print_run: string
          print_specs_json: Json | null
          published_at: string | null
          sales_copy_json: Json | null
          slug: string | null
          source_asset_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          book_id: string
          bundle_strategy_json?: Json | null
          cover_concept?: string | null
          created_at?: string
          cross_builder_json?: Json | null
          currency?: string | null
          edition_identity_json?: Json | null
          edition_type?: string
          extras?: string | null
          gift_buyer_persona?: string | null
          id?: string
          marketing_calendar_json?: Json | null
          occasion?: string | null
          occasion_date?: string | null
          occasion_tagline?: string | null
          price?: number | null
          print_quantity?: number | null
          print_run?: string
          print_specs_json?: Json | null
          published_at?: string | null
          sales_copy_json?: Json | null
          slug?: string | null
          source_asset_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          book_id?: string
          bundle_strategy_json?: Json | null
          cover_concept?: string | null
          created_at?: string
          cross_builder_json?: Json | null
          currency?: string | null
          edition_identity_json?: Json | null
          edition_type?: string
          extras?: string | null
          gift_buyer_persona?: string | null
          id?: string
          marketing_calendar_json?: Json | null
          occasion?: string | null
          occasion_date?: string | null
          occasion_tagline?: string | null
          price?: number | null
          print_quantity?: number | null
          print_run?: string
          print_specs_json?: Json | null
          published_at?: string | null
          sales_copy_json?: Json | null
          slug?: string | null
          source_asset_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_editions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_editions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_editions_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "generated_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          author_id: string
          book_id: string | null
          created_at: string
          id: string
          is_verified: boolean | null
          product_id: string | null
          rating: number | null
          review_text: string
          reviewer_name: string
          reviewer_title: string | null
        }
        Insert: {
          author_id: string
          book_id?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          product_id?: string | null
          rating?: number | null
          review_text: string
          reviewer_name: string
          reviewer_title?: string | null
        }
        Update: {
          author_id?: string
          book_id?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          product_id?: string | null
          rating?: number | null
          review_text?: string
          reviewer_name?: string
          reviewer_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
        ]
      }
      training_deliverables: {
        Row: {
          content: string | null
          created_at: string
          file_url: string | null
          id: string
          status: string
          title: string
          training_id: string
          type: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          status?: string
          title?: string
          training_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          status?: string
          title?: string
          training_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_deliverables_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          blooms_level: string | null
          created_at: string
          debrief_points: Json | null
          description: string | null
          duration_minutes: number | null
          facilitator_activity: string | null
          id: string
          kolbs_stage: string | null
          learning_objectives: Json | null
          module_number: number | null
          position: number
          slide_content: string | null
          source_chapters: Json | null
          title: string
          training_id: string
          workbook_page_description: string | null
        }
        Insert: {
          blooms_level?: string | null
          created_at?: string
          debrief_points?: Json | null
          description?: string | null
          duration_minutes?: number | null
          facilitator_activity?: string | null
          id?: string
          kolbs_stage?: string | null
          learning_objectives?: Json | null
          module_number?: number | null
          position?: number
          slide_content?: string | null
          source_chapters?: Json | null
          title: string
          training_id: string
          workbook_page_description?: string | null
        }
        Update: {
          blooms_level?: string | null
          created_at?: string
          debrief_points?: Json | null
          description?: string | null
          duration_minutes?: number | null
          facilitator_activity?: string | null
          id?: string
          kolbs_stage?: string | null
          learning_objectives?: Json | null
          module_number?: number | null
          position?: number
          slide_content?: string | null
          source_chapters?: Json | null
          title?: string
          training_id?: string
          workbook_page_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_modules_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programs: {
        Row: {
          author_id: string
          book_id: string | null
          course_format: string | null
          cover_image_url: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          price: number | null
          source_asset_id: string | null
          status: string
          subtitle: string | null
          target_student: string | null
          title: string
          transformation_promises: Json | null
          updated_at: string
          workshop_schedule: Json | null
        }
        Insert: {
          author_id: string
          book_id?: string | null
          course_format?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          price?: number | null
          source_asset_id?: string | null
          status?: string
          subtitle?: string | null
          target_student?: string | null
          title: string
          transformation_promises?: Json | null
          updated_at?: string
          workshop_schedule?: Json | null
        }
        Update: {
          author_id?: string
          book_id?: string | null
          course_format?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          price?: number | null
          source_asset_id?: string | null
          status?: string
          subtitle?: string | null
          target_student?: string | null
          title?: string
          transformation_promises?: Json | null
          updated_at?: string
          workshop_schedule?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "training_programs_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_programs_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_programs_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "generated_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webinar_registrations: {
        Row: {
          attended: boolean | null
          email: string
          id: string
          name: string | null
          registered_at: string
          webinar_id: string
        }
        Insert: {
          attended?: boolean | null
          email: string
          id?: string
          name?: string | null
          registered_at?: string
          webinar_id: string
        }
        Update: {
          attended?: boolean | null
          email?: string
          id?: string
          name?: string | null
          registered_at?: string
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinar_registrations_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      webinars: {
        Row: {
          author_id: string
          book_id: string
          created_at: string
          currency: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_free: boolean | null
          price: number | null
          registration_page_copy: string | null
          replay_url: string | null
          scheduled_at: string | null
          script_markdown: string
          slide_deck_url: string | null
          source_asset_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          book_id: string
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_free?: boolean | null
          price?: number | null
          registration_page_copy?: string | null
          replay_url?: string | null
          scheduled_at?: string | null
          script_markdown?: string
          slide_deck_url?: string | null
          source_asset_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          book_id?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_free?: boolean | null
          price?: number | null
          registration_page_copy?: string | null
          replay_url?: string | null
          scheduled_at?: string | null
          script_markdown?: string
          slide_deck_url?: string | null
          source_asset_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinars_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webinars_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webinars_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "generated_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      workbooks: {
        Row: {
          author_id: string
          book_id: string
          content_markdown: string
          cover_image_url: string | null
          created_at: string
          currency: string | null
          description: string | null
          download_url: string | null
          id: string
          page_count: number | null
          price: number | null
          source_asset_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          book_id: string
          content_markdown?: string
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          download_url?: string | null
          id?: string
          page_count?: number | null
          price?: number | null
          source_asset_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          book_id?: string
          content_markdown?: string
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          download_url?: string | null
          id?: string
          page_count?: number | null
          price?: number | null
          source_asset_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workbooks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workbooks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workbooks_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "generated_assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      author_profiles_public: {
        Row: {
          amazon_author_profile_url: string | null
          author_slug: string | null
          availability_notes: string | null
          bio_long: string | null
          bio_short: string | null
          cover_photo_url: string | null
          created_at: string | null
          credentials: Json | null
          directory_status: string | null
          frameworks: Json | null
          genres: string[] | null
          id: string | null
          instagram_url: string | null
          is_speaker: boolean | null
          linkedin_url: string | null
          location_city: string | null
          location_country: string | null
          pen_name: string | null
          photo_crop_y: string | null
          photo_url: string | null
          photo_zoom: number | null
          site_theme: string | null
          speaker_fee_range: string | null
          tagline: string | null
          twitter_url: string | null
          updated_at: string | null
          user_id: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          amazon_author_profile_url?: string | null
          author_slug?: string | null
          availability_notes?: string | null
          bio_long?: string | null
          bio_short?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          credentials?: Json | null
          directory_status?: string | null
          frameworks?: Json | null
          genres?: string[] | null
          id?: string | null
          instagram_url?: string | null
          is_speaker?: boolean | null
          linkedin_url?: string | null
          location_city?: string | null
          location_country?: string | null
          pen_name?: string | null
          photo_crop_y?: string | null
          photo_url?: string | null
          photo_zoom?: number | null
          site_theme?: string | null
          speaker_fee_range?: string | null
          tagline?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          amazon_author_profile_url?: string | null
          author_slug?: string | null
          availability_notes?: string | null
          bio_long?: string | null
          bio_short?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          credentials?: Json | null
          directory_status?: string | null
          frameworks?: Json | null
          genres?: string[] | null
          id?: string | null
          instagram_url?: string | null
          is_speaker?: boolean | null
          linkedin_url?: string | null
          location_city?: string | null
          location_country?: string | null
          pen_name?: string | null
          photo_crop_y?: string | null
          photo_url?: string | null
          photo_zoom?: number | null
          site_theme?: string | null
          speaker_fee_range?: string | null
          tagline?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      author_profiles_safe: {
        Row: {
          account_id: string | null
          amazon_author_profile_url: string | null
          author_slug: string | null
          availability_notes: string | null
          bio_long: string | null
          bio_short: string | null
          cover_photo_url: string | null
          created_at: string | null
          credentials: Json | null
          directory_status: string | null
          frameworks: Json | null
          genres: string[] | null
          has_seen_journey_onboarding: boolean | null
          id: string | null
          instagram_url: string | null
          is_speaker: boolean | null
          linkedin_url: string | null
          location_city: string | null
          location_country: string | null
          onboarding_completed: boolean | null
          pen_name: string | null
          photo_crop_y: string | null
          photo_url: string | null
          photo_zoom: number | null
          site_theme: string | null
          speaker_fee_range: string | null
          subscription_tier: string | null
          tagline: string | null
          twitter_url: string | null
          updated_at: string | null
          user_id: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          account_id?: string | null
          amazon_author_profile_url?: string | null
          author_slug?: string | null
          availability_notes?: string | null
          bio_long?: string | null
          bio_short?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          credentials?: Json | null
          directory_status?: string | null
          frameworks?: Json | null
          genres?: string[] | null
          has_seen_journey_onboarding?: boolean | null
          id?: string | null
          instagram_url?: string | null
          is_speaker?: boolean | null
          linkedin_url?: string | null
          location_city?: string | null
          location_country?: string | null
          onboarding_completed?: boolean | null
          pen_name?: string | null
          photo_crop_y?: string | null
          photo_url?: string | null
          photo_zoom?: number | null
          site_theme?: string | null
          speaker_fee_range?: string | null
          subscription_tier?: string | null
          tagline?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          account_id?: string | null
          amazon_author_profile_url?: string | null
          author_slug?: string | null
          availability_notes?: string | null
          bio_long?: string | null
          bio_short?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          credentials?: Json | null
          directory_status?: string | null
          frameworks?: Json | null
          genres?: string[] | null
          has_seen_journey_onboarding?: boolean | null
          id?: string | null
          instagram_url?: string | null
          is_speaker?: boolean | null
          linkedin_url?: string | null
          location_city?: string | null
          location_country?: string | null
          onboarding_completed?: boolean | null
          pen_name?: string | null
          photo_crop_y?: string | null
          photo_url?: string | null
          photo_zoom?: number | null
          site_theme?: string | null
          speaker_fee_range?: string | null
          subscription_tier?: string | null
          tagline?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      books_public: {
        Row: {
          ai_enriched: boolean | null
          amazon_author_profile_url: string | null
          amazon_url: string | null
          author_bio: string | null
          author_id: string | null
          author_name: string | null
          author_photo_url: string | null
          badges: string[] | null
          bestseller_proof_url: string | null
          cover_image_url: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          entry_mode: string | null
          genre: string | null
          id: string | null
          kindle_price: string | null
          pages: number | null
          paperback_price: string | null
          price: string | null
          published_at: string | null
          rating: number | null
          review_count: number | null
          slug: string | null
          subtitle: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          ai_enriched?: boolean | null
          amazon_author_profile_url?: string | null
          amazon_url?: string | null
          author_bio?: string | null
          author_id?: string | null
          author_name?: string | null
          author_photo_url?: string | null
          badges?: string[] | null
          bestseller_proof_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          entry_mode?: string | null
          genre?: string | null
          id?: string | null
          kindle_price?: string | null
          pages?: number | null
          paperback_price?: string | null
          price?: string | null
          published_at?: string | null
          rating?: number | null
          review_count?: number | null
          slug?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_enriched?: boolean | null
          amazon_author_profile_url?: string | null
          amazon_url?: string | null
          author_bio?: string | null
          author_id?: string | null
          author_name?: string | null
          author_photo_url?: string | null
          badges?: string[] | null
          bestseller_proof_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          entry_mode?: string | null
          genre?: string | null
          id?: string | null
          kindle_price?: string | null
          pages?: number | null
          paperback_price?: string | null
          price?: string | null
          published_at?: string | null
          rating?: number | null
          review_count?: number | null
          slug?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_account_id: { Args: never; Returns: string }
      get_reading_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          author_name: string
          book_title: string
          days_logged: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
