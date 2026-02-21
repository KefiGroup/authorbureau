import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug } = await req.json();
    if (!slug) {
      return new Response(JSON.stringify({ error: "slug is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch book from Cloud DB
    const cloudClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: book, error } = await cloudClient
      .from("books")
      .select("*")
      .eq("slug", slug)
      .not("published_at", "is", null)
      .maybeSingle();

    if (error) throw error;
    if (!book) {
      return new Response(JSON.stringify({ error: "Book not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If author data is missing, fetch from shared backend
    if (!book.author_name || !book.author_bio || !book.author_photo_url) {
      const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
      const { data: profile } = await sharedClient
        .from("author_profiles")
        .select("pen_name, bio_short, bio_long, photo_url")
        .eq("user_id", book.author_id)
        .maybeSingle();

      if (profile) {
        // Enrich the response
        if (!book.author_name && profile.pen_name) book.author_name = profile.pen_name;
        if (!book.author_bio) book.author_bio = profile.bio_short || profile.bio_long || null;
        if (!book.author_photo_url && profile.photo_url) book.author_photo_url = profile.photo_url;

        // Also backfill the DB so this doesn't happen again
        await cloudClient
          .from("books")
          .update({
            author_name: book.author_name,
            author_bio: book.author_bio,
            author_photo_url: book.author_photo_url,
          })
          .eq("id", book.id);
      }
    }

    return new Response(JSON.stringify({ book }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
