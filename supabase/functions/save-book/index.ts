import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify user on shared backend using their token
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "No auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await sharedClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const cloudAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2. Read author data from Cloud's local author_profiles (synced earlier)
    let authorName = body.authorName || null;
    let authorBio = body.authorBio || null;
    let authorPhotoUrl = body.authorPhotoUrl || null;

    const { data: localProfile } = await cloudAdmin
      .from("author_profiles")
      .select("pen_name, bio_short, bio_long, photo_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (localProfile) {
      if (!authorName && localProfile.pen_name) authorName = localProfile.pen_name;
      if (!authorBio && (localProfile.bio_short || localProfile.bio_long)) authorBio = localProfile.bio_short || localProfile.bio_long;
      if (!authorPhotoUrl && localProfile.photo_url) authorPhotoUrl = localProfile.photo_url;
    }

    // 3. Generate slug
    const slug = body.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50);

    // 4. Check for duplicate slug
    const { data: existing } = await cloudAdmin
      .from("books")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "A book with this title already exists" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Insert book
    const { data: newBook, error: insertError } = await cloudAdmin
      .from("books")
      .insert({
        author_id: user.id,
        title: body.title,
        subtitle: body.subtitle || null,
        description: body.description,
        slug,
        pages: body.pages || null,
        rating: body.rating || null,
        genre: body.genre || null,
        badges: body.badges || [],
        price: body.price || null,
        currency: body.currency || "USD",
        kindle_price: body.kindlePrice || null,
        paperback_price: body.paperbackPrice || null,
        amazon_url: body.amazonUrl,
        author_name: authorName,
        author_bio: authorBio,
        author_photo_url: authorPhotoUrl,
        cover_image_url: body.coverImageUrl || null,
        entry_mode: "manual",
        ai_enriched: false,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ id: newBook.id, slug }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
