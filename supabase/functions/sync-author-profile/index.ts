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

    // Resolve user ID — try Cloud first, then shared backend
    let userId: string;
    const { data: { user: cloudUser } } = await cloudAdmin.auth.getUser(token);
    if (cloudUser) {
      userId = cloudUser.id;
    } else {
      const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
      const { data: { user: sharedUser }, error } = await sharedClient.auth.getUser(token);
      if (error || !sharedUser) {
        return new Response(JSON.stringify({ error: "Invalid session" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = sharedUser.id;
    }

    // Fetch profile from shared backend using REST API directly
    // Try multiple column name patterns since the shared backend schema may differ
    let profile: any = null;

    // Attempt 1: query by user_id
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
      if (Array.isArray(data1) && data1.length > 0) {
        profile = data1[0];
      }
    } else {
      console.log("user_id query failed, trying id column...", await res1.text());
    }

    // Attempt 2: query by id (some schemas use id = auth.uid())
    if (!profile) {
      const res2 = await fetch(
        `${SHARED_BACKEND_URL}/rest/v1/author_profiles?id=eq.${userId}&select=*&limit=1`,
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
        if (Array.isArray(data2) && data2.length > 0) {
          profile = data2[0];
        }
      } else {
        console.log("id query also failed:", await res2.text());
      }
    }

    // Attempt 3: Just get the user's profile (RLS should filter to current user)
    if (!profile) {
      const res3 = await fetch(
        `${SHARED_BACKEND_URL}/rest/v1/author_profiles?select=*&limit=1`,
        {
          headers: {
            apikey: SHARED_ANON_KEY,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res3.ok) {
        const data3 = await res3.json();
        if (Array.isArray(data3) && data3.length > 0) {
          profile = data3[0];
        }
      } else {
        console.log("RLS-filtered query also failed:", await res3.text());
      }
    }

    if (!profile) {
      // Try to get basic info from the user's auth metadata
      const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
      const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);
      const meta = sharedUser?.user_metadata;
      
      if (meta && (meta.pen_name || meta.display_name || meta.full_name)) {
        profile = {
          pen_name: meta.pen_name || meta.display_name || meta.full_name || null,
          bio_short: meta.bio_short || meta.bio || null,
          bio_long: meta.bio_long || null,
          photo_url: meta.photo_url || meta.avatar_url || null,
        };
      } else {
        return new Response(
          JSON.stringify({ synced: false, message: "No profile found on shared backend" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Upsert into Cloud's author_profiles using service role
    const upsertData: Record<string, any> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    // Map known fields (handle both naming conventions)
    if (profile.pen_name) upsertData.pen_name = profile.pen_name;
    if (profile.bio_short) upsertData.bio_short = profile.bio_short;
    if (profile.bio_long) upsertData.bio_long = profile.bio_long;
    if (profile.photo_url) upsertData.photo_url = profile.photo_url;
    if (profile.cover_photo_url) upsertData.cover_photo_url = profile.cover_photo_url;
    if (profile.tagline) upsertData.tagline = profile.tagline;
    if (profile.genres) upsertData.genres = profile.genres;
    if (profile.website_url) upsertData.website_url = profile.website_url;
    if (profile.linkedin_url) upsertData.linkedin_url = profile.linkedin_url;
    if (profile.twitter_url) upsertData.twitter_url = profile.twitter_url;
    if (profile.instagram_url) upsertData.instagram_url = profile.instagram_url;
    if (profile.youtube_url) upsertData.youtube_url = profile.youtube_url;
    if (profile.amazon_author_profile_url) upsertData.amazon_author_profile_url = profile.amazon_author_profile_url;
    if (profile.location_city) upsertData.location_city = profile.location_city;
    if (profile.location_country) upsertData.location_country = profile.location_country;
    if (profile.credentials) upsertData.credentials = profile.credentials;
    if (profile.is_speaker != null) upsertData.is_speaker = profile.is_speaker;
    if (profile.speaker_fee_range) upsertData.speaker_fee_range = profile.speaker_fee_range;
    if (profile.availability_notes) upsertData.availability_notes = profile.availability_notes;

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

    // Backfill any existing books missing author data
    const penName = profile.pen_name || null;
    const bio = profile.bio_short || profile.bio_long || null;
    const photoUrl = profile.photo_url || null;

    if (penName || bio || photoUrl) {
      await cloudAdmin
        .from("books")
        .update({
          author_name: penName,
          author_bio: bio,
          author_photo_url: photoUrl,
        })
        .eq("author_id", userId)
        .is("author_name", null);
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
