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
    // 1. Verify user on shared backend
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

    // 2. Fetch profile from shared backend
    const { data: profile, error: profileError } = await sharedClient
      .from("author_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return new Response(JSON.stringify({ error: "Failed to fetch profile from shared backend" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile) {
      return new Response(JSON.stringify({ synced: false, message: "No profile found on shared backend" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Upsert into Cloud's author_profiles using service role
    const cloudAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const upsertData = {
      user_id: user.id,
      pen_name: profile.pen_name,
      bio_short: profile.bio_short,
      bio_long: profile.bio_long,
      photo_url: profile.photo_url,
      cover_photo_url: profile.cover_photo_url,
      tagline: profile.tagline,
      genres: profile.genres,
      website_url: profile.website_url,
      linkedin_url: profile.linkedin_url,
      twitter_url: profile.twitter_url,
      instagram_url: profile.instagram_url,
      youtube_url: profile.youtube_url,
      amazon_author_profile_url: profile.amazon_author_profile_url,
      location_city: profile.location_city,
      location_country: profile.location_country,
      credentials: profile.credentials,
      is_speaker: profile.is_speaker,
      speaker_fee_range: profile.speaker_fee_range,
      availability_notes: profile.availability_notes,
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error: upsertError } = await cloudAdmin
      .from("author_profiles")
      .upsert(upsertData, { onConflict: "user_id" })
      .select("id, pen_name, photo_url")
      .single();

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Also backfill any existing books by this author that have missing author data
    await cloudAdmin
      .from("books")
      .update({
        author_name: profile.pen_name,
        author_bio: profile.bio_short || profile.bio_long,
        author_photo_url: profile.photo_url,
      })
      .eq("author_id", user.id)
      .is("author_name", null);

    return new Response(
      JSON.stringify({ synced: true, profile: upserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
