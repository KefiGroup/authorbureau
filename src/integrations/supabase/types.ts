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
          genres: string[] | null
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
          speaker_fee_range: string | null
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
          genres?: string[] | null
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
          speaker_fee_range?: string | null
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
          genres?: string[] | null
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
          speaker_fee_range?: string | null
          tagline?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          youtube_url?: string | null
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
      courses: {
        Row: {
          author_id: string
          cover_image_url: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          price: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          price?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          price?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
