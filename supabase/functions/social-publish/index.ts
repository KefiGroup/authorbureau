// Publishes a single social_media_content row to the connected platform.
// Called by user (manual "Publish now") OR by social-scheduler cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { post_id } = body;
    if (!post_id) return json({ error: "post_id required" }, 400);

    // Auth: either user JWT or service role (cron)
    const authHeader = req.headers.get("Authorization") || "";
    const isServiceRole = authHeader.includes(SUPABASE_SERVICE_ROLE_KEY);
    let userId: string | null = null;
    if (!isServiceRole) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (!claims?.claims) return json({ error: "Unauthorized" }, 401);
      userId = claims.claims.sub as string;
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: post, error: postErr } = await admin
      .from("social_media_content")
      .select("*")
      .eq("id", post_id)
      .maybeSingle();
    if (postErr || !post) return json({ error: "Post not found" }, 404);

    // If user-initiated, verify ownership
    if (userId) {
      const { data: prof } = await admin
        .from("author_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!prof || prof.id !== post.author_id) return json({ error: "Forbidden" }, 403);
    }

    // Find a connection for that platform
    const { data: conn } = await admin
      .from("social_connections")
      .select("*")
      .eq("author_id", post.author_id)
      .eq("platform", post.platform)
      .eq("status", "connected")
      .maybeSingle();

    if (!conn || !conn.access_token) {
      const msg = `No connected ${post.platform} account. Connect it under Connect Settings.`;
      await admin.from("social_media_content").update({ publish_error: msg }).eq("id", post_id);
      return json({ error: msg }, 400);
    }

    let publishedUrl: string | null = null;
    let publishedId: string | null = null;

    try {
      if (post.platform === "linkedin") {
        const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${conn.access_token}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify({
            author: `urn:li:person:${conn.account_id}`,
            lifecycleState: "PUBLISHED",
            specificContent: {
              "com.linkedin.ugc.ShareContent": {
                shareCommentary: { text: post.content_text || "" },
                shareMediaCategory: "NONE",
              },
            },
            visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(`LinkedIn ${res.status}: ${JSON.stringify(data)}`);
        publishedId = data.id;
        publishedUrl = `https://www.linkedin.com/feed/update/${data.id}/`;
      } else if (post.platform === "facebook") {
        if (!conn.page_id) throw new Error("Missing Facebook Page id on connection.");
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${conn.page_id}/feed?access_token=${conn.access_token}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: post.content_text || "" }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(`Facebook ${res.status}: ${JSON.stringify(data)}`);
        publishedId = data.id;
        publishedUrl = `https://www.facebook.com/${data.id}`;
      } else if (post.platform === "instagram") {
        if (!conn.ig_business_id) throw new Error("Missing IG business id.");
        // Requires public image URL — use post.image_prompt parsed for image URL if present
        let imageUrl: string | null = null;
        try {
          const meta = JSON.parse(post.image_prompt || "{}");
          imageUrl = meta.image_url || null;
        } catch (_) {}
        if (!imageUrl) throw new Error("Instagram requires a public image URL on the post.");
        const createRes = await fetch(
          `https://graph.facebook.com/v19.0/${conn.ig_business_id}/media?access_token=${conn.access_token}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_url: imageUrl, caption: post.content_text || "" }),
          },
        );
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(`IG create ${createRes.status}: ${JSON.stringify(createData)}`);
        const publishRes = await fetch(
          `https://graph.facebook.com/v19.0/${conn.ig_business_id}/media_publish?access_token=${conn.access_token}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ creation_id: createData.id }),
          },
        );
        const publishData = await publishRes.json();
        if (!publishRes.ok) throw new Error(`IG publish ${publishRes.status}: ${JSON.stringify(publishData)}`);
        publishedId = publishData.id;
        publishedUrl = `https://www.instagram.com/p/${publishData.id}`;
      } else {
        throw new Error(`Auto-publish not supported for ${post.platform}.`);
      }

      await admin.from("social_media_content").update({
        status: "published",
        published_at: new Date().toISOString(),
        published_post_id: publishedId,
        published_post_url: publishedUrl,
        publish_error: null,
      }).eq("id", post_id);

      return json({ success: true, url: publishedUrl, id: publishedId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Publish failed";
      await admin.from("social_media_content").update({
        status: "failed",
        publish_error: msg,
      }).eq("id", post_id);
      return json({ error: msg }, 500);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
