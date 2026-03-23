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
    // Support both GET (query param) and POST (JSON body)
    let slug: string | null = null;
    if (req.method === "GET") {
      const url = new URL(req.url);
      slug = url.searchParams.get("slug");
    } else {
      try {
        const body = await req.json();
        slug = body.slug;
      } catch {
        slug = null;
      }
    }
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

    // Check if caller is the profile owner (optional auth)
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    let callerUserId: string | null = null;
    if (token) {
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        callerUserId = user?.id ?? null;
      } catch { /* not authenticated, that's fine for public access */ }
    }

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

    // Enforce directory_status access control:
    // Only allow access to listed/featured/verified profiles, unless caller is the profile owner
    if (author && callerUserId !== author.user_id) {
      const allowedStatuses = ["listed", "featured", "verified"];
      if (!allowedStatuses.includes(author.directory_status)) {
        return new Response(JSON.stringify({ error: "Author not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!author) {
      return new Response(JSON.stringify({ error: "Author not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch published books for this author
    const { data: booksByAuthorId } = await supabase
      .from("books")
      .select("*")
      .eq("author_id", author.user_id)
      .not("published_at", "is", null);

    // Also check by pen_name match on author_name
    const seenIds = new Set((booksByAuthorId || []).map((b: any) => b.id));
    const allBooks = [...(booksByAuthorId || [])];

    if (author.pen_name) {
      const { data: booksByName } = await supabase
        .from("books")
        .select("*")
        .eq("author_name", author.pen_name)
        .not("published_at", "is", null);
      for (const b of (booksByName || [])) {
        if (!seenIds.has(b.id)) {
          seenIds.add(b.id);
          allBooks.push(b);
        }
      }
    }

    const books = allBooks.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Fetch all product types in parallel
    const [homeStudyRes, coursesRes, coachingRes, audiobooksRes, podcastsRes] = await Promise.all([
      supabase.from("home_study_courses").select("id, title, price, currency, book_id").eq("author_id", author.user_id).eq("status", "published"),
      supabase.from("courses").select("id, title, price, currency, book_id").eq("author_id", author.user_id).eq("status", "published"),
      supabase.from("coaching_packages").select("id, title, price, currency").eq("author_id", author.user_id).eq("status", "active"),
      supabase.from("audiobooks").select("id, title, price, currency, book_id").eq("author_id", author.user_id).eq("status", "published"),
      supabase.from("podcasts").select("id, title, book_id").eq("author_id", author.user_id).eq("status", "published"),
    ]);

    const homeStudy = homeStudyRes.data || [];
    const courses = coursesRes.data || [];
    const coaching = coachingRes.data || [];
    const audiobooks = audiobooksRes.data || [];
    const podcasts = podcastsRes.data || [];

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
      books: (books || []).map((b: any) => {
        const bookProducts: any[] = [];
        homeStudy.filter((p: any) => p.book_id === b.id).forEach((p: any) => {
          bookProducts.push({ id: p.id, title: p.title, type: "home_study", price: p.price, currency: p.currency });
        });
        courses.filter((p: any) => p.book_id === b.id).forEach((p: any) => {
          bookProducts.push({ id: p.id, title: p.title, type: "course", price: p.price, currency: p.currency });
        });
        audiobooks.filter((p: any) => p.book_id === b.id).forEach((p: any) => {
          bookProducts.push({ id: p.id, title: p.title, type: "audiobook", price: p.price, currency: p.currency });
        });
        podcasts.filter((p: any) => p.book_id === b.id).forEach((p: any) => {
          bookProducts.push({ id: p.id, title: p.title, type: "podcast", price: null, currency: null });
        });

        return {
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
          products: bookProducts,
        };
      }),
      // Coaching packages (not book-scoped)
      coaching: coaching.map((p: any) => ({
        id: p.id, title: p.title, price: p.price, currency: p.currency,
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
