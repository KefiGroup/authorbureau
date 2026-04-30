export interface Submission {
  id: string;
  full_name: string;
  email: string;
  genres?: string | string[];
  bio?: string;
  amazon_book_url?: string;
  website_url?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name?: string;
  created_at: string;
}

export interface AdminBook {
  id: string;
  title: string;
  subtitle?: string | null;
  author_name?: string;
  genre?: string;
  cover_image_url?: string;
  slug: string;
  published_at?: string | null;
  created_at?: string;
  entry_mode?: string;
  description?: string | null;
  amazon_url?: string | null;
  price?: string | null;
  currency?: string | null;
  kindle_price?: string | null;
  paperback_price?: string | null;
  pages?: number | null;
  rating?: number | null;
  badges?: string[] | null;
  bestseller_proof_url?: string | null;
  owner_email?: string | null;
  approval_status?: string | null;
  rejection_note?: string | null;
  submitted_at?: string | null;
  review_round?: number | null;
  last_review_action_at?: string | null;
}

export interface AdminInfo {
  id: string;
  user_id: string;
  email: string;
  display_name?: string;
  is_super_admin?: boolean;
}

export interface AdminStats {
  total_users?: number;
  users?: number;
  total_submissions?: number;
  submissions?: number;
  total_books?: number;
  books?: number;
  total_admins?: number;
  admins?: number;
  pending_submissions?: number;
  recent_submissions?: Submission[];
}
