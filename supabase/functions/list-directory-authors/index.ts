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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all authors approved for directory
    const { data: authors, error: authError } = await supabase
      .from("author_profiles")
      .select("user_id, pen_name, bio_short, tagline, photo_url, genres, credentials, website_url, linkedin_url, amazon_author_profile_url, is_speaker, directory_status, author_slug, location_city, location_country")
      .in("directory_status", ["listed", "verified", "featured"]);

    if (authError) throw authError;

    // Fetch all published books
    const { data: books, error: booksError } = await supabase
      .from("books")
      .select("id, title, slug, cover_image_url, author_id, badges, rating, author_name")
      .not("published_at", "is", null);

    if (booksError) throw booksError;

    // Map books to authors by author_id
    const booksMap = new Map<string, typeof books>();
    (books || []).forEach((book) => {
      if (!booksMap.has(book.author_id)) {
        booksMap.set(book.author_id, []);
      }
      booksMap.get(book.author_id)!.push(book);
    });

    // Also map books by author_name to handle cross-platform ID mismatches
    const booksByName = new Map<string, typeof books>();
    (books || []).forEach((book) => {
      if (book.author_name) {
        if (!booksByName.has(book.author_name)) {
          booksByName.set(book.author_name, []);
        }
        booksByName.get(book.author_name)!.push(book);
      }
    });

    // Transform authors with their books
    const result = (authors || []).map((a) => ({
      slug: a.author_slug || a.user_id,
      name: a.pen_name || "Author",
      photo: a.photo_url || "",
      title: a.tagline || a.bio_short?.slice(0, 100) || "",
      shortBio: a.bio_short || "",
      genres: a.genres || [],
      badge: a.directory_status === "featured" ? "featured" : a.directory_status === "verified" ? "ab-verified" : "listed",
      services: [
        ...(a.is_speaker ? ["Speaking"] : []),
      ],
      books: (() => {
        // Merge books by author_id and by pen_name (deduplicated)
        const byId = booksMap.get(a.user_id) || [];
        const byName = a.pen_name ? (booksByName.get(a.pen_name) || []) : [];
        const seen = new Set(byId.map(b => b.id));
        const merged = [...byId];
        for (const b of byName) {
          if (!seen.has(b.id)) { seen.add(b.id); merged.push(b); }
        }
        return merged;
      })().map((b) => ({
        slug: b.slug,
        title: b.title,
        coverImage: b.cover_image_url || "",
        badges: b.badges || [],
        rating: b.rating ? Number(b.rating) : undefined,
      })),
      websiteUrl: a.website_url,
      linkedinUrl: a.linkedin_url,
      amazonAuthorUrl: a.amazon_author_profile_url,
      credentials: a.credentials || [],
      locationCity: a.location_city,
      locationCountry: a.location_country,
    }));

    return new Response(JSON.stringify({ authors: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: errMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
