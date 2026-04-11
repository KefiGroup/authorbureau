import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

// Fields that are Authors Bureau-specific and should never be overwritten by sync
const LOCAL_ONLY_BOOK_FIELDS = new Set([
  "ai_enriched", "badges", "rating", "review_count",
  "kindle_price", "paperback_price", "published_at",
]);

/** Call PublishNow's pull-shared-profile endpoint */
async function fetchFromPublishNow(email: string) {
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

  // Short bio: dedicated field from PublishNow
  const shortBio = p.short_bio || p.bio_short;
  if (shortBio) mapped.bio_short = shortBio;

  // Full bio: prefer `bio` (full/long), fall back to `full_bio`, then `bio_long`
  const fullBio = p.bio || p.full_bio || p.bio_long;
  if (fullBio) mapped.bio_long = fullBio;

  // If only one exists, don't cross-populate — keep them separate

  // Photo: prefer `profile_photo_url` (new), fall back to `profile_picture_url` (old)
  const photoUrl = p.profile_photo_url || p.profile_picture_url;
  if (photoUrl) mapped.photo_url = photoUrl;

  // Website: prefer `social_links.website` (new), fall back to `website` (old)
  const website = p.social_links?.website || p.website;
  if (website) mapped.website_url = website;

  if (p.genres && Array.isArray(p.genres)) mapped.genres = p.genres;
  if (p.credentials) {
    try {
      mapped.credentials = typeof p.credentials === "string" ? JSON.parse(p.credentials) : p.credentials;
    } catch {
      mapped.credentials = [p.credentials];
    }
  }

  // Tagline: top-level fields with fallbacks
  const tagline = p.tagline || p.headline || p.title_tagline || p.extra_data?.tagline;
  if (tagline) mapped.tagline = tagline;

  const city = p.city || p.extra_data?.location_city;
  if (city) mapped.location_city = city;

  const country = p.country || p.extra_data?.location_country;
  if (country) mapped.location_country = country;

  // LinkedIn & Amazon: top-level fields (new schema), with social_links fallbacks
  const linkedinUrl = p.linkedin_url || p.social_links?.linkedin;
  if (linkedinUrl) mapped.linkedin_url = linkedinUrl;

  const amazonUrl = p.amazon_author_url || p.social_links?.amazon;
  if (amazonUrl) mapped.amazon_author_profile_url = amazonUrl;

  // Social links from structured object
  if (p.social_links && typeof p.social_links === "object") {
    const sl = p.social_links;
    if (sl.twitter) mapped.twitter_url = sl.twitter;
    if (sl.instagram) mapped.instagram_url = sl.instagram;
    if (sl.youtube) mapped.youtube_url = sl.youtube;
  }

  // Extra data fallbacks
  if (p.extra_data && typeof p.extra_data === "object") {
    if (p.extra_data.is_speaker != null) mapped.is_speaker = p.extra_data.is_speaker;
    if (p.extra_data.speaker_fee_range) mapped.speaker_fee_range = p.extra_data.speaker_fee_range;
  }

  return mapped;
}

