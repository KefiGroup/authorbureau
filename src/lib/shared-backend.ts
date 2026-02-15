import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
export const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

export const sharedSupabase = createClient<Database>(
  SHARED_BACKEND_URL,
  SHARED_ANON_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// Re-export as `supabase` so existing imports only need to change the path
export const supabase = sharedSupabase;
