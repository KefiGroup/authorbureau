// Cron entry point — finds due posts and triggers social-publish.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date().toISOString();

    const { data: due } = await admin
      .from("social_media_content")
      .select("id, platform, author_id")
      .in("status", ["scheduled", "ready"])
      .lte("scheduled_date", now)
      .limit(50);

    const results: any[] = [];
    for (const post of due ?? []) {
      // Only auto-platforms
      if (!["linkedin", "facebook", "instagram"].includes(post.platform)) continue;
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/social-publish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ post_id: post.id }),
        });
        const data = await res.json();
        results.push({ id: post.id, ok: res.ok, ...data });
      } catch (e) {
        results.push({ id: post.id, ok: false, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
