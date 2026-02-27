import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

async function resolveUserViaSharedProfile(
  platformSecret: string,
  email: string
): Promise<{ userId: string; profile: any } | null> {
  const res = await fetch(
    `${SHARED_BACKEND_URL}/functions/v1/pull-shared-profile`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform_secret: platformSecret, email }),
    }
  );
  if (!res.ok) {
    console.error("pull-shared-profile failed:", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  if (!data.primary_profile) return null;
  return { userId: data.primary_profile.user_id, profile: data.primary_profile };
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const cloudAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    let userId: string;
    let bookData: any;
    let isPlatformPush = false;
    let sharedProfile: any = null; // profile data from pull-shared-profile

    // ─── Auth path: platform_secret (cross-platform push) ───
    if (body.platform_secret) {
      isPlatformPush = true;
      const expectedSecret = Deno.env.get("CROSS_PLATFORM_SECRET");
      if (!expectedSecret || body.platform_secret !== expectedSecret) {
        return new Response(JSON.stringify({ error: "Invalid platform secret" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!body.email) {
        return new Response(JSON.stringify({ error: "Email required for cross-platform push" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Resolve user via pull-shared-profile endpoint
      const resolved = await resolveUserViaSharedProfile(body.platform_secret, body.email);
      console.log("[save-book] Cross-platform push for:", body.email, "resolved userId:", resolved?.userId ?? "NULL");

      if (resolved?.userId) {
        userId = resolved.userId;
        sharedProfile = resolved.profile;
      } else {
        console.warn("[save-book] Shared profile returned no userId for:", body.email, "— trying email fallback");

        // Fallback 1: reuse author_id from existing book with same owner_email
        const { data: existingBook } = await cloudAdmin
          .from("books")
          .select("author_id")
          .eq("owner_email", body.email)
          .limit(1)
          .maybeSingle();

        if (existingBook?.author_id) {
          userId = existingBook.author_id;
          console.log("[save-book] Reused author_id from existing book:", userId);
        } else {
          // Fallback 2: create a local identity keyed by email
          userId = crypto.randomUUID();
          console.log("[save-book] Generated new local author_id:", userId);

          const authorName = body.book?.author_name || body.author_name || body.email?.split("@")[0];
          await cloudAdmin.from("author_profiles").upsert({
            user_id: userId,
            pen_name: authorName,
            bio_short: body.book?.author_bio || body.author_bio || null,
            photo_url: body.book?.author_photo_url || body.author_photo_url || null,
            directory_status: "unlisted",
          }, { onConflict: "user_id" });
        }

        if (resolved?.profile) sharedProfile = resolved.profile;
      }

      bookData = body.book || body;
    }
    // ─── Auth path: JWT (existing flow) ───
    else {
      const authHeader = req.headers.get("authorization") ?? "";
      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        return new Response(JSON.stringify({ error: "No auth token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
      const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);
      if (sharedUser) {
        userId = sharedUser.id;
      } else {
        const { data: { user: cloudUser } } = await cloudAdmin.auth.getUser(token);
        if (!cloudUser) {
          return new Response(JSON.stringify({ error: "Invalid session" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        userId = cloudUser.id;
        const { data: profileForCloudUser } = await cloudAdmin
          .from("author_profiles")
          .select("user_id")
          .eq("user_id", cloudUser.id)
          .maybeSingle();
        if (!profileForCloudUser && cloudUser.email) {
          // No profile under Cloud ID — resolve via pull-shared-profile
          const crossSecret = Deno.env.get("CROSS_PLATFORM_SECRET");
          if (crossSecret) {
            const resolved = await resolveUserViaSharedProfile(crossSecret, cloudUser.email!);
            if (resolved) {
              const { data: sharedProfileRow } = await cloudAdmin
                .from("author_profiles")
                .select("user_id")
                .eq("user_id", resolved.userId)
                .maybeSingle();
              if (sharedProfileRow) {
                userId = resolved.userId;
                console.log("Resolved Cloud user to shared backend ID:", userId);
              }
            }
          }
        }
      }

      bookData = body;
    }

    // ─── Resolve author metadata ───
    let authorName = bookData.authorName || bookData.author_name || null;
    let authorBio = bookData.authorBio || bookData.author_bio || null;
    let authorPhotoUrl = bookData.authorPhotoUrl || bookData.author_photo_url || null;

    // Use shared profile data if available (from platform push)
    if (sharedProfile) {
      if (!authorName && sharedProfile.pen_name) authorName = sharedProfile.pen_name;
      if (!authorBio && (sharedProfile.bio_long || sharedProfile.bio_short)) authorBio = sharedProfile.bio_long || sharedProfile.bio_short;
      if (!authorPhotoUrl && sharedProfile.photo_url) authorPhotoUrl = sharedProfile.photo_url;
    }

    const { data: localProfile } = await cloudAdmin
      .from("author_profiles")
      .select("pen_name, bio_short, bio_long, photo_url")
      .eq("user_id", userId)
      .maybeSingle();

    if (localProfile) {
      if (!authorName && localProfile.pen_name) authorName = localProfile.pen_name;
      if (!authorBio && (localProfile.bio_long || localProfile.bio_short)) authorBio = localProfile.bio_long || localProfile.bio_short;
      if (!authorPhotoUrl && localProfile.photo_url) authorPhotoUrl = localProfile.photo_url;
    }

    // Fallback: shared backend user metadata (JWT path only)
    if (!authorName && !isPlatformPush) {
      const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
      try {
        const { data: { user: metaUser } } = await sharedClient.auth.getUser(
          req.headers.get("authorization")?.replace("Bearer ", "") || ""
        );
        if (metaUser) {
          const meta = metaUser.user_metadata || {};
          authorName = meta.pen_name || meta.display_name || meta.full_name || meta.name || null;
          if (!authorName && metaUser.email) authorName = metaUser.email.split("@")[0];
          if (!authorBio) authorBio = meta.bio_short || meta.bio || null;
          if (!authorPhotoUrl) authorPhotoUrl = meta.photo_url || meta.avatar_url || null;
        }
      } catch (_) { /* non-fatal */ }
    }

    // ─── Generate slug ───
    const title = bookData.title;
    if (!title) {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let slug = generateSlug(title);

    // ─── Duplicate slug handling ───
    const { data: existing } = await cloudAdmin
      .from("books")
      .select("id, author_id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      if (isPlatformPush && existing.author_id === userId) {
        return new Response(
          JSON.stringify({ id: existing.id, slug, existing: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (isPlatformPush) {
        let suffix = 2;
        while (true) {
          const candidate = `${slug}-${suffix}`;
          const { data: check } = await cloudAdmin.from("books").select("id").eq("slug", candidate).maybeSingle();
          if (!check) { slug = candidate; break; }
          suffix++;
          if (suffix > 20) { slug = `${slug}-${Date.now()}`; break; }
        }
      } else {
        return new Response(
          JSON.stringify({ error: "A book with this title already exists" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ─── Determine entry_mode and auto_publish ───
    const entryMode = bookData.entry_mode || (isPlatformPush ? "publishnow" : "manual");
    const autoPublish = bookData.auto_publish === true;

    // ─── Final safety guard ───
    if (!userId) {
      console.error("[save-book] userId is still null/undefined after all resolution attempts");
      return new Response(JSON.stringify({ error: "Could not resolve author identity" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Insert book ───
    console.log("[save-book] Inserting book:", { title, slug, userId, entryMode, isPlatformPush });
    const { data: newBook, error: insertError } = await cloudAdmin
      .from("books")
      .insert({
        author_id: userId,
        title: bookData.title,
        subtitle: bookData.subtitle || null,
        description: bookData.description || null,
        slug,
        pages: bookData.pages || null,
        rating: bookData.rating || null,
        genre: bookData.genre || null,
        badges: bookData.badges || [],
        price: bookData.price || null,
        currency: bookData.currency || "USD",
        kindle_price: bookData.kindlePrice || bookData.kindle_price || null,
        paperback_price: bookData.paperbackPrice || bookData.paperback_price || null,
        amazon_url: bookData.amazonUrl || bookData.amazon_url || "",
        author_name: authorName,
        author_bio: authorBio,
        author_photo_url: authorPhotoUrl,
        cover_image_url: bookData.coverImageUrl || bookData.cover_image_url || null,
        bestseller_proof_url: bookData.bestsellerProofUrl || bookData.bestseller_proof_url || null,
        entry_mode: entryMode,
        ai_enriched: false,
        published_at: autoPublish ? new Date().toISOString() : null,
        owner_email: isPlatformPush ? body.email : null,
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
