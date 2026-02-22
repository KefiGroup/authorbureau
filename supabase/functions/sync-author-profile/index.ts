import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

/** Call PublishNow's pull-shared-profile endpoint */
async function fetchFromPublishNow(email: string): Promise<{
  profiles: any[];
  documents: any[];
  book_projects: any[];
  platforms: any[];
} | null> {
  const secret = Deno.env.get("CROSS_PLATFORM_SECRET");
  if (!secret) {
    console.error("CROSS_PLATFORM_SECRET not set");
    return null;
  }

  const res = await fetch(`${SHARED_BACKEND_URL}/functions/v1/pull-shared-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, platform_secret: secret }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`pull-shared-profile failed: ${res.status} ${body.slice(0, 500)}`);
    return null;
  }

  return await res.json();
}

/** Map a PublishNow profile to local author_profiles fields */
function mapProfileToLocal(p: any): Record<string, any> {
  const mapped: Record<string, any> = {};

  if (p.pen_name || p.profile_name) mapped.pen_name = p.pen_name || p.profile_name;
  if (p.bio) {
    mapped.bio_short = p.bio.length > 300 ? p.bio.slice(0, 300) : p.bio;
    mapped.bio_long = p.bio;
  }
  if (p.profile_picture_url) mapped.photo_url = p.profile_picture_url;
  if (p.website) mapped.website_url = p.website;
  if (p.genres && Array.isArray(p.genres)) mapped.genres = p.genres;
  if (p.credentials) {
    try {
      mapped.credentials = typeof p.credentials === "string" ? JSON.parse(p.credentials) : p.credentials;
    } catch {
      mapped.credentials = [p.credentials];
    }
  }
  if (p.social_links && typeof p.social_links === "object") {
    const sl = p.social_links;
    if (sl.linkedin) mapped.linkedin_url = sl.linkedin;
    if (sl.twitter) mapped.twitter_url = sl.twitter;
    if (sl.instagram) mapped.instagram_url = sl.instagram;
    if (sl.youtube) mapped.youtube_url = sl.youtube;
    if (sl.amazon) mapped.amazon_author_profile_url = sl.amazon;
  }
  if (p.extra_data && typeof p.extra_data === "object") {
    if (p.extra_data.tagline) mapped.tagline = p.extra_data.tagline;
    if (p.extra_data.location_city) mapped.location_city = p.extra_data.location_city;
    if (p.extra_data.location_country) mapped.location_country = p.extra_data.location_country;
    if (p.extra_data.is_speaker != null) mapped.is_speaker = p.extra_data.is_speaker;
    if (p.extra_data.speaker_fee_range) mapped.speaker_fee_range = p.extra_data.speaker_fee_range;
  }

  return mapped;
}

/** Generate a URL-safe slug from a title */
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate caller
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

    // Resolve user from shared backend or Cloud
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

    // Pull data from PublishNow
    const pulled = await fetchFromPublishNow(userEmail);
    console.log("Pulled from PublishNow:", pulled ? `${pulled.profiles?.length} profiles, ${pulled.book_projects?.length} books` : "null");

    const sharedProfile = pulled?.profiles?.[0] ?? null;
    const mapped = sharedProfile ? mapProfileToLocal(sharedProfile) : {};

    // Fallback pen_name
    const penName = mapped.pen_name
      || userMeta.pen_name
      || userMeta.display_name
      || userMeta.full_name
      || userMeta.name
      || userEmail.split("@")[0];

    console.log("Resolved pen_name:", penName, "bio:", !!mapped.bio_short, "photo:", !!mapped.photo_url);

    // Upsert author profile
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

    // Sync books from PublishNow
    let booksSynced = 0;
    if (pulled?.book_projects && Array.isArray(pulled.book_projects)) {
      for (const book of pulled.book_projects) {
        const title = book.title || book.name;
        if (!title) continue;

        const slug = slugify(title);
        const bookData: Record<string, any> = {
          author_id: userId,
          title,
          slug,
          updated_at: new Date().toISOString(),
        };

        if (book.subtitle) bookData.subtitle = book.subtitle;
        if (book.description) bookData.description = book.description;
        if (book.cover_image_url || book.cover_url) bookData.cover_image_url = book.cover_image_url || book.cover_url;
        if (book.amazon_url) bookData.amazon_url = book.amazon_url;
        if (book.genre || book.category) bookData.genre = book.genre || book.category;
        if (book.pages) bookData.pages = book.pages;
        if (book.price) bookData.price = String(book.price);
        if (book.isbn) bookData.entry_mode = "imported";
        bookData.author_name = penName;
        bookData.author_bio = mapped.bio_short || mapped.bio_long || null;
        bookData.author_photo_url = mapped.photo_url || null;

        const { error: bookError } = await cloudAdmin
          .from("books")
          .upsert(bookData, { onConflict: "slug" })
          .select("id")
          .single();

        if (bookError) {
          console.error("Book upsert error for", title, ":", bookError.message);
        } else {
          booksSynced++;
        }
      }
    }

    // Backfill existing books with updated author info
    await cloudAdmin
      .from("books")
      .update({
        author_name: penName,
        author_bio: mapped.bio_short || mapped.bio_long || null,
        author_photo_url: mapped.photo_url || null,
      })
      .eq("author_id", userId);

    return new Response(
      JSON.stringify({
        synced: true,
        profile: upserted,
        booksSynced,
        source: sharedProfile ? "publishnow" : "metadata",
      }),
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
