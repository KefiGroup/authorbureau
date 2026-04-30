import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHARED_BACKEND_URL = "https://wuftdpnekscrsghqtssd.supabase.co";
const SHARED_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZnRkcG5la3NjcnNnaHF0c3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDYzODksImV4cCI6MjA4NDQ4MjM4OX0.o2qA4tLao4UtxPGxSnavXIYKUmVZvS99pHtnL220L-s";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "No auth token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve user: try shared backend (PublishNow) first, then local Cloud auth
    let userId: string | null = null;
    let userEmail = "";

    try {
      const sharedClient = createClient(SHARED_BACKEND_URL, SHARED_ANON_KEY);
      const { data: { user: sharedUser } } = await sharedClient.auth.getUser(token);
      if (sharedUser) {
        userId = sharedUser.id;
        userEmail = sharedUser.email || "";
      }
    } catch (_e) { /* ignore and fall back */ }

    if (!userId) {
      try {
        const localClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: `Bearer ${token}` } } }
        );
        const { data: { user: localUser } } = await localClient.auth.getUser();
        if (localUser) {
          userId = localUser.id;
          userEmail = localUser.email || "";
        }
      } catch (_e) { /* ignore */ }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Lookup author_profile by user_id; fall back to email-based lookup for cross-platform ID drift
    let { data: profile } = await admin
      .from("author_profiles")
      .select("id, pen_name, author_slug")
      .eq("user_id", userId)
      .maybeSingle();

    // Cross-platform ID drift fallback: find sibling author_profiles for any
    // user in auth.users that shares this email, then match by pen_name siblings.
    if (!profile && userEmail) {
      const { data: authUsers } = await admin.auth.admin.listUsers();
      const matches = (authUsers?.users || []).filter(
        (u) => (u.email || "").toLowerCase() === userEmail.toLowerCase(),
      );
      for (const u of matches) {
        const { data: p } = await admin
          .from("author_profiles")
          .select("id, pen_name, author_slug")
          .eq("user_id", u.id)
          .maybeSingle();
        if (p) { profile = p; break; }
      }
    }

    if (!profile) {
      return new Response(JSON.stringify({ nodes: [], profile: null, marketing_assets: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: nodes, error: nodesErr } = await admin
      .from("author_nodes")
      .select("id, node_id, node_name, personalised_name, status, content_json, microsite_url, activated_at, created_at, book_id")
      .eq("author_id", profile.id)
      .order("created_at", { ascending: false });

    if (nodesErr) throw nodesErr;

    const { data: assets } = await admin
      .from("marketing_assets")
      .select("id, book_id, asset_type, content, status, created_at, updated_at")
      .eq("author_id", profile.id)
      .order("updated_at", { ascending: false });

    return new Response(JSON.stringify({
      profile: { id: profile.id, pen_name: profile.pen_name, author_slug: profile.author_slug },
      nodes: nodes || [],
      marketing_assets: assets || [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("get-author-library error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
