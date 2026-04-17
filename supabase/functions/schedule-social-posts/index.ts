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
    if (p?.platform && (p?.text || p?.content || p?.caption)) {
      out.push({
        platform: normalizePlatform(p.platform),
        text: String(p.text || p.content || p.caption),
      });
      continue;
    }
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

  const errors: string[] = [];

  try {
    const { author_id, node_id = "BP-03" } = await req.json();
    console.log(`[schedule] start author_id=${author_id} node_id=${node_id}`);
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
    console.log(`[schedule] extracted ${allPosts.length} posts from content_json`);
    if (allPosts.length === 0) throw new Error("No social posts found in your kit.");

    // Idempotency: skip if posts already successfully scheduled for this node
    const { data: existingPosts } = await sb
      .from("social_posts")
      .select("id, buffer_post_id, status")
      .eq("author_id", author_id)
      .eq("node_id", node_id)
      .eq("status", "queued")
      .not("buffer_post_id", "is", null);

    const alreadyScheduled = existingPosts?.length ?? 0;
    if (alreadyScheduled >= allPosts.length) {
      console.log(`[schedule] already scheduled ${alreadyScheduled} posts — skipping re-run`);
      return new Response(
        JSON.stringify({
          success: true,
          scheduled: alreadyScheduled,
          skipped: 0,
          total: allPosts.length,
          alreadyScheduled: true,
          message: `Already scheduled ${alreadyScheduled} posts — no action taken.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Load connected channels
    const { data: connections, error: connErr } = await sb
      .from("social_connections")
      .select("channel_id, platform, channel_name, status")
      .eq("author_id", author_id)
      .eq("status", "active");

    if (connErr) throw connErr;
    console.log(
      `[schedule] found ${connections?.length ?? 0} active connections: ${JSON.stringify(
        (connections || []).map((c: any) => c.platform),
      )}`,
    );
    if (!connections || connections.length === 0) {
      throw new Error("No social accounts connected yet. Connect them first, then activate.");
    }

    const platformToChannel = new Map<string, { channel_id: string; channel_name: string }>();
    for (const c of connections) {
      const key = normalizePlatform(c.platform);
      if (!platformToChannel.has(key)) {
        platformToChannel.set(key, { channel_id: c.channel_id, channel_name: c.channel_name || "" });
      }
    }
    console.log(
      `[schedule] platformToChannel map: ${JSON.stringify(
        Array.from(platformToChannel.entries()).map(([k, v]) => ({ platform: k, channelId: v.channel_id })),
      )}`,
    );

    const mutation = `mutation CreatePost($text: String!, $channelId: ChannelId!, $dueAt: DateTime!) {
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
    startDate.setUTCDate(startDate.getUTCDate() + 1);
    startDate.setUTCHours(13, 0, 0, 0);

    const results: any[] = [];
    let successCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < allPosts.length; i++) {
      const post = allPosts[i];
      const channel = platformToChannel.get(post.platform);
      const dueAt = new Date(startDate.getTime() + i * 1.5 * 24 * 60 * 60 * 1000);

      console.log(
        `[schedule] post ${i} platform=${post.platform} channelId=${channel?.channel_id ?? "NONE"} dueAt=${dueAt.toISOString()}`,
      );

      if (!channel) {
        skippedCount++;
        const reason = `No connected ${post.platform} account.`;
        errors.push(`post ${i} (${post.platform}): ${reason}`);
        const { error: insErr } = await sb.from("social_posts").insert({
          author_id,
          node_id,
          platform: post.platform,
          content: post.text,
          scheduled_at: dueAt.toISOString(),
          status: "failed",
          error_message: reason,
        });
        if (insErr) {
          console.error(`[schedule] social_posts insert failed (no-channel) post ${i}:`, insErr);
          errors.push(`post ${i} insert error: ${insErr.message}`);
        }
        results.push({ ok: false, platform: post.platform, reason: "no_channel" });
        continue;
      }

      try {
        // Retry up to 3 times on 429 with exponential backoff
        let resp: Response | null = null;
        let rawBody = "";
        for (let attempt = 0; attempt < 3; attempt++) {
          resp = await fetch("https://api.buffer.com/graphql", {
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
          rawBody = await resp.text();
          const is429 = resp.status === 429 || rawBody.includes("RATE_LIMIT_EXCEEDED");
          if (!is429) break;
          const wait = 2000 * Math.pow(2, attempt);
          console.warn(`[schedule] post ${i} got 429, retrying in ${wait}ms (attempt ${attempt + 1}/3)`);
          await new Promise((r) => setTimeout(r, wait));
        }
        if (!resp!.ok) {
          console.error(`[schedule] Buffer HTTP ${resp!.status} for post ${i}: ${rawBody}`);
          errors.push(`post ${i} (${post.platform}): Buffer HTTP ${resp!.status}`);
        }

        let json: any = null;
        try { json = JSON.parse(rawBody); } catch { json = null; }

        const result = json?.data?.createPost;
        const bufferPostId = result?.post?.id || null;
        const errMsg = !bufferPostId
          ? (result?.message || json?.errors?.[0]?.message || `Unknown error: ${rawBody.slice(0, 300)}`)
          : null;

        if (!bufferPostId) {
          console.error(`[schedule] Buffer no postId for post ${i}. Full response:`, rawBody);
          errors.push(`post ${i} (${post.platform}): ${errMsg}`);
        }

        const { error: insErr } = await sb.from("social_posts").insert({
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
        if (insErr) {
          console.error(`[schedule] social_posts insert failed post ${i}:`, insErr);
          errors.push(`post ${i} insert error: ${insErr.message}`);
        }

        if (bufferPostId) {
          successCount++;
          results.push({ ok: true, platform: post.platform, id: bufferPostId });
        } else {
          results.push({ ok: false, platform: post.platform, reason: errMsg });
        }
      } catch (e) {
        console.error(`[schedule] Failed to schedule post ${i}:`, e);
        errors.push(`post ${i} (${post.platform}): ${(e as Error).message}`);
        const { error: insErr } = await sb.from("social_posts").insert({
          author_id,
          node_id,
          channel_id: channel.channel_id,
          platform: post.platform,
          content: post.text,
          scheduled_at: dueAt.toISOString(),
          status: "failed",
          error_message: (e as Error).message,
        });
        if (insErr) {
          console.error(`[schedule] social_posts insert failed (catch) post ${i}:`, insErr);
          errors.push(`post ${i} insert error: ${insErr.message}`);
        }
        results.push({ ok: false, platform: post.platform, reason: (e as Error).message });
      }

      // Throttle to ~1 req/sec to stay under Buffer rate limits
      if (i < allPosts.length - 1) await new Promise((r) => setTimeout(r, 1100));
    }

    await sb
      .from("author_nodes")
      .update({
        status: "live",
        activated_at: new Date().toISOString(),
      })
      .eq("author_id", author_id)
      .eq("node_id", node_id);

    console.log(
      `[schedule] complete: scheduled=${successCount} skipped=${skippedCount} total=${allPosts.length} errorCount=${errors.length}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        scheduled: successCount,
        skipped: skippedCount,
        total: allPosts.length,
        results,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[schedule] fatal error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
