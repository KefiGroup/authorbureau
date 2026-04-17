import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SocialPost = {
  text: string;
  platform: string;
};

function normalizePlatform(p: string): string {
  const s = (p || "").toLowerCase().trim();
  if (s === "twitter" || s === "x") return "x";
  return s;
}

function extractPostsFromContent(content: any): SocialPost[] {
  const out: SocialPost[] = [];
  const posts = Array.isArray(content?.posts) ? content.posts : [];

  for (const p of posts) {
    // shape variant 1: { platform, text } or { platform, content }
    if (p?.platform && (p?.text || p?.content || p?.caption)) {
      out.push({
        platform: normalizePlatform(p.platform),
        text: String(p.text || p.content || p.caption),
      });
      continue;
    }
    // shape variant 2: per-platform sub-objects { linkedin: { caption }, instagram: { caption }, ... }
    for (const platform of ["linkedin", "instagram", "facebook", "twitter", "x"]) {
      const sub = p?.[platform];
      if (sub && (sub.caption || sub.text || sub.content)) {
        out.push({
          platform: normalizePlatform(platform),
          text: String(sub.caption || sub.text || sub.content),
        });
      }
    }
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { author_id, node_id = "BP-03" } = await req.json();
    if (!author_id) throw new Error("author_id required");

    const BUFFER_API_KEY = Deno.env.get("BUFFER_API_KEY");
    if (!BUFFER_API_KEY) throw new Error("Social Accounts service is not configured.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // 1. Load node content
    const { data: node, error: nodeErr } = await sb
      .from("author_nodes")
      .select("content_json")
      .eq("author_id", author_id)
      .eq("node_id", node_id)
      .maybeSingle();

    if (nodeErr) throw nodeErr;
    if (!node?.content_json) throw new Error("No social media content found to schedule.");

    const allPosts = extractPostsFromContent(node.content_json).slice(0, 20);
    if (allPosts.length === 0) throw new Error("No social posts found in your kit.");

    // 2. Load connected channels
    const { data: connections, error: connErr } = await sb
      .from("social_connections")
      .select("channel_id, platform, channel_name, status")
      .eq("author_id", author_id)
      .eq("status", "active");

    if (connErr) throw connErr;
    if (!connections || connections.length === 0) {
      throw new Error("No social accounts connected yet. Connect them first, then activate.");
    }

    // map normalized platform -> channel_id (first active match)
    const platformToChannel = new Map<string, { channel_id: string; channel_name: string }>();
    for (const c of connections) {
      const key = normalizePlatform(c.platform);
      if (!platformToChannel.has(key)) {
        platformToChannel.set(key, { channel_id: c.channel_id, channel_name: c.channel_name || "" });
      }
    }

    // 3. For each post, schedule via Buffer createPost mutation
    const mutation = `mutation CreatePost($text: String!, $channelId: String!, $dueAt: DateTime!) {
      createPost(input: {
        text: $text,
        channelId: $channelId,
        schedulingType: automatic,
        mode: customScheduled,
        dueAt: $dueAt
      }) {
        ... on PostActionSuccess {
          post { id text dueAt }
        }
        ... on MutationError { message }
      }
    }`;

    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() + 1); // tomorrow
    startDate.setUTCHours(13, 0, 0, 0); // 09:00 ET ≈ 13:00 UTC, safe default

    const results: any[] = [];
    let successCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < allPosts.length; i++) {
      const post = allPosts[i];
      const channel = platformToChannel.get(post.platform);

      // Space posts 1.5 days apart
      const dueAt = new Date(startDate.getTime() + i * 1.5 * 24 * 60 * 60 * 1000);

      if (!channel) {
        skippedCount++;
        // Save as failed (no connected channel for this platform)
        await sb.from("social_posts").insert({
          author_id,
          node_id,
          platform: post.platform,
          content: post.text,
          scheduled_at: dueAt.toISOString(),
          status: "failed",
          error_message: `No connected ${post.platform} account.`,
        });
        results.push({ ok: false, platform: post.platform, reason: "no_channel" });
        continue;
      }

      try {
        const resp = await fetch("https://api.buffer.com/graphql", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${BUFFER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: mutation,
            variables: {
              text: post.text,
              channelId: channel.channel_id,
              dueAt: dueAt.toISOString(),
            },
          }),
        });
        const json = await resp.json();

        const result = json.data?.createPost;
        const bufferPostId = result?.post?.id || null;
        const errMsg = !bufferPostId ? (result?.message || json.errors?.[0]?.message || "Unknown error") : null;

        await sb.from("social_posts").insert({
          author_id,
          node_id,
          buffer_post_id: bufferPostId,
          channel_id: channel.channel_id,
          platform: post.platform,
          content: post.text,
          scheduled_at: dueAt.toISOString(),
          status: bufferPostId ? "queued" : "failed",
          error_message: errMsg,
        });

        if (bufferPostId) {
          successCount++;
          results.push({ ok: true, platform: post.platform, id: bufferPostId });
        } else {
          results.push({ ok: false, platform: post.platform, reason: errMsg });
        }
      } catch (e) {
        console.error(`Failed to schedule post ${i}:`, e);
        await sb.from("social_posts").insert({
          author_id,
          node_id,
          channel_id: channel.channel_id,
          platform: post.platform,
          content: post.text,
          scheduled_at: dueAt.toISOString(),
          status: "failed",
          error_message: (e as Error).message,
        });
        results.push({ ok: false, platform: post.platform, reason: (e as Error).message });
      }

      // brief throttle
      if (i < allPosts.length - 1) await new Promise((r) => setTimeout(r, 250));
    }

    // 4. Mark node as live
    await sb
      .from("author_nodes")
      .update({
        status: "live",
        activated_at: new Date().toISOString(),
      })
      .eq("author_id", author_id)
      .eq("node_id", node_id);

    return new Response(
      JSON.stringify({
        success: true,
        scheduled: successCount,
        skipped: skippedCount,
        total: allPosts.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("schedule-social-posts error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
