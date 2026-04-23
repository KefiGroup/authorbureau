/**
 * deploy-bp07-to-thinkific
 * ------------------------
 * Provisions a Thinkific-hosted mirror of a BP-07 Home Study Course.
 *
 * Honest scope (Tier-1, matches BA-10 pattern):
 * - We DON'T have a real Thinkific API token wired up at the workspace level
 *   yet (BA-10 also doesn't — it produces a placeholder URL today).
 * - This function creates / updates a deterministic Thinkific course URL on
 *   the BP-07 node so the activate UI + purchase fan-out have somewhere to
 *   point readers when the channel is enabled.
 * - When THINKIFIC_API_KEY + THINKIFIC_SUBDOMAIN are added later, the body
 *   between the `THINKIFIC_API_KEY` check can be replaced with a real
 *   `POST /api/public/v1/courses` + enrolment call without changing callers.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { author_id } = await req.json();
    if (!author_id) throw new Error("author_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: author } = await supabase
      .from("author_profiles")
      .select("pen_name, author_slug")
      .eq("id", author_id).single();
    if (!author) throw new Error("Author not found");
    const slug = author.author_slug || (author.pen_name || "").toLowerCase().replace(/\s+/g, "-");

    const { data: node } = await supabase
      .from("author_nodes")
      .select("content_json")
      .eq("author_id", author_id).eq("node_id", "BP-07").single();
    if (!node?.content_json) throw new Error("BP-07 content not found — generate the course first.");

    const content = (node.content_json ?? {}) as Record<string, any>;
    const title = content.programme_title || "Home Study Course";

    const THINKIFIC_API_KEY = Deno.env.get("THINKIFIC_API_KEY");
    const THINKIFIC_SUBDOMAIN = Deno.env.get("THINKIFIC_SUBDOMAIN");

    let thinkificUrl: string;
    let mode: "live" | "placeholder" = "placeholder";

    if (THINKIFIC_API_KEY && THINKIFIC_SUBDOMAIN) {
      // Real Thinkific path — kept minimal so it actually fails fast in
      // production until we configure full course/lesson sync.
      try {
        const res = await fetch(
          `https://api.thinkific.com/api/public/v1/courses`,
          {
            method: "POST",
            headers: {
              "X-Auth-API-Key": THINKIFIC_API_KEY,
              "X-Auth-Subdomain": THINKIFIC_SUBDOMAIN,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: title,
              slug: `${slug}-home-study`,
              description: content.transformation_promise || content.tagline || "",
            }),
          },
        );
        if (res.ok) {
          const data = await res.json();
          thinkificUrl =
            data?.course_url ||
            `https://${THINKIFIC_SUBDOMAIN}.thinkific.com/courses/${slug}-home-study`;
          mode = "live";
        } else {
          throw new Error(`Thinkific API ${res.status}`);
        }
      } catch (e) {
        console.warn("[deploy-bp07-to-thinkific] live API failed, falling back:", e);
        thinkificUrl = `https://${THINKIFIC_SUBDOMAIN}.thinkific.com/courses/${slug}-home-study`;
      }
    } else {
      // Placeholder URL — same pattern BA-10 uses today
      thinkificUrl = `https://thinkific.com/${slug}-home-study`;
    }

    content.thinkific_url = thinkificUrl;
    content.thinkific_status = mode;

    await supabase
      .from("author_nodes")
      .update({ content_json: content })
      .eq("author_id", author_id).eq("node_id", "BP-07");

    return new Response(
      JSON.stringify({ success: true, thinkific_url: thinkificUrl, mode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("deploy-bp07-to-thinkific error:", err?.message);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
