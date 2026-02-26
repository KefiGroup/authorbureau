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
    const { slug } = await req.json();
    if (!slug) {
      return new Response(JSON.stringify({ error: "Slug required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try to find by author_slug first, then by user_id
    let author = null;
    const { data: bySlug } = await supabase
      .from("author_profiles")
      .select("*")
      .eq("author_slug", slug)
      .maybeSingle();

    if (bySlug) {
      author = bySlug;
    } else {
      const { data: byUserId } = await supabase
        .from("author_profiles")
        .select("*")
        .eq("user_id", slug)
        .maybeSingle();
      author = byUserId;
    }

    if (!author) {
      return new Response(JSON.stringify({ error: "Author not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch published books for this author
    const { data: books } = await supabase
      .from("books")
      .select("*")
      .eq("author_id", author.user_id)
      .not("published_at", "is", null)
      .order("created_at", { ascending: false });

    const result = {
      slug: author.author_slug || author.user_id,
      name: author.pen_name || "Author",
      photo: author.photo_url || "",
      title: author.tagline || "",
      bio: author.bio_long || author.bio_short || "",
      shortBio: author.bio_short || "",
      credentials: author.credentials || [],
      genres: author.genres || [],
      badge: author.directory_status === "featured" ? "featured" : author.directory_status === "verified" ? "ab-verified" : "listed",
      services: [
        ...(author.is_speaker ? ["Speaking"] : []),
      ],
      websiteUrl: author.website_url,
      linkedinUrl: author.linkedin_url,
      amazonAuthorUrl: author.amazon_author_profile_url,
      locationCity: author.location_city,
      locationCountry: author.location_country,
      books: (books || []).map((b: any) => ({
        slug: b.slug,
        title: b.title,
        subtitle: b.subtitle || "",
        description: b.description || "",
        coverImage: b.cover_image_url || "",
        amazonUrl: b.amazon_url || "",
        badges: b.badges || [],
        genre: b.genre || "",
        price: b.price || undefined,
        kindlePrice: b.kindle_price || undefined,
        paperbackPrice: b.paperback_price || undefined,
        pages: b.pages || undefined,
        rating: b.rating ? Number(b.rating) : undefined,
      })),
    };

    return new Response(JSON.stringify({ author: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
