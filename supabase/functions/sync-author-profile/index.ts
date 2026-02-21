import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

/** Fetch author profile from shared backend by email */
async function fetchSharedProfile(
  email: string,
  token: string | null
): Promise<any | null> {
  const headers: Record<string, string> = {
    apikey: SHARED_ANON_KEY,
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${SHARED_BACKEND_URL}/rest/v1/author_profiles?user_email=eq.${encodeURIComponent(email)}&select=*`;
  const res = await fetch(url, { headers });

  if (res.ok) {
    const data = await res.json();
    console.log(`Shared profile query (email=${email}):`, data.length, "rows");
    if (Array.isArray(data) && data.length > 0) {
      // Prefer the "primary" / "is_default" profile if multiple exist
      const primary = data.find((p: any) => p.is_default || p.author_type === "primary") || data[0];
      console.log("Found shared profile:", JSON.stringify(primary).slice(0, 500));
      return primary;
    }
  } else {
    console.log("Shared profile query failed:", res.status, (await res.text()).slice(0, 200));
  }
  return null;
}

/** Map shared backend fields → Cloud author_profiles fields */
function mapSharedToLocal(shared: any): Record<string, any> {
  const mapped: Record<string, any> = {};

  // Name
  if (shared.pen_name) mapped.pen_name = shared.pen_name;
  else if (shared.profile_name) mapped.pen_name = shared.profile_name;

  // Bio
  if (shared.bio) {
    mapped.bio_short = shared.bio.length > 300 ? shared.bio.slice(0, 300) : shared.bio;
    mapped.bio_long = shared.bio;
  }

  // Photo
  if (shared.profile_picture_url) mapped.photo_url = shared.profile_picture_url;

  // Website
  if (shared.website) mapped.website_url = shared.website;

  // Genres
  if (shared.genres && Array.isArray(shared.genres)) mapped.genres = shared.genres;

  // Credentials (shared stores as text, local as jsonb)
  if (shared.credentials) {
    try {
      mapped.credentials = typeof shared.credentials === "string"
        ? JSON.parse(shared.credentials)
        : shared.credentials;
    } catch {
      mapped.credentials = [shared.credentials];
    }
  }

  // Social links (shared stores as jsonb object)
  if (shared.social_links && typeof shared.social_links === "object") {
    const sl = shared.social_links;
    if (sl.linkedin) mapped.linkedin_url = sl.linkedin;
    if (sl.twitter) mapped.twitter_url = sl.twitter;
    if (sl.instagram) mapped.instagram_url = sl.instagram;
    if (sl.youtube) mapped.youtube_url = sl.youtube;
    if (sl.amazon) mapped.amazon_author_profile_url = sl.amazon;
  }

  // Tagline from extra_data
  if (shared.extra_data && typeof shared.extra_data === "object") {
    if (shared.extra_data.tagline) mapped.tagline = shared.extra_data.tagline;
    if (shared.extra_data.location_city) mapped.location_city = shared.extra_data.location_city;
    if (shared.extra_data.location_country) mapped.location_country = shared.extra_data.location_country;
    if (shared.extra_data.is_speaker != null) mapped.is_speaker = shared.extra_data.is_speaker;
    if (shared.extra_data.speaker_fee_range) mapped.speaker_fee_range = shared.extra_data.speaker_fee_range;
  }

  return mapped;
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
    let userEmail: string | undefined;
    let userMeta: Record<string, any> = {};

    if (sharedUser) {
      userId = sharedUser.id;
      userEmail = sharedUser.email;
      userMeta = sharedUser.user_metadata || {};
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
    }

    console.log("Syncing for user:", userId, "email:", userEmail);

    if (!userEmail) {
      return new Response(
        JSON.stringify({ synced: false, message: "No email on user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch from shared backend by email (with token for RLS, then without)
    let sharedProfile = await fetchSharedProfile(userEmail, token);
    if (!sharedProfile) {
      sharedProfile = await fetchSharedProfile(userEmail, null);
    }

    // Map shared data to local fields
    const mapped = sharedProfile ? mapSharedToLocal(sharedProfile) : {};

    // Fallback pen_name from user metadata or email
    const penName = mapped.pen_name
      || userMeta.pen_name
      || userMeta.display_name
      || userMeta.full_name
      || userMeta.name
      || userEmail.split("@")[0];

    console.log("Resolved pen_name:", penName,
      "bio:", !!mapped.bio_short,
      "photo:", !!mapped.photo_url,
      "source:", sharedProfile ? "shared_backend" : "metadata_fallback");

    // Upsert into Cloud author_profiles
    const upsertData: Record<string, any> = {
      user_id: userId,
      pen_name: penName,
      updated_at: new Date().toISOString(),
      ...mapped,
    };

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

    // Backfill books
    const { error: backfillError } = await cloudAdmin
      .from("books")
      .update({
        author_name: penName,
        author_bio: mapped.bio_short || mapped.bio_long || null,
        author_photo_url: mapped.photo_url || null,
      })
      .eq("author_id", userId);

    if (backfillError) {
      console.error("Backfill error:", backfillError);
    } else {
      console.log("Backfilled books for author:", userId);
    }

    return new Response(
      JSON.stringify({ synced: true, profile: upserted, source: sharedProfile ? "shared_backend" : "metadata" }),
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
