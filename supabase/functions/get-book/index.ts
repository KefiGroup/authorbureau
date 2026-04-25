import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug, preview } = await req.json();
    if (!slug) {
      return new Response(JSON.stringify({ error: "slug is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cloudClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch book — skip published_at check when preview=true
    let query = cloudClient
      .from("books")
      .select("*")
      .eq("slug", slug);

    if (!preview) {
      query = query.not("published_at", "is", null);
    }

    const { data: book, error } = await query.maybeSingle();

    if (error) throw error;
    if (!book) {
      return new Response(JSON.stringify({ error: "Book not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If author data is missing on the book, enrich from local author_profiles
    if (!book.author_name || !book.author_bio || !book.author_photo_url) {
      const { data: profile } = await cloudClient
        .from("author_profiles")
        .select("pen_name, bio_short, bio_long, photo_url")
        .eq("user_id", book.author_id)
        .maybeSingle();

      if (profile) {
        if (!book.author_name && profile.pen_name) book.author_name = profile.pen_name;
        if (!book.author_bio) book.author_bio = profile.bio_long || profile.bio_short || null;
        if (!book.author_photo_url && profile.photo_url) book.author_photo_url = profile.photo_url;

        // Backfill so this doesn't happen again
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
    const errMessage = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: errMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
