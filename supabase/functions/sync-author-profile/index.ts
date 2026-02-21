import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "No auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cloudAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve user from shared backend (primary auth source)
    const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
    const { data: { user: sharedUser }, error: sharedErr } = await sharedClient.auth.getUser(token);
    
    let userId: string;
    let userEmail: string | undefined;
    let userMeta: Record<string, any> = {};

    if (sharedUser) {
      userId = sharedUser.id;
      userEmail = sharedUser.email;
      userMeta = sharedUser.user_metadata || {};
    } else {
      // Fallback to Cloud auth
      const { data: { user: cloudUser } } = await cloudAdmin.auth.getUser(token);
      if (!cloudUser) {
        return new Response(JSON.stringify({ error: "Invalid session" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = cloudUser.id;
      userEmail = cloudUser.email;
      userMeta = cloudUser.user_metadata || {};
    }

    console.log("Syncing profile for user:", userId, "email:", userEmail);
    console.log("User metadata keys:", Object.keys(userMeta));

    // Try to fetch author_profiles from shared backend via REST
    let profile: any = null;

    // Attempt 1: query by id (shared backend uses id = auth.uid())
    const res1 = await fetch(
      `${SHARED_BACKEND_URL}/rest/v1/author_profiles?user_id=eq.${userId}&select=*&limit=1`,
      {
        headers: {
          apikey: SHARED_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (res1.ok) {
      const data1 = await res1.json();
      console.log("Profile query by id returned:", data1.length, "rows");
      if (Array.isArray(data1) && data1.length > 0) {
        profile = data1[0];
      }
    } else {
      console.log("Profile query by id failed:", await res1.text());
    }

    // Attempt 2: RLS-filtered query (should return only the user's own profile)
    if (!profile) {
      const res2 = await fetch(
        `${SHARED_BACKEND_URL}/rest/v1/author_profiles?select=*&limit=1`,
        {
          headers: {
            apikey: SHARED_ANON_KEY,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res2.ok) {
        const data2 = await res2.json();
        console.log("RLS-filtered profile query returned:", data2.length, "rows");
        if (Array.isArray(data2) && data2.length > 0) {
          profile = data2[0];
        }
      }
    }

    // Build profile data from whatever source we have
    // Priority: shared backend profile > user metadata > email-derived name
    const penName = profile?.pen_name 
      || profile?.display_name
      || userMeta.pen_name 
      || userMeta.display_name 
      || userMeta.full_name 
      || userMeta.name
      || (userEmail ? userEmail.split("@")[0] : null);

    const bioShort = profile?.bio_short || userMeta.bio_short || userMeta.bio || null;
    const bioLong = profile?.bio_long || userMeta.bio_long || null;
    const photoUrl = profile?.photo_url || userMeta.photo_url || userMeta.avatar_url || null;

    console.log("Resolved pen_name:", penName, "bio:", !!bioShort, "photo:", !!photoUrl);

    if (!penName) {
      return new Response(
        JSON.stringify({ synced: false, message: "No profile data found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert into Cloud's author_profiles using service role
    const upsertData: Record<string, any> = {
      user_id: userId,
      pen_name: penName,
      updated_at: new Date().toISOString(),
    };

    if (bioShort) upsertData.bio_short = bioShort;
    if (bioLong) upsertData.bio_long = bioLong;
    if (photoUrl) upsertData.photo_url = photoUrl;
    if (profile?.cover_photo_url) upsertData.cover_photo_url = profile.cover_photo_url;
    if (profile?.tagline) upsertData.tagline = profile.tagline;
    if (profile?.genres) upsertData.genres = profile.genres;
    if (profile?.website_url) upsertData.website_url = profile.website_url;
    if (profile?.linkedin_url) upsertData.linkedin_url = profile.linkedin_url;
    if (profile?.twitter_url) upsertData.twitter_url = profile.twitter_url;
    if (profile?.instagram_url) upsertData.instagram_url = profile.instagram_url;
    if (profile?.youtube_url) upsertData.youtube_url = profile.youtube_url;
    if (profile?.amazon_author_profile_url) upsertData.amazon_author_profile_url = profile.amazon_author_profile_url;
    if (profile?.location_city) upsertData.location_city = profile.location_city;
    if (profile?.location_country) upsertData.location_country = profile.location_country;
    if (profile?.credentials) upsertData.credentials = profile.credentials;
    if (profile?.is_speaker != null) upsertData.is_speaker = profile.is_speaker;
    if (profile?.speaker_fee_range) upsertData.speaker_fee_range = profile.speaker_fee_range;
    if (profile?.availability_notes) upsertData.availability_notes = profile.availability_notes;

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

    // Backfill ALL books by this author that are missing author_name
    const { error: backfillError } = await cloudAdmin
      .from("books")
      .update({
        author_name: penName,
        author_bio: bioShort || bioLong,
        author_photo_url: photoUrl,
      })
      .eq("author_id", userId);

    if (backfillError) {
      console.error("Backfill error:", backfillError);
    } else {
      console.log("Backfilled books for author:", userId);
    }

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
