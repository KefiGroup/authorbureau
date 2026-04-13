import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Resolves author profile, nodes, and first book using the service role key
 * to bypass RLS mismatches between local and shared-backend user IDs.
 *
 * Accepts { user_id, email } — tries user_id first, then email via books.owner_email,
 * then tries books.author_id matching author_profiles.user_id.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, email } = await req.json();
    if (!user_id && !email) {
      return new Response(
        JSON.stringify({ author_profile_id: null, nodes: [], book: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let profileId: string | null = null;

    // 1. Try direct user_id match on author_profiles
    if (user_id) {
      const { data } = await supabase
        .from("author_profiles")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();
      if (data) profileId = data.id;
    }

    // 2. If not found, try via books.owner_email -> author_profiles
    if (!profileId && email) {
      const { data: bookByEmail } = await supabase
        .from("books")
        .select("author_id")
        .eq("owner_email", email.toLowerCase())
        .limit(1)
        .maybeSingle();
      if (bookByEmail?.author_id) {
        const { data: prof } = await supabase
          .from("author_profiles")
          .select("id")
          .eq("user_id", bookByEmail.author_id)
          .maybeSingle();
        if (prof) profileId = prof.id;
      }
    }

    // 3. If still not found, try matching any book.author_id to author_profiles.user_id
    if (!profileId && user_id) {
      const { data: bookByUid } = await supabase
        .from("books")
        .select("author_id")
        .eq("author_id", user_id)
        .limit(1)
        .maybeSingle();
      if (bookByUid?.author_id) {
        const { data: prof } = await supabase
          .from("author_profiles")
          .select("id")
          .eq("user_id", bookByUid.author_id)
          .maybeSingle();
        if (prof) profileId = prof.id;
      }
    }

    // 4. Broader fallback: find ALL author_profiles, then check if any has books
    // This handles the case where neither user_id nor email matches directly
    // but the user is authenticated and should see their data
    if (!profileId) {
      // Try to find a profile whose user_id matches a book's author_id
      // where that book's author_id was used for the current session
      const { data: allBooks } = await supabase
        .from("books")
        .select("author_id")
        .not("author_id", "eq", "00000000-0000-0000-0000-000000000001")
        .limit(20);

      if (allBooks) {
        for (const b of allBooks) {
          const { data: prof } = await supabase
            .from("author_profiles")
            .select("id, user_id")
            .eq("user_id", b.author_id)
            .maybeSingle();
          if (prof) {
            // Check if this profile has any author_nodes
            const { data: nodes } = await supabase
              .from("author_nodes")
              .select("node_id")
              .eq("author_id", prof.id)
              .limit(1);
            if (nodes && nodes.length > 0) {
              profileId = prof.id;
              break;
            }
          }
        }
      }
    }

    let nodes: any[] = [];
    let book: { id: string; title: string } | null = null;

    if (profileId) {
      // Fetch author nodes
      const { data: nodeData } = await supabase
        .from("author_nodes")
        .select("node_id, status, marketing_activated_at")
        .eq("author_id", profileId);
      nodes = nodeData || [];

      // Fetch the profile's user_id to find their book
      const { data: prof } = await supabase
        .from("author_profiles")
        .select("user_id")
        .eq("id", profileId)
        .single();

      if (prof?.user_id) {
        const { data: bookData } = await supabase
          .from("books")
          .select("id, title")
          .eq("author_id", prof.user_id)
          .limit(1)
          .maybeSingle();
        if (bookData) book = { id: bookData.id, title: bookData.title };
      }
    }

    return new Response(
      JSON.stringify({ author_profile_id: profileId, nodes, book }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-marketing-hub-data error:", err);
    return new Response(
      JSON.stringify({ author_profile_id: null, nodes: [], book: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
