import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

// Helper: query shared backend author_profiles via REST
async function fetchSharedProfile(
  userId: string,
  token: string | null
): Promise<any | null> {
  // Build headers — include token only if it's a shared backend token
  const headers: Record<string, string> = {
    apikey: SHARED_ANON_KEY,
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Query by user_id
  const url = `${SHARED_BACKEND_URL}/rest/v1/author_profiles?user_id=eq.${userId}&select=*&limit=1`;
  const res = await fetch(url, { headers });

  if (res.ok) {
    const data = await res.json();
    console.log("Shared profile query (user_id=" + userId + "):", data.length, "rows");
    if (Array.isArray(data) && data.length > 0) {
      console.log("Shared profile columns:", Object.keys(data[0]));
      console.log("Shared profile data:", JSON.stringify(data[0]).slice(0, 500));
      return data[0];
    }
  } else {
    console.log("Shared profile query failed:", res.status);
  }
  return null;
}

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

    // Resolve user — try shared backend first, then Cloud
    const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
    const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);

    let userId: string;
    let sharedUserId: string | null = null;
    let userEmail: string | undefined;
    let userMeta: Record<string, any> = {};
    let isSharedToken = false;

    if (sharedUser) {
      userId = sharedUser.id;
      sharedUserId = sharedUser.id;
      userEmail = sharedUser.email;
      userMeta = sharedUser.user_metadata || {};
      isSharedToken = true;
    } else {
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

      // Try to find the corresponding shared backend user by email
      if (userEmail) {
        const { data: { users } } = await sharedClient.auth.admin.listUsers();
        // admin.listUsers won't work with anon key — skip this approach
        // Instead, we'll query the shared profile without auth (anon access)
      }
    }

    console.log("Syncing profile for user:", userId, "email:", userEmail, "isSharedToken:", isSharedToken);
    console.log("User metadata keys:", Object.keys(userMeta));

    // Fetch author profile from shared backend
    let profile: any = null;

    if (isSharedToken && sharedUserId) {
      // Use the shared token — this should work with RLS
      profile = await fetchSharedProfile(sharedUserId, token);
    }

    // If that failed or we're on Cloud token, try without auth (anon access)
    // The shared backend likely has a public SELECT policy on author_profiles
    if (!profile && sharedUserId) {
      console.log("Retrying shared profile query without auth token...");
      profile = await fetchSharedProfile(sharedUserId, null);
    }

    // If we're on Cloud token, we don't know the shared user_id
    // Try RLS-filtered query without auth to get any accessible profiles
    if (!profile && !isSharedToken) {
      console.log("Cloud token — trying anon query for all accessible profiles...");
      const res = await fetch(
        `${SHARED_BACKEND_URL}/rest/v1/author_profiles?select=*`,
        {
          headers: {
            apikey: SHARED_ANON_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      if (res.ok) {
        const allProfiles = await res.json();
        console.log("Anon query returned:", allProfiles.length, "profiles");
        // Match by pen_name or display_name from Cloud user metadata
        if (Array.isArray(allProfiles) && allProfiles.length > 0) {
          const displayName = userMeta.display_name || userMeta.full_name || userMeta.name;
          if (displayName) {
            profile = allProfiles.find(
              (p: any) => p.pen_name?.toLowerCase() === displayName.toLowerCase()
            );
            if (profile) {
              console.log("Matched profile by display_name:", displayName);
              // Also capture the shared user_id for future reference
              sharedUserId = profile.user_id;
            }
          }
        }
      } else {
        console.log("Anon profile query failed:", res.status);
      }
    }

    // Build profile data
    // Priority: shared backend profile > user metadata > email-derived name
    const penName = profile?.pen_name
      || profile?.display_name
      || userMeta.pen_name
      || userMeta.display_name
      || userMeta.full_name
      || userMeta.name
      || (userEmail ? userEmail.split("@")[0] : null);

    const bioShort = profile?.bio_short || profile?.bio || userMeta.bio_short || userMeta.bio || null;
    const bioLong = profile?.bio_long || userMeta.bio_long || null;
    const photoUrl = profile?.photo_url || profile?.avatar_url || userMeta.photo_url || userMeta.avatar_url || null;

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
      .select("id, pen_name, photo_url, bio_short, genres")
      .single();

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Backfill books by this author with latest profile data
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

    // Also backfill books under shared user ID if different
    if (sharedUserId && sharedUserId !== userId) {
      const { error: backfillError2 } = await cloudAdmin
        .from("books")
        .update({
          author_name: penName,
          author_bio: bioShort || bioLong,
          author_photo_url: photoUrl,
        })
        .eq("author_id", sharedUserId);

      if (backfillError2) {
        console.error("Backfill (shared ID) error:", backfillError2);
      } else {
        console.log("Backfilled books for shared author:", sharedUserId);
      }
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