/** Smart merge: only update fields where remote has a value and local is empty OR remote is newer */
function smartMerge(
  local: Record<string, any> | null,
  remote: Record<string, any>,
): { merged: Record<string, any>; fieldsUpdated: string[] } {
  const fieldsUpdated: string[] = [];
  const merged: Record<string, any> = {};

  for (const [key, remoteVal] of Object.entries(remote)) {
    // Skip null/empty remote values — never erase local data
    if (remoteVal == null || remoteVal === "" || (Array.isArray(remoteVal) && remoteVal.length === 0)) {
      continue;
    }

    const localVal = local?.[key];

    // If local is empty/null, always use remote
    if (localVal == null || localVal === "" || (Array.isArray(localVal) && localVal.length === 0)) {
      merged[key] = remoteVal;
      fieldsUpdated.push(key);
      continue;
    }

    // If both have values and they differ, use remote (PublishNow is source of truth)
    if (JSON.stringify(localVal) !== JSON.stringify(remoteVal)) {
      merged[key] = remoteVal;
      fieldsUpdated.push(key);
    }
  }

  return { merged, fieldsUpdated };
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

    // Fetch existing local profile
    const { data: localProfile } = await cloudAdmin
      .from("author_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // Pull data from PublishNow
    const pulled = await fetchFromPublishNow(userEmail);
    console.log("Pulled from PublishNow:", pulled ? `${pulled.profiles?.length} profiles, ${pulled.book_projects?.length || pulled.books?.length || 0} books` : "null");

    // Use primary_profile directly (guaranteed single correct identity), fallback to profiles[0]
    const sharedProfile = pulled?.primary_profile ?? pulled?.profiles?.[0] ?? null;

    if (sharedProfile) {
      console.log("Using primary profile:", sharedProfile.pen_name || sharedProfile.profile_name);
      console.log("Raw profile keys:", Object.keys(sharedProfile).join(", "));
      console.log("Raw bio:", JSON.stringify(sharedProfile.bio?.slice(0, 80)));
      console.log("Raw social_links:", JSON.stringify(sharedProfile.social_links));
      console.log("Raw profile_photo_url:", JSON.stringify(sharedProfile.profile_photo_url));
    }

    const mapped = sharedProfile ? mapProfileToLocal(sharedProfile) : {};
    console.log("Mapped output:", JSON.stringify(mapped));

    // Fallback pen_name
    const penName = mapped.pen_name
      || localProfile?.pen_name
      || userMeta.pen_name
      || userMeta.display_name
      || userMeta.full_name
      || userMeta.name
      || userEmail.split("@")[0];

    // Smart merge: only update fields that changed
    const { merged: profileUpdates, fieldsUpdated } = smartMerge(localProfile, {
      pen_name: penName,
      ...mapped,
    });

    console.log("Fields to update:", fieldsUpdated.length > 0 ? fieldsUpdated.join(", ") : "none");

    // Upsert with only changed fields + metadata
    // Generate author_slug from pen_name
    let authorSlug = slugify(penName);

    // Handle slug conflicts: check if another user already holds this slug
    const { data: conflicting } = await cloudAdmin
      .from("author_profiles")
      .select("user_id, directory_status, pen_name, bio_short, bio_long, photo_url")
      .eq("author_slug", authorSlug)
      .neq("user_id", userId)
      .maybeSingle();

    if (conflicting) {
      // Always resolve via suffix — never auto-delete other profiles
      console.log(`Slug conflict: "${authorSlug}" held by user ${conflicting.user_id}, resolving with suffix`);
      let suffix = 2;
      const baseSlug = authorSlug;
      while (suffix <= 20) {
        const candidate = `${baseSlug}-${suffix}`;
        const { data: check } = await cloudAdmin
          .from("author_profiles")
          .select("user_id")
          .eq("author_slug", candidate)
          .neq("user_id", userId)
          .maybeSingle();
        if (!check) { authorSlug = candidate; break; }
        suffix++;
      }
      if (suffix > 20) {
        authorSlug = `${baseSlug}-${userId.slice(0, 8)}`;
      }
      console.log(`Slug conflict resolved: using ${authorSlug}`);
    }

    const upsertData: Record<string, any> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      author_slug: authorSlug,
      ...profileUpdates,
    };

    // If no local profile exists, ensure pen_name is set
    if (!localProfile) {
      upsertData.pen_name = penName;
    }

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

    // Sync books from PublishNow with smart merge
    let booksImported = 0;
    let booksUpdated = 0;
    const remoteBooks = pulled?.book_projects || pulled?.books || [];

    if (Array.isArray(remoteBooks)) {
      for (const book of remoteBooks) {
        const title = book.title || book.name;
        if (!title) continue;

        const slug = slugify(title);

        // Check if book already exists locally
        const { data: existingBook } = await cloudAdmin
          .from("books")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        const bookData: Record<string, any> = {
          author_id: userId,
          title,
          slug,
          updated_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
          entry_mode: "imported",
          author_name: penName,
          author_bio: mapped.bio_short || mapped.bio_long || null,
          author_photo_url: mapped.photo_url || null,
        };

        // Add optional fields only if they have values
        if (book.subtitle) bookData.subtitle = book.subtitle;
        if (book.description) bookData.description = book.description;
        if (book.cover_image_url || book.cover_url) bookData.cover_image_url = book.cover_image_url || book.cover_url;
        if (book.amazon_url) bookData.amazon_url = book.amazon_url;
        if (book.genre || book.category) bookData.genre = book.genre || book.category;
        if (book.pages) bookData.pages = book.pages;
        if (book.price) bookData.price = String(book.price);

        if (existingBook) {
          // Smart merge for existing books: skip local-only fields
          const updateData: Record<string, any> = {};
          for (const [key, val] of Object.entries(bookData)) {
            if (LOCAL_ONLY_BOOK_FIELDS.has(key)) continue;
            if (val == null || val === "") continue;
            if (JSON.stringify(existingBook[key]) !== JSON.stringify(val)) {
              updateData[key] = val;
            }
          }

          if (Object.keys(updateData).length > 0) {
            updateData.updated_at = new Date().toISOString();
            const { error: bookError } = await cloudAdmin
              .from("books")
              .update(updateData)
              .eq("id", existingBook.id);

            if (bookError) {
              console.error("Book update error for", title, ":", bookError.message);
            } else {
              booksUpdated++;
            }
          }
        } else {
          // New book — insert
          const { error: bookError } = await cloudAdmin
            .from("books")
            .insert(bookData);

          if (bookError) {
            console.error("Book insert error for", title, ":", bookError.message);
          } else {
            booksImported++;
          }
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

    // Permanently fix ID mismatches: reassign any books whose author_name
    // matches this author's pen_name but have a different author_id
    if (penName) {
      const { data: mismatchedBooks } = await cloudAdmin
        .from("books")
        .select("id, author_id")
        .eq("author_name", penName)
        .neq("author_id", userId);

      if (mismatchedBooks && mismatchedBooks.length > 0) {
        console.log(`Reassigning ${mismatchedBooks.length} mismatched book(s) to user ${userId}`);
        await cloudAdmin
          .from("books")
          .update({ author_id: userId })
          .eq("author_name", penName)
          .neq("author_id", userId);
      }
    }

    // Send notification email
    try {
      const isNewProfile = !localProfile;
      const templateName = isNewProfile ? 'profile-created' : 'profile-synced';
      await cloudAdmin.functions.invoke('send-transactional-email', {
        body: {
          templateName,
          recipientEmail: userEmail,
          idempotencyKey: `${templateName}-${userId}-${new Date().toISOString().slice(0, 10)}`,
          templateData: {
            authorName: penName,
            ...(templateName === 'profile-synced' ? { fieldsUpdated, booksImported, booksUpdated } : {}),
          },
        },
      });
      console.log(`${templateName} email queued for`, userEmail);
    } catch (emailErr) {
      console.error("Notification email failed (non-fatal):", emailErr);
    }

    return new Response(
      JSON.stringify({
        synced: true,
        profile: upserted,
        fieldsUpdated,
        booksImported,
        booksUpdated,
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
