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
          amazon_author_profile_url: string | null
          author_slug: string | null
          availability_notes: string | null
          bio_long: string | null
          bio_short: string | null
          cover_photo_url: string | null
          created_at: string
          credentials: Json | null
          directory_status: string
          frameworks: Json | null
          genres: string[] | null
          has_seen_journey_onboarding: boolean
          id: string
          instagram_url: string | null
          is_speaker: boolean | null
          last_synced_at: string | null
          linkedin_url: string | null
          location_city: string | null
          location_country: string | null
          pen_name: string | null
          photo_crop_y: string | null
          photo_url: string | null
          photo_zoom: number | null
          site_theme: string
          speaker_fee_range: string | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          tagline: string | null
          twitter_url: string | null
          updated_at: string
          user_id: string
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
          created_at?: string
          credentials?: Json | null
          directory_status?: string
          frameworks?: Json | null
          genres?: string[] | null
          has_seen_journey_onboarding?: boolean
          id?: string
          instagram_url?: string | null
          is_speaker?: boolean | null
          last_synced_at?: string | null
          linkedin_url?: string | null
          location_city?: string | null
          location_country?: string | null
          pen_name?: string | null
          photo_crop_y?: string | null
          photo_url?: string | null
          photo_zoom?: number | null
          site_theme?: string
          speaker_fee_range?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          tagline?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id: string
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
          created_at?: string
          credentials?: Json | null
          directory_status?: string
          frameworks?: Json | null
          genres?: string[] | null
          has_seen_journey_onboarding?: boolean
          id?: string
          instagram_url?: string | null
          is_speaker?: boolean | null
          last_synced_at?: string | null
          linkedin_url?: string | null
          location_city?: string | null
          location_country?: string | null
          pen_name?: string | null
          photo_crop_y?: string | null
          photo_url?: string | null
          photo_zoom?: number | null
          site_theme?: string
          speaker_fee_range?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          tagline?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
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
      course_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          progress_percent: number | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          progress_percent?: number | null
          status?: string
          user_id: string
        }
        Update: {
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
          course_id: string
          created_at: string
          description: string | null
          id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          title?: string
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
          cover_image_url: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          price: number | null
          source_asset_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          book_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          price?: number | null
          source_asset_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          book_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          price?: number | null
          source_asset_id?: string | null
          status?: string
          title?: string
          updated_at?: string
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
          author_id: string
          company: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          company?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
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
          created_at: string
          description: string | null
          flow_type: string
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          author_id: string
          book_id?: string | null
          created_at?: string
          description?: string | null
          flow_type: string
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          author_id?: string
          book_id?: string | null
          created_at?: string
          description?: string | null
          flow_type?: string
          id?: string
          status?: string
          title?: string
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
      generated_assets: {
        Row: {
          asset_type: string
          author_id: string
          book_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          asset_type: string
          author_id: string
          book_id: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          author_id?: string
          book_id?: string
          content?: string
          created_at?: string
          id?: string
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
